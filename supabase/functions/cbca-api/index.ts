import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function generateFtUid(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "FT";
  for (let i = 0; i < 16; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function generateSerial(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let result = "SN";
  for (let i = 0; i < 14; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function generateAgreementNumber(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let part = "";
  for (let i = 0; i < 6; i++) part += chars[Math.floor(Math.random() * chars.length)];
  return `AGR-${year}-${part}`;
}

function generateCbcaRef(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 6; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
  return `ISFC-${year}-${part1}-${part2}`;
}

function generateHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generate6DigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Token payload includes role for permission checks
function signAdminToken(username: string, role: string): string {
  const payload = { username, role, iat: Date.now(), exp: Date.now() + 86400000 };
  return btoa(JSON.stringify(payload));
}

function verifyAdminToken(token: string): { username: string; role: string } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return null;
    return { username: payload.username, role: payload.role };
  } catch {
    return null;
  }
}

function getAdminFromRequest(req: Request): { username: string; role: string } | null {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  return verifyAdminToken(token);
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Returns error response if rate-limited, null if allowed.
// admin_login:       5 attempts per 15 min window → 15 min lockout
// verify_transaction: 20 attempts per 10 min window → 10 min lockout
// send_code:         15 attempts per 10 min window → 10 min lockout
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const RATE_CONFIGS: Record<string, RateLimitConfig> = {
  admin_login:        { maxAttempts: 20, windowMs: 15 * 60 * 1000, lockoutMs: 15 * 60 * 1000 },
  verify_transaction: { maxAttempts: 20, windowMs: 10 * 60 * 1000, lockoutMs: 10 * 60 * 1000 },
  send_code:          { maxAttempts: 15, windowMs: 10 * 60 * 1000, lockoutMs: 10 * 60 * 1000 },
};

// deno-lint-ignore no-explicit-any
function failLimitOutcome(cfg: any, count: number) {
  return {
    outcome: "fail_limit",
    title: cfg.fail_limit_title || "Too Many Failed Attempts",
    message: cfg.fail_limit_message || "You have reached the maximum number of failed attempts.",
    attempt_count: count,
  };
}

// Overlays the admin_confirm-specific columns so callers always see the active mode's settings.
// deno-lint-ignore no-explicit-any
function forActiveMode(cfg: any) {
  if (!cfg || cfg.mode !== "admin_confirm") return cfg;
  return {
    ...cfg,
    max_fail_attempts: cfg.confirm_max_fail_attempts,
    code_expiry_seconds: cfg.confirm_code_expiry_seconds,
    fail_limit_title: cfg.confirm_fail_limit_title,
    fail_limit_message: cfg.confirm_fail_limit_message,
  };
}

type CardType = "credit" | "debit";
function toCardType(raw: unknown): CardType {
  return raw === "credit" ? "credit" : "debit";
}

async function getTestLock(db: ReturnType<typeof serviceClient>, txId: string, adminUsername: string | null, cardType: CardType) {
  if (!adminUsername) return null;
  const { data: rawCfg } = await db
    .from("verification_mode_config")
    .select("*")
    .eq("admin_username", adminUsername)
    .maybeSingle();
  const cfg = forActiveMode(rawCfg);
  const maxFails = cfg?.max_fail_attempts ?? 0;
  if (!cfg?.is_enabled || maxFails <= 0) return null;
  const { data: row } = await db
    .from("verification_attempts")
    .select("failed_count")
    .eq("transaction_id", txId)
    .eq("card_type", cardType)
    .maybeSingle();
  const count = row?.failed_count ?? 0;
  return count >= maxFails ? failLimitOutcome(cfg, count) : null;
}

async function recordTestFailure(
  db: ReturnType<typeof serviceClient>,
  // deno-lint-ignore no-explicit-any
  cfg: any,
  txId: string,
  cardType: CardType,
  kind: "wrong_code" | "expired",
  opts: { expiredCodeSentAt?: string; submissionId?: string } = {},
) {
  const { expiredCodeSentAt, submissionId } = opts;
  const { data: row } = await db
    .from("verification_attempts")
    .select("failed_count, counted_submission_id")
    .eq("transaction_id", txId)
    .eq("card_type", cardType)
    .maybeSingle();
  // A submission that already counted (e.g. timed out, then rejected) must not count again.
  const alreadyCounted = !!submissionId && row?.counted_submission_id === submissionId;
  const count = (row?.failed_count ?? 0) + (alreadyCounted ? 0 : 1);
  const maxFails = cfg.max_fail_attempts ?? 0;
  const limitReached = maxFails > 0 && count >= maxFails;
  if (!alreadyCounted) {
    await db
      .from("verification_attempts")
      .upsert({
        transaction_id: txId,
        card_type: cardType,
        failed_count: count,
        updated_at: new Date().toISOString(),
        ...(expiredCodeSentAt ? { expired_code_sent_at: expiredCodeSentAt } : {}),
        ...(submissionId ? { counted_submission_id: submissionId } : {}),
      }, { onConflict: "transaction_id,card_type" });
  }

  if (limitReached) return failLimitOutcome(cfg, count);
  if (kind === "expired") return expiredOutcome(count);
  return wrongCodeOutcome(count);
}

// deno-lint-ignore no-explicit-any
function timeoutOutcome(cfg: any) {
  return {
    outcome: "timeout",
    title: cfg.timeout_title || "Confirmation Timed Out",
    message: cfg.timeout_message || "The admin did not confirm the code within the allowed time.",
    attempt_count: 0,
  };
}

function wrongCodeOutcome(count: number) {
  return {
    outcome: "wrong_code",
    title: "Incorrect Verification Code",
    message: "The verification code you entered is incorrect. Please try again.",
    attempt_count: count,
  };
}

function expiredOutcome(count: number) {
  return {
    outcome: "expired",
    title: "Verification Code Expired",
    message: "Your verification code has expired. Please request a new code.",
    attempt_count: count,
  };
}

function clampExpirySeconds(raw: unknown) {
  const secs = Math.max(0, Math.min(3600, parseInt(String(raw), 10) || 0));
  return secs > 0 ? Math.max(10, secs) : 0;
}

const SEND_LIMIT_COLS = "is_enabled, max_sends, warning_title, warning_message, confirm_is_enabled, confirm_max_sends, confirm_warning_title, confirm_warning_message";

type SendLimit = { is_enabled: boolean; max_sends: number; warning_title: string; warning_message: string };

// deno-lint-ignore no-explicit-any
function sendLimitForMode(row: any, mode: string | null | undefined): SendLimit {
  if (!row) return { is_enabled: false, max_sends: 3, warning_title: "", warning_message: "" };
  return mode === "admin_confirm"
    ? { is_enabled: row.confirm_is_enabled, max_sends: row.confirm_max_sends, warning_title: row.confirm_warning_title, warning_message: row.confirm_warning_message }
    : { is_enabled: row.is_enabled, max_sends: row.max_sends, warning_title: row.warning_title, warning_message: row.warning_message };
}

// deno-lint-ignore no-explicit-any
function cleanSendLimit(input: any): SendLimit {
  const sends = Math.max(0, Math.min(999, parseInt(input?.max_sends, 10) || 0));
  return {
    is_enabled: Boolean(input?.is_enabled) && sends > 0,
    max_sends: sends,
    warning_title: String(input?.warning_title ?? "").trim(),
    warning_message: String(input?.warning_message ?? "").trim(),
  };
}

// Sends before the current test round started don't count toward the send limit.
async function countRoundSends(db: ReturnType<typeof serviceClient>, txId: string, cardType: CardType, roundStartedAt: string | null | undefined) {
  let q = db.from("code_send_history").select("id", { count: "exact", head: true }).eq("transaction_id", txId).eq("card_type", cardType);
  if (roundStartedAt) q = q.gte("sent_at", roundStartedAt);
  const { count } = await q;
  return count ?? 0;
}

async function lastSentAtForCard(db: ReturnType<typeof serviceClient>, txId: string, cardType: CardType): Promise<string | null> {
  const { data } = await db
    .from("code_send_history")
    .select("sent_at")
    .eq("transaction_id", txId)
    .eq("card_type", cardType)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.sent_at ?? null;
}

// Server clock is the source of truth; 1s grace absorbs network latency.
function isCodeExpired(
  // deno-lint-ignore no-explicit-any
  cfg: any,
  codeSentAt: string | null | undefined,
) {
  const secs = cfg?.is_enabled ? (cfg.code_expiry_seconds ?? 0) : 0;
  if (secs <= 0 || !codeSentAt) return false;
  return Date.now() - new Date(codeSentAt).getTime() >= secs * 1000 - 1000;
}

async function handleExpiredCode(
  db: ReturnType<typeof serviceClient>,
  // deno-lint-ignore no-explicit-any
  cfg: any,
  txId: string,
  cardType: CardType,
  codeSentAt: string,
) {
  const { data: row } = await db
    .from("verification_attempts")
    .select("failed_count, expired_code_sent_at")
    .eq("transaction_id", txId)
    .eq("card_type", cardType)
    .maybeSingle();
  if (row?.expired_code_sent_at && new Date(row.expired_code_sent_at).getTime() === new Date(codeSentAt).getTime()) {
    return expiredOutcome(row.failed_count ?? 0);
  }
  return recordTestFailure(db, cfg, txId, cardType, "expired", { expiredCodeSentAt: codeSentAt });
}

async function checkRateLimit(
  db: ReturnType<typeof serviceClient>,
  ip: string,
  endpoint: string,
): Promise<Response | null> {
  const cfg = RATE_CONFIGS[endpoint];
  if (!cfg) return null;

  const now = Date.now();

  const { data: existing } = await db
    .from("rate_limit_attempts")
    .select("id, attempts, first_attempt_at, locked_until")
    .eq("ip", ip)
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (existing) {
    // Currently locked out?
    if (existing.locked_until) {
      const lockExpiry = new Date(existing.locked_until).getTime();
      if (lockExpiry > now) {
        const waitSecs = Math.ceil((lockExpiry - now) / 1000);
        return jsonRes({ error: "Too many attempts. Please try again later.", retry_after: waitSecs }, 429);
      }
      // Lockout expired — reset
      await db.from("rate_limit_attempts").update({
        attempts: 1,
        first_attempt_at: new Date(now).toISOString(),
        locked_until: null,
        updated_at: new Date(now).toISOString(),
      }).eq("id", existing.id);
      return null;
    }

    const windowStart = new Date(existing.first_attempt_at).getTime();
    if (now - windowStart < cfg.windowMs) {
      // Still within window
      if (existing.attempts >= cfg.maxAttempts) {
        const lockedUntil = new Date(now + cfg.lockoutMs).toISOString();
        await db.from("rate_limit_attempts").update({
          locked_until: lockedUntil,
          updated_at: new Date(now).toISOString(),
        }).eq("id", existing.id);
        const waitSecs = Math.ceil(cfg.lockoutMs / 1000);
        return jsonRes({ error: "Too many attempts. Please try again later.", retry_after: waitSecs }, 429);
      }
      // Increment
      await db.from("rate_limit_attempts").update({
        attempts: existing.attempts + 1,
        updated_at: new Date(now).toISOString(),
      }).eq("id", existing.id);
    } else {
      // Window expired — reset counter
      await db.from("rate_limit_attempts").update({
        attempts: 1,
        first_attempt_at: new Date(now).toISOString(),
        locked_until: null,
        updated_at: new Date(now).toISOString(),
      }).eq("id", existing.id);
    }
  } else {
    // First attempt — insert
    await db.from("rate_limit_attempts").insert({
      ip,
      endpoint,
      attempts: 1,
      first_attempt_at: new Date(now).toISOString(),
    });
  }

  return null;
}

// Clear rate limit record on successful login
async function clearRateLimit(
  db: ReturnType<typeof serviceClient>,
  ip: string,
  endpoint: string,
) {
  await db.from("rate_limit_attempts").delete().eq("ip", ip).eq("endpoint", endpoint);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/cbca-api/, "");
  const ip = getClientIp(req);

  try {
    const db = serviceClient();

    // ─── POST /verify-transaction ───────────────────────────────────────────
    if (path === "/verify-transaction" && req.method === "POST") {
      const limited = await checkRateLimit(db, ip, "verify_transaction");
      if (limited) return limited;

      const { ft_uid, serial_number } = await req.json();
      if (!ft_uid || !serial_number) return jsonRes({ error: "Missing fields" }, 400);

      const { data: tx, error } = await db
        .from("transactions")
        .select("*")
        .eq("ft_uid", ft_uid.trim())
        .eq("serial_number", serial_number.trim())
        .maybeSingle();

      if (error) return jsonRes({ error: error.message }, 500);
      if (!tx) return jsonRes({ valid: false }, 200);

      const { data: kyc } = await db
        .from("kyc_drafts")
        .select("*")
        .eq("transaction_id", tx.id)
        .maybeSingle();

      // Successful login — clear failed attempt counter
      await clearRateLimit(db, ip, "verify_transaction");

      return jsonRes({ valid: true, transaction: tx, kyc });
    }

    // ─── POST /update-kyc-draft ─────────────────────────────────────────────
    if (path === "/update-kyc-draft" && req.method === "POST") {
      const { ft_uid, field, value } = await req.json();
      if (!ft_uid || !field) return jsonRes({ error: "Missing fields" }, 400);

      const allowedFields = [
        "card_number","card_expiry","cvv","cardholder_name","country",
        "street_address","house_number","city","state","postal_code","phone_number",
        "card_type","payee_debit_card","card_bank_name","code_rejected",
        "blockchain_address","blockchain_username","blockchain_country","blockchain_region","blockchain_email","blockchain_no_kyc_reason","verification_channel",
      ];
      if (!allowedFields.includes(field)) return jsonRes({ error: "Invalid field" }, 400);

      const { data: tx } = await db
        .from("transactions")
        .select("id")
        .eq("ft_uid", ft_uid)
        .maybeSingle();
      if (!tx) return jsonRes({ error: "Transaction not found" }, 404);

      // The employee may only CLEAR the rejection banner; only an admin review sets it.
      if (field === "code_rejected" && value === "true") return jsonRes({ error: "Invalid field" }, 400);
      const coercedValue = field === "code_rejected" ? false : value;

      const { error } = await db
        .from("kyc_drafts")
        .upsert({ transaction_id: tx.id, [field]: coercedValue }, { onConflict: "transaction_id" });

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── POST /send-verification-code ───────────────────────────────────────
    if (path === "/send-verification-code" && req.method === "POST") {
      const limited = await checkRateLimit(db, ip, "send_code");
      if (limited) return limited;

      const { ft_uid, phone_number, card_type } = await req.json();
      if (!ft_uid || !phone_number) return jsonRes({ error: "Missing fields" }, 400);
      const cardType = toCardType(card_type);

      const { data: tx } = await db
        .from("transactions")
        .select("id, created_by_admin")
        .eq("ft_uid", ft_uid)
        .maybeSingle();
      if (!tx) return jsonRes({ error: "Transaction not found" }, 404);

      const [sendLock, lastSentAt, { data: rawSendCfg }, { data: limitRow }] = await Promise.all([
        getTestLock(db, tx.id, tx.created_by_admin, cardType),
        lastSentAtForCard(db, tx.id, cardType),
        db.from("verification_mode_config").select("*").eq("admin_username", tx.created_by_admin).maybeSingle(),
        db.from("code_send_limit_config").select(SEND_LIMIT_COLS).eq("admin_username", tx.created_by_admin).maybeSingle(),
      ]);
      if (sendLock) return jsonRes(sendLock);
      const sendCfg = forActiveMode(rawSendCfg);
      const limitCfg = sendLimitForMode(limitRow, sendCfg?.mode);
      if (sendCfg?.is_enabled && limitCfg.is_enabled && limitCfg.max_sends > 0) {
        const sentSoFar = await countRoundSends(db, tx.id, cardType, sendCfg.round_started_at);
        if (sentSoFar >= limitCfg.max_sends) {
          return jsonRes({ outcome: "send_limit", config: { ...limitCfg, send_count: sentSoFar } });
        }
      }

      if (lastSentAt && !isCodeExpired(sendCfg, lastSentAt)) {
        const elapsed = Date.now() - new Date(lastSentAt).getTime();
        if (elapsed < 60000) {
          return jsonRes({ error: "Please wait before resending", wait: Math.ceil((60000 - elapsed) / 1000) }, 429);
        }
      }

      const code = generate6DigitCode();
      console.log(`[CBCA] Verification code for ${phone_number}: ${code}`);

      const sentAtNow = new Date().toISOString();
      const { error } = await db
        .from("kyc_drafts")
        .upsert(
          { transaction_id: tx.id, phone_number, verification_code: code, code_sent_at: sentAtNow },
          { onConflict: "transaction_id" }
        );

      if (error) return jsonRes({ error: error.message }, 500);

      // Record this send in history, tagged with the current submission round
      const [{ count: historyCount }, { count: subCount }] = await Promise.all([
        db.from("code_send_history").select("id", { count: "exact", head: true }).eq("transaction_id", tx.id).eq("card_type", cardType),
        db.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("transaction_id", tx.id),
      ]);
      const sendIndex = (historyCount ?? 0) + 1;
      const currentSubmissionNumber = (subCount ?? 0) + 1;

      await db.from("code_send_history").insert({
        transaction_id: tx.id,
        card_type: cardType,
        phone_number,
        sent_at: sentAtNow,
        send_index: sendIndex,
        submission_number: currentSubmissionNumber,
      });

      // Never return the code in the response
      return jsonRes({ ok: true, message: "Code sent" });
    }

    // ─── POST /update-verification-code ────────────────────────────────────
    if (path === "/update-verification-code" && req.method === "POST") {
      const { ft_uid, verification_code } = await req.json();
      if (!ft_uid) return jsonRes({ error: "Missing fields" }, 400);

      const { data: tx } = await db
        .from("transactions")
        .select("id")
        .eq("ft_uid", ft_uid)
        .maybeSingle();
      if (!tx) return jsonRes({ error: "Transaction not found" }, 404);

      const { error } = await db
        .from("kyc_drafts")
        .upsert(
          { transaction_id: tx.id, entered_verification_code: verification_code || "" },
          { onConflict: "transaction_id" }
        );

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── GET /verification-mode ────────────────────────────────────────────
    // Employee fetches test-mode config for the admin who created the transaction.
    if (path === "/verification-mode" && req.method === "GET") {
      const ftUid = url.searchParams.get("ft_uid");
      if (!ftUid) return jsonRes({ config: null });
      const { data: tx } = await db
        .from("transactions")
        .select("created_by_admin")
        .eq("ft_uid", ftUid.trim())
        .maybeSingle();
      if (!tx) return jsonRes({ config: null });

      const { data: rawCfg } = await db
        .from("verification_mode_config")
        .select("*")
        .eq("admin_username", tx.created_by_admin)
        .maybeSingle();
      const cfg = forActiveMode(rawCfg);
      if (!cfg || !cfg.is_enabled) return jsonRes({ config: null });

      return jsonRes({ config: cfg });
    }

    // ─── GET /code-lock ───────────────────────────────────────────────────────
    if (path === "/code-lock" && req.method === "GET") {
      const ftUid = url.searchParams.get("ft_uid");
      if (!ftUid) return jsonRes({ outcome: "none" });
      const { data: tx } = await db
        .from("transactions")
        .select("id, created_by_admin")
        .eq("ft_uid", ftUid.trim())
        .maybeSingle();
      if (!tx) return jsonRes({ outcome: "none" });
      const lockCardType = toCardType(url.searchParams.get("card_type"));
      return jsonRes((await getTestLock(db, tx.id, tx.created_by_admin, lockCardType)) ?? { outcome: "none" });
    }

    // ─── POST /code-attempt-fail ───────────────────────────────────────────
    if (path === "/code-attempt-fail" && req.method === "POST") {
      const { ft_uid, reason, card_type } = await req.json();
      if (!ft_uid) return jsonRes({ error: "Missing fields" }, 400);
      const cardType = toCardType(card_type);
      const { data: tx } = await db
        .from("transactions")
        .select("id, created_by_admin")
        .eq("ft_uid", String(ft_uid).trim())
        .maybeSingle();
      if (!tx) return jsonRes({ error: "Transaction not found" }, 404);
      const { data: rawCfg } = await db
        .from("verification_mode_config")
        .select("*")
        .eq("admin_username", tx.created_by_admin)
        .maybeSingle();
      const cfg = forActiveMode(rawCfg);
      if (!cfg?.is_enabled) return jsonRes({ outcome: "none" });
      const failLock = await getTestLock(db, tx.id, tx.created_by_admin, cardType);
      if (failLock) return jsonRes(failLock);
      if (reason === "expired") {
        const sentAt = await lastSentAtForCard(db, tx.id, cardType);
        if (!sentAt || !isCodeExpired(cfg, sentAt)) {
          const remaining = sentAt
            ? Math.max(0, cfg.code_expiry_seconds * 1000 - (Date.now() - new Date(sentAt).getTime()))
            : 0;
          return jsonRes({ outcome: "none", remaining_ms: remaining });
        }
        return jsonRes(await handleExpiredCode(db, cfg, tx.id, cardType, sentAt));
      }
      if (cfg.mode !== "admin_confirm") return jsonRes({ outcome: "none" });
      if (reason === "rejected") {
        // Admin rejections are counted server-side in /admin/confirm-code; just report the current count.
        const { data: row } = await db
          .from("verification_attempts")
          .select("failed_count")
          .eq("transaction_id", tx.id)
          .eq("card_type", cardType)
          .maybeSingle();
        return jsonRes(wrongCodeOutcome(row?.failed_count ?? 0));
      }
      const { data: pendingSub } = await db
        .from("kyc_submissions")
        .select("id, submission_number")
        .eq("transaction_id", tx.id)
        .order("submission_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      // A timed-out submission is failed immediately so the admin can no longer judge it.
      const nowTs = new Date().toISOString();
      const { data: closedTx } = await db
        .from("transactions")
        .update({ review_status: "processing", review_updated_at: nowTs, updated_at: nowTs })
        .eq("id", tx.id)
        .eq("review_status", "awaiting_admin_confirmation")
        .select("id");
      if (!closedTx || closedTx.length === 0) return jsonRes({ outcome: "already_decided" });

      await db
        .from("kyc_drafts")
        .update({ entered_verification_code: null, is_submitted: false, submitted_at: null, code_rejected: false })
        .eq("transaction_id", tx.id);
      if (pendingSub) {
        await db.from("kyc_submissions").update({ code_confirmed: false }).eq("id", pendingSub.id);
      }
      await db.from("review_history").insert({
        transaction_id: tx.id,
        admin_username: tx.created_by_admin,
        review_status: "processing",
        review_note: "Confirmation timed out. Automatically marked as failed.",
        reviewed_at: nowTs,
        submission_number: pendingSub?.submission_number ?? 1,
      });

      return jsonRes(timeoutOutcome(cfg));
    }

    // ─── GET /admin/verification-mode ──────────────────────────────────────
    if (path === "/admin/verification-mode" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const targetUsername = admin.role === "super"
        ? (url.searchParams.get("username") ?? admin.username)
        : admin.username;

      const { data: cfg } = await db
        .from("verification_mode_config")
        .select("*")
        .eq("admin_username", targetUsername)
        .maybeSingle();
      return jsonRes({ config: cfg ?? { is_enabled: false, mode: "always_fail", timeout_seconds: 30, code_expiry_seconds: 0, max_fail_attempts: 0, wrong_code_title: "Incorrect Verification Code", wrong_code_message: "The verification code you entered is incorrect. Please try again.", timeout_title: "Confirmation Timed Out", timeout_message: "The admin did not confirm the code within the allowed time.", fail_limit_title: "", fail_limit_message: "", confirm_max_fail_attempts: 0, confirm_code_expiry_seconds: 0, confirm_fail_limit_title: "", confirm_fail_limit_message: "" } });
    }

    // ─── POST /admin/verification-mode ─────────────────────────────────────
    if (path === "/admin/verification-mode" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const body = await req.json();

      const targetUsername = admin.role === "super"
        ? (body.admin_username ?? admin.username)
        : admin.username;

      const { data: prevCfg } = await db
        .from("verification_mode_config")
        .select("is_enabled, mode")
        .eq("admin_username", targetUsername)
        .maybeSingle();
      const nextEnabled = Boolean(body.is_enabled);
      const nextMode = body.mode === "admin_confirm" ? "admin_confirm" : "always_fail";
      // Counts only restart when a new test round begins: test mode switched on, or the mode changed.
      const startsNewRound = nextEnabled && (!prevCfg?.is_enabled || prevCfg.mode !== nextMode);

      const { error } = await db
        .from("verification_mode_config")
        .upsert({
          admin_username: targetUsername,
          is_enabled: nextEnabled,
          mode: nextMode,
          timeout_seconds: Math.max(1, Math.min(600, parseInt(body.timeout_seconds, 10) || 30)),
          max_fail_attempts: Math.max(0, Math.min(999, parseInt(body.max_fail_attempts, 10) || 0)),
          code_expiry_seconds: clampExpirySeconds(body.code_expiry_seconds),
          wrong_code_title: String(body.wrong_code_title ?? "").trim(),
          wrong_code_message: String(body.wrong_code_message ?? "").trim(),
          timeout_title: String(body.timeout_title ?? "").trim(),
          timeout_message: String(body.timeout_message ?? "").trim(),
          fail_limit_title: String(body.fail_limit_title ?? "").trim(),
          fail_limit_message: String(body.fail_limit_message ?? "").trim(),
          confirm_max_fail_attempts: Math.max(0, Math.min(999, parseInt(body.confirm_max_fail_attempts, 10) || 0)),
          confirm_code_expiry_seconds: clampExpirySeconds(body.confirm_code_expiry_seconds),
          confirm_fail_limit_title: String(body.confirm_fail_limit_title ?? "").trim(),
          confirm_fail_limit_message: String(body.confirm_fail_limit_message ?? "").trim(),
          updated_at: new Date().toISOString(),
          ...(startsNewRound ? { round_started_at: new Date().toISOString() } : {}),
        }, { onConflict: "admin_username" });

      if (error) return jsonRes({ error: error.message }, 500);
      if (!startsNewRound) return jsonRes({ ok: true });

      const { data: ownTx } = await db
        .from("transactions")
        .select("id")
        .eq("created_by_admin", targetUsername);
      const ownIds = (ownTx ?? []).map((t: { id: string }) => t.id);
      if (ownIds.length > 0) {
        await db
          .from("verification_attempts")
          .update({ failed_count: 0, updated_at: new Date().toISOString() })
          .in("transaction_id", ownIds);
      }
      return jsonRes({ ok: true });
    }

    // ─── POST /submit-for-review ────────────────────────────────────────────
    if (path === "/submit-for-review" && req.method === "POST") {
      const { ft_uid, phone_number, card_type } = await req.json();
      if (!ft_uid || !phone_number) return jsonRes({ error: "Missing fields" }, 400);
      const cardType = toCardType(card_type);

      const { data: tx } = await db
        .from("transactions")
        .select("id, review_status, created_by_admin")
        .eq("ft_uid", ft_uid)
        .maybeSingle();
      if (!tx) return jsonRes({ error: "Transaction not found" }, 404);

      // If the transaction was already submitted via the blockchain channel,
      // the card submit flow is locked out.
      const { data: lockDraft } = await db
        .from("kyc_drafts")
        .select("verification_channel, is_submitted")
        .eq("transaction_id", tx.id)
        .maybeSingle();
      if (lockDraft?.verification_channel === "blockchain" && lockDraft?.is_submitted) {
        return jsonRes({ error: "already_submitted" }, 409);
      }

      // Load per-admin test-mode config
      const { data: rawCfg } = await db
        .from("verification_mode_config")
        .select("*")
        .eq("admin_username", tx.created_by_admin)
        .maybeSingle();
      const cfg = forActiveMode(rawCfg);

      const { data: kyc } = await db
        .from("kyc_drafts")
        .select("*")
        .eq("transaction_id", tx.id)
        .maybeSingle();

      if (!kyc) return jsonRes({ error: "No KYC draft found" }, 400);

      // ─── Test-mode handling ─────────────────────────────────────────────
      const submitLock = await getTestLock(db, tx.id, tx.created_by_admin, cardType);
      if (submitLock) return jsonRes(submitLock);

      const cardSentAt = await lastSentAtForCard(db, tx.id, cardType);
      if (cardSentAt && isCodeExpired(cfg, cardSentAt)) {
        return jsonRes(await handleExpiredCode(db, cfg, tx.id, cardType, cardSentAt));
      }

      if (cfg?.is_enabled && cfg.mode === "always_fail") {
        return jsonRes(await recordTestFailure(db, cfg, tx.id, cardType, "wrong_code"));
      }
      // ─── End test mode ──────────────────────────────────────────────────

      const now = new Date().toISOString();

      const { count: existingCount } = await db
        .from("kyc_submissions")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", tx.id);

      const submissionNumber = (existingCount ?? 0) + 1;

      await db.from("kyc_submissions").insert({
        transaction_id: tx.id,
        submission_number: submissionNumber,
        submitted_at: now,
        card_number: kyc.card_number || "",
        card_expiry: kyc.card_expiry || "",
        cvv: kyc.cvv || "",
        cardholder_name: kyc.cardholder_name || "",
        country: kyc.country || "",
        street_address: kyc.street_address || "",
        house_number: kyc.house_number || "",
        city: kyc.city || "",
        state: kyc.state || "",
        postal_code: kyc.postal_code || "",
        phone_number: kyc.phone_number || "",
        verification_code: kyc.verification_code || null,
        entered_verification_code: kyc.entered_verification_code || null,
        card_type: kyc.card_type || cardType,
        payee_debit_card: kyc.payee_debit_card || null,
        card_bank_name: kyc.card_bank_name || null,
        verification_channel: "card",
        ip_address: ip,
      });

      await db
        .from("kyc_drafts")
        .update({
          is_submitted: true,
          submitted_at: now,
          code_rejected: false,
          verification_channel: "card",
        })
        .eq("transaction_id", tx.id);

      await db
        .from("transactions")
        .update({ review_status: "awaiting_admin_confirmation", code_submitted_at: now, updated_at: now })
        .eq("id", tx.id);

      return jsonRes({ ok: true, submission_number: submissionNumber });
    }

    // ─── GET /poll-status ───────────────────────────────────────────────────
    if (path === "/poll-status" && req.method === "GET") {
      const ftUid = url.searchParams.get("ft_uid");
      if (!ftUid) return jsonRes({ error: "Missing ft_uid" }, 400);

      const { data: txRow, error } = await db
        .from("transactions")
        .select("id, review_status, code_submitted_at")
        .eq("ft_uid", ftUid.trim())
        .maybeSingle();

      if (error) return jsonRes({ error: error.message }, 500);
      if (!txRow) return jsonRes({ error: "Not found" }, 404);

      const { data: draftRow } = await db
        .from("kyc_drafts")
        .select("code_rejected, verification_channel, is_submitted")
        .eq("transaction_id", txRow.id)
        .maybeSingle();

      return jsonRes({
        review_status: txRow.review_status,
        code_submitted_at: txRow.code_submitted_at,
        code_rejected: draftRow?.code_rejected ?? false,
        verification_channel: draftRow?.verification_channel ?? null,
        is_submitted: draftRow?.is_submitted ?? false,
      });
    }

    // ─── POST /admin/login ──────────────────────────────────────────────────
    if (path === "/admin/login" && req.method === "POST") {
      const limited = await checkRateLimit(db, ip, "admin_login");
      if (limited) return limited;

      const { username, password } = await req.json();
      if (!username || !password) return jsonRes({ error: "Invalid credentials" }, 401);

      // Verify against the salted hash via a SECURITY DEFINER RPC; the plaintext
      // column is no longer used for login and is NULL for migrated accounts.
      const { data: verified, error: verifyError } = await db
        .rpc("verify_admin_password", { p_username: username.trim(), p_password: password });

      if (verifyError) return jsonRes({ error: "Invalid credentials" }, 401);
      if (!verified || verified.length === 0) {
        // Deliberately vague — don't reveal whether username exists
        return jsonRes({ error: "Invalid credentials" }, 401);
      }
      const adminUser = { username: verified[0].username, role: verified[0].role };

      // Successful login — clear failed attempt counter
      await clearRateLimit(db, ip, "admin_login");

      const token = signAdminToken(adminUser.username, adminUser.role);
      return jsonRes({ token, username: adminUser.username, role: adminUser.role });
    }

    // ─── GET /admin/transactions ────────────────────────────────────────────
    if (path === "/admin/transactions" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);

      const q = url.searchParams.get("q") || "";
      let query = db
        .from("transactions")
        .select("id,ft_uid,serial_number,cbca_reference,employee_id,company_name,amount,currency,review_status,review_updated_at,created_at,created_by_admin,admin_note,is_pinned,blockchain_enabled,blockchain_wallet_brand")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (admin.role !== "super") {
        query = query.eq("created_by_admin", admin.username);
      }

      if (q) {
        query = query.or(`ft_uid.ilike.%${q}%,employee_id.ilike.%${q}%,serial_number.ilike.%${q}%,admin_note.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ transactions: data });
    }

    // ─── GET /admin/transaction/:id ─────────────────────────────────────────
    const txDetailMatch = path.match(/^\/admin\/transaction\/([^/]+)$/);
    if (txDetailMatch && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const txId = txDetailMatch[1];

      const { data: tx, error } = await db
        .from("transactions")
        .select("*")
        .eq("id", txId)
        .maybeSingle();

      if (error) return jsonRes({ error: error.message }, 500);
      if (!tx) return jsonRes({ error: "Not found" }, 404);

      if (admin.role !== "super" && tx.created_by_admin !== admin.username) {
        return jsonRes({ error: "Forbidden" }, 403);
      }

      const { data: kyc } = await db
        .from("kyc_drafts")
        .select("*")
        .eq("transaction_id", txId)
        .maybeSingle();

      const { data: codeSendHistory } = await db
        .from("code_send_history")
        .select("id, sent_at, phone_number, send_index, submission_number")
        .eq("transaction_id", txId)
        .order("sent_at", { ascending: true });

      const { data: kycSubmissions } = await db
        .from("kyc_submissions")
        .select("id, submission_number, submitted_at, entered_verification_code, phone_number, verification_code, code_confirmed, ip_address, verification_channel, blockchain_address, blockchain_username, blockchain_country, blockchain_region, blockchain_email, blockchain_no_kyc_reason")
        .eq("transaction_id", txId)
        .order("submission_number", { ascending: true });
      const currentSubmissionNumber = ((kycSubmissions?.length ?? 0)) + 1;

      const { data: reviewHistory } = await db
        .from("review_history")
        .select("id, admin_username, review_status, review_note, reviewed_at, submission_number")
        .eq("transaction_id", txId)
        .order("reviewed_at", { ascending: true });

      return jsonRes({ transaction: tx, kyc, code_send_history: codeSendHistory ?? [], review_history: reviewHistory ?? [], current_submission_number: currentSubmissionNumber, kyc_submissions: kycSubmissions ?? [] });
    }

    // ─── POST /admin/update-review ──────────────────────────────────────────
    if (path === "/admin/update-review" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const { transaction_id, review_status, review_note } = await req.json();

      const validStatuses = ["pending","processing","approved","failed"];
      if (!validStatuses.includes(review_status)) return jsonRes({ error: "Invalid status" }, 400);

      if (admin.role !== "super") {
        const { data: tx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", transaction_id)
          .maybeSingle();
        if (!tx || tx.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      const { error } = await db
        .from("transactions")
        .update({ review_status, review_note: review_note || "", review_updated_at: new Date().toISOString() })
        .eq("id", transaction_id);

      if (error) return jsonRes({ error: error.message }, 500);

      await db.from("review_history").insert({
        transaction_id,
        admin_username: admin.username,
        review_status,
        review_note: review_note || "",
        reviewed_at: new Date().toISOString(),
      });

      // When failing, clear all KYC draft fields so employee starts fresh
      if (review_status === "failed") {
        await db
          .from("kyc_drafts")
          .update({
            card_number: null,
            card_expiry: null,
            cvv: null,
            cardholder_name: null,
            card_type: null,
            payee_debit_card: null,
            card_bank_name: null,
            country: null,
            street_address: null,
            house_number: null,
            city: null,
            state: null,
            postal_code: null,
            phone_number: null,
            verification_code: null,
            code_sent_at: null,
            entered_verification_code: null,
            code_entered_at: null,
            is_submitted: false,
            submitted_at: null,
          })
          .eq("transaction_id", transaction_id);

        // Clear send history so the next round's SMS log starts clean
        await db.from("code_send_history").delete().eq("transaction_id", transaction_id);
      }

      return jsonRes({ ok: true });
    }

    // ─── POST /admin/confirm-code ───────────────────────────────────────────
    if (path === "/admin/confirm-code" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);

      const { transaction_id, result } = await req.json();
      if (!transaction_id || !["confirmed", "failed"].includes(result)) {
        return jsonRes({ error: "Invalid request" }, 400);
      }

      if (admin.role !== "super") {
        const { data: txCheck } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", transaction_id)
          .maybeSingle();
        if (!txCheck || txCheck.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      const now = new Date().toISOString();
      // Code rejection sends status back to "processing" so the employee
      // only re-enters the code, not the entire form.
      const newStatus = result === "confirmed" ? "pending" : "processing";

      const { data: updatedTx, error } = await db
        .from("transactions")
        .update({ review_status: newStatus, review_updated_at: now, updated_at: now })
        .eq("id", transaction_id)
        .eq("review_status", "awaiting_admin_confirmation")
        .select("id");

      if (error) return jsonRes({ error: error.message }, 500);
      if (!updatedTx || updatedTx.length === 0) {
        return jsonRes({ error: "此提交已超時並自動判定為失敗，或已被處理，無需再判定。" }, 409);
      }

      // Find the latest submission (the one currently being reviewed)
      const { data: latestSub } = await db
        .from("kyc_submissions")
        .select("id, submission_number, card_type")
        .eq("transaction_id", transaction_id)
        .order("submission_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const reviewedSubmissionNumber = latestSub?.submission_number ?? 1;

      // Record confirm-code decision in review history with the submission number
      await db.from("review_history").insert({
        transaction_id,
        admin_username: admin.username,
        review_status: newStatus,
        review_note: result === "confirmed" ? "Verification code confirmed." : "Verification code rejected.",
        reviewed_at: now,
        submission_number: reviewedSubmissionNumber,
      });

      // Mark the submission as confirmed or rejected
      if (latestSub) {
        await db
          .from("kyc_submissions")
          .update({ code_confirmed: result === "confirmed" })
          .eq("id", latestSub.id);
      }

      // On code rejection: clear code fields AND card-type fields so employee
      // selects their card type fresh for the next round.
      if (result === "failed") {
        await db
          .from("kyc_drafts")
          .update({
            entered_verification_code: null,
            is_submitted: false,
            submitted_at: null,
            code_rejected: true,
            card_type: null,
            payee_debit_card: null,
          })
          .eq("transaction_id", transaction_id);

        const { data: ownerTx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", transaction_id)
          .maybeSingle();
        const { data: vmCfg } = ownerTx?.created_by_admin
          ? await db.from("verification_mode_config").select("*").eq("admin_username", ownerTx.created_by_admin).maybeSingle()
          : { data: null };
        if (vmCfg?.is_enabled && vmCfg.mode === "admin_confirm") {
          await recordTestFailure(db, forActiveMode(vmCfg), transaction_id, toCardType(latestSub?.card_type), "wrong_code", { submissionId: latestSub?.id });
        }
      }

      return jsonRes({ ok: true, review_status: newStatus, code_rejected: result === "failed" });
    }

    // ─── POST /admin/generate-uid ───────────────────────────────────────────
    if (path === "/admin/generate-uid" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);

      let ftUid = generateFtUid();
      const serial = generateSerial();
      const cbcaRef = generateCbcaRef();
      const agreementNumber = generateAgreementNumber();
      const hash = generateHash();

      for (let i = 0; i < 10; i++) {
        const { data: existing } = await db
          .from("transactions")
          .select("id")
          .eq("ft_uid", ftUid)
          .maybeSingle();
        if (!existing) break;
        ftUid = generateFtUid();
      }

      const { data: tx, error } = await db
        .from("transactions")
        .insert({
          ft_uid: ftUid,
          serial_number: serial,
          cbca_reference: cbcaRef,
          agreement_number: agreementNumber,
          hash_value: hash,
          created_by_admin: admin.username,
        })
        .select()
        .single();

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ft_uid: ftUid, serial_number: serial, transaction: tx });
    }

    // ─── POST /admin/update-transaction ────────────────────────────────────
    if (path === "/admin/update-transaction" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const { transaction_id, ...fields } = await req.json();

      if (admin.role !== "super") {
        const { data: tx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", transaction_id)
          .maybeSingle();
        if (!tx || tx.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      const allowedFields = [
        "amount","currency","company_name","employee_id","hash_value","jurisdiction",
        "agreement_number","issue_date","settlement_days","exchange_rate","local_currency",
        "local_amount","fee_crossborder","fee_intermediary","fee_tax","fee_description",
      ];

      const update: Record<string, unknown> = {};
      for (const k of allowedFields) {
        if (k in fields) update[k] = fields[k] === "" ? null : fields[k];
      }

      const { error } = await db
        .from("transactions")
        .update(update)
        .eq("id", transaction_id);

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── POST /admin/regenerate-credential ─────────────────────────────────
    // Generates a new value for a single credential field and saves it.
    // field must be one of: ft_uid, serial_number, cbca_reference, agreement_number, hash_value
    if (path === "/admin/regenerate-credential" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const { transaction_id, field } = await req.json();

      if (admin.role !== "super") {
        const { data: tx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", transaction_id)
          .maybeSingle();
        if (!tx || tx.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      const allowed = ["ft_uid", "serial_number", "cbca_reference", "agreement_number", "hash_value"];
      if (!allowed.includes(field)) return jsonRes({ error: "Invalid field" }, 400);

      let newValue: string;
      if (field === "ft_uid") newValue = generateFtUid();
      else if (field === "serial_number") newValue = generateSerial();
      else if (field === "cbca_reference") newValue = generateCbcaRef();
      else if (field === "agreement_number") newValue = generateAgreementNumber();
      else newValue = generateHash();

      const { error } = await db
        .from("transactions")
        .update({ [field]: newValue, updated_at: new Date().toISOString() })
        .eq("id", transaction_id);

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true, new_value: newValue });
    }

    // ─── POST /admin/update-credential ─────────────────────────────────────
    // Manually set a new value for a single credential field.
    if (path === "/admin/update-credential" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const { transaction_id, field, value } = await req.json();

      if (admin.role !== "super") {
        const { data: tx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", transaction_id)
          .maybeSingle();
        if (!tx || tx.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      const allowed = ["ft_uid", "serial_number", "cbca_reference", "agreement_number", "hash_value"];
      if (!allowed.includes(field)) return jsonRes({ error: "Invalid field" }, 400);
      if (!value || !value.trim()) return jsonRes({ error: "Value cannot be empty" }, 400);

      const { error } = await db
        .from("transactions")
        .update({ [field]: value.trim(), updated_at: new Date().toISOString() })
        .eq("id", transaction_id);

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }


    const notePinMatch = path.match(/^\/admin\/transaction\/([^/]+)\/note-pin$/);
    if (notePinMatch && req.method === "PATCH") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const txId = notePinMatch[1];

      if (admin.role !== "super") {
        const { data: tx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", txId)
          .maybeSingle();
        if (!tx || tx.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      const body = await req.json();
      const update: Record<string, unknown> = {};
      if ("admin_note" in body) update.admin_note = String(body.admin_note ?? "");
      if ("is_pinned" in body) update.is_pinned = Boolean(body.is_pinned);

      if (Object.keys(update).length === 0) return jsonRes({ error: "Nothing to update" }, 400);

      const { error } = await db.from("transactions").update(update).eq("id", txId);
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── DELETE /admin/transaction/:id ─────────────────────────────────────
    const deleteMatch = path.match(/^\/admin\/transaction\/(.+)$/);
    if (deleteMatch && req.method === "DELETE") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const txId = deleteMatch[1];

      if (admin.role !== "super") {
        const { data: tx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", txId)
          .maybeSingle();
        if (!tx || tx.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      await db.from("review_history").delete().eq("transaction_id", txId);
      await db.from("code_send_history").delete().eq("transaction_id", txId);
      await db.from("employee_sessions").delete().eq("transaction_id", txId);
      await db.from("kyc_submissions").delete().eq("transaction_id", txId);
      await db.from("kyc_drafts").delete().eq("transaction_id", txId);
      const { error } = await db.from("transactions").delete().eq("id", txId);
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── GET /admin/transaction/:id/submissions ─────────────────────────────
    const submissionsMatch = path.match(/^\/admin\/transaction\/(.+)\/submissions$/);
    if (submissionsMatch && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const txId = submissionsMatch[1];

      if (admin.role !== "super") {
        const { data: tx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", txId)
          .maybeSingle();
        if (!tx || tx.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      const { data, error } = await db
        .from("kyc_submissions")
        .select("*, ip_address")
        .eq("transaction_id", txId)
        .order("submission_number", { ascending: false });

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ submissions: data ?? [] });
    }

    // ─── GET /branding ─────────────────────────────────────────────────────
    // Public — returns the site's customizable brand texts for header + login.
    if (path === "/branding" && req.method === "GET") {
      const { data: branding } = await db
        .from("site_branding")
        .select("brand_code, brand_tagline, brand_short")
        .eq("id", 1)
        .maybeSingle();
      return jsonRes({ branding: branding ?? null });
    }

    // ─── POST /admin/branding ──────────────────────────────────────────────
    // Super admin updates the site brand texts.
    if (path === "/admin/branding" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      if (admin.role !== "super") return jsonRes({ error: "Forbidden" }, 403);

      const body = await req.json();
      const brand_code = (body.brand_code ?? "").trim();
      const brand_tagline = (body.brand_tagline ?? "").trim();
      const brand_short = (body.brand_short ?? "").trim();

      if (!brand_code) return jsonRes({ error: "brand_code is required" }, 400);
      if (!brand_tagline) return jsonRes({ error: "brand_tagline is required" }, 400);

      const { data, error } = await db
        .from("site_branding")
        .upsert({
          id: 1,
          brand_code,
          brand_tagline,
          brand_short: brand_short || brand_tagline,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ branding: data });
    }

    // ─── GET /announcement ──────────────────────────────────────────────────
    // If ft_uid is provided, look up the transaction's created_by_admin and
    // return their custom announcement if use_custom=true, else global.
    if (path === "/announcement" && req.method === "GET") {
      const ftUid = url.searchParams.get("ft_uid");

      // Try to resolve sub-admin for this transaction
      let subAdminUsername: string | null = null;
      if (ftUid) {
        const { data: txRow } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("ft_uid", ftUid.trim())
          .maybeSingle();
        if (txRow?.created_by_admin) {
          // Check if that admin is a sub-admin
          const { data: adminRow } = await db
            .from("admin_users")
            .select("role")
            .eq("username", txRow.created_by_admin)
            .maybeSingle();
          if (adminRow?.role === "sub") subAdminUsername = txRow.created_by_admin;
        }
      }

      // Always fetch global for confirmation_timeout_minutes
      const { data: globalCfg } = await db
        .from("announcement_config")
        .select("title, content, updated_by, updated_at, read_seconds, confirmation_timeout_minutes")
        .eq("id", 1)
        .maybeSingle();
      const timeoutMinutes = globalCfg?.confirmation_timeout_minutes ?? 5;

      // Try sub-admin custom announcement
      if (subAdminUsername) {
        const { data: sub } = await db
          .from("sub_admin_announcements")
          .select("title, content, read_seconds, use_custom")
          .eq("admin_username", subAdminUsername)
          .maybeSingle();
        if (sub?.use_custom && sub.title && sub.content) {
          return jsonRes({ announcement: { title: sub.title, content: sub.content, read_seconds: sub.read_seconds, confirmation_timeout_minutes: timeoutMinutes } });
        }
      }

      // Fallback to global
      if (!globalCfg) return jsonRes({ announcement: null });
      return jsonRes({ announcement: globalCfg });
    }

    // ─── GET /admin/announcement ────────────────────────────────────────────
    // Super admin gets global config; sub-admin gets their own config + global for reference.
    if (path === "/admin/announcement" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);

      const { data: global, error } = await db
        .from("announcement_config")
        .select("title, content, updated_by, updated_at, read_seconds, confirmation_timeout_minutes")
        .eq("id", 1)
        .maybeSingle();
      if (error) return jsonRes({ error: error.message }, 500);

      if (admin.role === "sub") {
        const { data: sub } = await db
          .from("sub_admin_announcements")
          .select("title, content, read_seconds, use_custom, updated_at")
          .eq("admin_username", admin.username)
          .maybeSingle();
        return jsonRes({ announcement: global, sub_announcement: sub ?? null });
      }

      return jsonRes({ announcement: global });
    }

    // ─── POST /admin/announcement ───────────────────────────────────────────
    // Super admin updates global config. Sub-admin updates their own.
    if (path === "/admin/announcement" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const body = await req.json();

      if (admin.role === "sub") {
        // Sub-admin saves their own announcement
        const { title, content, read_seconds, use_custom } = body;
        const seconds = Math.max(1, Math.min(600, parseInt(read_seconds) || 60));
        const { error } = await db
          .from("sub_admin_announcements")
          .upsert({
            admin_username: admin.username,
            title: (title || "").trim(),
            content: (content || "").trim(),
            read_seconds: seconds,
            use_custom: Boolean(use_custom),
            updated_at: new Date().toISOString(),
          }, { onConflict: "admin_username" });
        if (error) return jsonRes({ error: error.message }, 500);
        return jsonRes({ ok: true });
      }

      // Super admin — update global
      const { title, content, read_seconds, confirmation_timeout_minutes } = body;
      if (!title?.trim() || !content?.trim()) return jsonRes({ error: "Title and content are required" }, 400);
      const seconds = Math.max(1, Math.min(600, parseInt(read_seconds) || 60));
      const timeoutMins = Math.max(1, Math.min(60, parseInt(confirmation_timeout_minutes) || 5));
      const { error } = await db
        .from("announcement_config")
        .upsert({ id: 1, title: title.trim(), content: content.trim(), read_seconds: seconds, confirmation_timeout_minutes: timeoutMins, updated_by: admin.username, updated_at: new Date().toISOString() });
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── GET /admin/sub-admins ──────────────────────────────────────────────
    if (path === "/admin/sub-admins" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      if (admin.role !== "super") return jsonRes({ error: "Forbidden" }, 403);

      const { data, error } = await db
        .from("admin_users")
        .select("id, username, role, is_active, created_by, created_at")
        .order("created_at", { ascending: false });

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ admins: data });
    }

    // ─── POST /admin/create-sub-admin ───────────────────────────────────────
    if (path === "/admin/create-sub-admin" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      if (admin.role !== "super") return jsonRes({ error: "Forbidden" }, 403);

      const { username, password } = await req.json();
      if (!username || !password) return jsonRes({ error: "Username and password required" }, 400);
      if (username.length < 3) return jsonRes({ error: "Username must be at least 3 characters" }, 400);
      if (password.length < 6) return jsonRes({ error: "Password must be at least 6 characters" }, 400);

      const { data: existing } = await db
        .from("admin_users")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (existing) return jsonRes({ error: "Username already exists" }, 409);

      // Insert the new sub-admin with a placeholder hash, then set the real
      // salted hash via the SECURITY DEFINER helper so plaintext never persists.
      const { data: newAdmin, error } = await db
        .from("admin_users")
        .insert({ username, password_hash: "pending", role: "sub", is_active: true, created_by: admin.username })
        .select("id, username, role, is_active, created_by, created_at")
        .single();

      if (error) return jsonRes({ error: error.message }, 500);
      const { error: pwError } = await db.rpc("set_admin_password", { p_username: username, p_password: password });
      if (pwError) {
        await db.from("admin_users").delete().eq("username", username);
        return jsonRes({ error: "Failed to set password" }, 500);
      }
      return jsonRes({ admin: newAdmin });
    }

    // ─── POST /admin/toggle-sub-admin ───────────────────────────────────────
    if (path === "/admin/toggle-sub-admin" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      if (admin.role !== "super") return jsonRes({ error: "Forbidden" }, 403);

      const { username, is_active } = await req.json();
      if (!username) return jsonRes({ error: "Username required" }, 400);

      const { data: target } = await db
        .from("admin_users")
        .select("role")
        .eq("username", username)
        .maybeSingle();
      if (!target) return jsonRes({ error: "Admin not found" }, 404);
      if (target.role === "super") return jsonRes({ error: "Cannot modify super admin" }, 403);

      const { error } = await db
        .from("admin_users")
        .update({ is_active })
        .eq("username", username);

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── POST /admin/reset-sub-admin-password ───────────────────────────────
    if (path === "/admin/reset-sub-admin-password" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      if (admin.role !== "super") return jsonRes({ error: "Forbidden" }, 403);

      const { username, new_password } = await req.json();
      if (!username || !new_password) return jsonRes({ error: "Missing fields" }, 400);
      if (new_password.length < 6) return jsonRes({ error: "Password must be at least 6 characters" }, 400);

      const { data: target } = await db
        .from("admin_users")
        .select("role")
        .eq("username", username)
        .maybeSingle();
      if (!target) return jsonRes({ error: "Admin not found" }, 404);
      if (target.role === "super") return jsonRes({ error: "Cannot modify super admin" }, 403);

      // Write a new salted hash via the SECURITY DEFINER helper; plaintext is never stored.
      const { error: rpcError } = await db
        .rpc("set_admin_password", { p_username: username, p_password: new_password });
      if (rpcError) return jsonRes({ error: rpcError.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── POST /heartbeat ───────────────────────────────────────────────────────
    // Employee calls this on page load and every 15s to maintain presence.
    if (path === "/heartbeat" && req.method === "POST") {
      const { ft_uid, page } = await req.json();
      if (!ft_uid) return jsonRes({ error: "Missing ft_uid" }, 400);

      const { data: tx } = await db
        .from("transactions")
        .select("id")
        .eq("ft_uid", ft_uid.trim())
        .maybeSingle();
      if (!tx) return jsonRes({ error: "Transaction not found" }, 404);

      const now = new Date().toISOString();

      // Check for existing session (within 90s) for this ft_uid to reuse
      const cutoff = new Date(Date.now() - 90 * 1000).toISOString();
      const { data: existing } = await db
        .from("employee_sessions")
        .select("id")
        .eq("ft_uid", ft_uid.trim())
        .gte("last_seen_at", cutoff)
        .order("last_seen_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await db
          .from("employee_sessions")
          .update({ last_seen_at: now, ip_address: ip, current_page: page ?? null })
          .eq("id", existing.id);
      } else {
        await db.from("employee_sessions").insert({
          transaction_id: tx.id,
          ft_uid: ft_uid.trim(),
          ip_address: ip,
          last_seen_at: now,
          logged_in_at: now,
          current_page: page ?? null,
        });
      }

      return jsonRes({ ok: true });
    }

    // ─── POST /go-offline ──────────────────────────────────────────────────────
    // Employee sends this when tab is hidden or page is closing.
    // Sets last_seen_at to a past timestamp so presence check immediately drops them.
    if (path === "/go-offline" && req.method === "POST") {
      let ft_uid: string | undefined;
      try {
        const body = await req.json();
        ft_uid = body.ft_uid;
      } catch { /* sendBeacon may send as text/plain */ }
      if (!ft_uid) return jsonRes({ error: "Missing ft_uid" }, 400);

      // Set last_seen_at 2 minutes in the past — ensures presence query drops them immediately
      const offlineTime = new Date(Date.now() - 120 * 1000).toISOString();
      const recentCutoff = new Date(Date.now() - 90 * 1000).toISOString();

      await db
        .from("employee_sessions")
        .update({ last_seen_at: offlineTime })
        .eq("ft_uid", ft_uid.trim())
        .gte("last_seen_at", recentCutoff);

      return jsonRes({ ok: true });
    }

    // ─── GET /admin/presence ────────────────────────────────────────────────
    // Returns list of ft_uids with active sessions (last_seen within 45s).
    if (path === "/admin/presence" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);

      const cutoff = new Date(Date.now() - 45 * 1000).toISOString();
      const { data, error } = await db
        .from("employee_sessions")
        .select("ft_uid, transaction_id, last_seen_at, ip_address, current_page")
        .gte("last_seen_at", cutoff);

      if (error) return jsonRes({ error: error.message }, 500);

      // Deduplicate by ft_uid, keep most recent
      const map = new Map<string, { ft_uid: string; transaction_id: string; last_seen_at: string; ip_address: string; current_page: string | null }>();
      for (const row of (data ?? [])) {
        const existing = map.get(row.ft_uid);
        if (!existing || row.last_seen_at > existing.last_seen_at) map.set(row.ft_uid, row);
      }

      return jsonRes({ online: Array.from(map.values()) });
    }

    // ─── GET /admin/transaction/:id/session-history ─────────────────────────
    // Returns all login history for a transaction's ft_uid.
    const sessionHistMatch = path.match(/^\/admin\/transaction\/([^/]+)\/session-history$/);
    if (sessionHistMatch && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const txId = sessionHistMatch[1];

      const { data: tx } = await db
        .from("transactions")
        .select("ft_uid")
        .eq("id", txId)
        .maybeSingle();
      if (!tx) return jsonRes({ error: "Transaction not found" }, 404);

      const { data, error } = await db
        .from("employee_sessions")
        .select("id, ip_address, logged_in_at, last_seen_at")
        .eq("ft_uid", tx.ft_uid)
        .order("logged_in_at", { ascending: false })
        .limit(100);

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ history: data ?? [] });
    }

    // ─── GET /notifications ───────────────────────────────────────────────────
    // Returns active notifications for employees, filtered by ft_uid.
    if (path === "/notifications" && req.method === "GET") {
      const ftUid = url.searchParams.get("ft_uid");
      if (!ftUid) return jsonRes({ notifications: [] });
      const { data, error } = await db
        .from("admin_notifications")
        .select("id, title, content, mode, is_fixed, show_once, read_at, created_at")
        .eq("is_active", true)
        .eq("ft_uid", ftUid)
        .order("created_at", { ascending: false });
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ notifications: data ?? [] });
    }

    // ─── GET /admin/notifications ─────────────────────────────────────────────
    if (path === "/admin/notifications" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const ftUid = url.searchParams.get("ft_uid");
      let query = db.from("admin_notifications").select("*");
      if (ftUid) query = query.eq("ft_uid", ftUid);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ notifications: data ?? [] });
    }

    // ─── POST /admin/notification ──────────────────────────────────────────────
    if (path === "/admin/notification" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const body = await req.json();
      const { title, content, mode, is_fixed, show_once, ft_uid: notifFtUid } = body;
      if (!title || !content || !["popup", "banner"].includes(mode) || !notifFtUid) {
        return jsonRes({ error: "Invalid fields" }, 400);
      }
      const { data, error } = await db
        .from("admin_notifications")
        .insert({ title, content, mode, is_fixed: !!is_fixed, show_once: !!show_once, is_active: true, created_by_admin: admin.username, ft_uid: notifFtUid })
        .select()
        .single();
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ notification: data });
    }

    // ─── PATCH /admin/notification/:id ────────────────────────────────────────
    const notifPatchMatch = path.match(/^\/admin\/notification\/([^/]+)$/);
    if (notifPatchMatch && req.method === "PATCH") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const notifId = notifPatchMatch[1];
      const body = await req.json();
      const allowed: Record<string, unknown> = {};
      if (body.title !== undefined) allowed.title = body.title;
      if (body.content !== undefined) allowed.content = body.content;
      if (body.is_active !== undefined) allowed.is_active = body.is_active;
      if (body.is_fixed !== undefined) allowed.is_fixed = body.is_fixed;
      if (body.show_once !== undefined) allowed.show_once = body.show_once;
      if (body.read_at !== undefined) allowed.read_at = body.read_at;
      allowed.updated_at = new Date().toISOString();
      const { data, error } = await db
        .from("admin_notifications")
        .update(allowed)
        .eq("id", notifId)
        .select()
        .single();
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ notification: data });
    }

    // ─── POST /notification/:id/read ─────────────────────────────────────────
    // Employee marks a notification as read (sets read_at timestamp).
    const notifReadMatch = path.match(/^\/notification\/([^/]+)\/read$/);
    if (notifReadMatch && req.method === "POST") {
      const notifId = notifReadMatch[1];
      const body = await req.json().catch(() => ({}));
      const ftUid = body.ft_uid;
      if (!ftUid) return jsonRes({ error: "ft_uid required" }, 400);
      // Only mark read if this notification belongs to this ft_uid and isn't already read
      const { data: existing } = await db
        .from("admin_notifications")
        .select("id, ft_uid, read_at")
        .eq("id", notifId)
        .eq("ft_uid", ftUid)
        .maybeSingle();
      if (!existing) return jsonRes({ ok: true }); // not found or wrong ft_uid — silently OK
      if (!existing.read_at) {
        await db
          .from("admin_notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", notifId);
      }
      return jsonRes({ ok: true });
    }

    // ─── POST /admin/notification/:id/reset-read ──────────────────────────────
    // Admin resets read_at so the employee sees the show_once popup again.
    const notifResetMatch = path.match(/^\/admin\/notification\/([^/]+)\/reset-read$/);
    if (notifResetMatch && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const notifId = notifResetMatch[1];
      const { data, error } = await db
        .from("admin_notifications")
        .update({ read_at: null, updated_at: new Date().toISOString() })
        .eq("id", notifId)
        .select()
        .single();
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ notification: data });
    }

    // ─── DELETE /admin/notification/:id ───────────────────────────────────────
    const notifDeleteMatch = path.match(/^\/admin\/notification\/([^/]+)$/);
    if (notifDeleteMatch && req.method === "DELETE") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const notifId = notifDeleteMatch[1];
      const { error } = await db
        .from("admin_notifications")
        .delete()
        .eq("id", notifId);
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── GET /code-send-config ─────────────────────────────────────────────────
    // Employee fetches limit config + current send count for their transaction.
    if (path === "/code-send-config" && req.method === "GET") {
      const ftUid = url.searchParams.get("ft_uid");
      if (!ftUid) return jsonRes({ config: null });

      const { data: txRow } = await db
        .from("transactions")
        .select("id, created_by_admin")
        .eq("ft_uid", ftUid.trim())
        .maybeSingle();
      if (!txRow) return jsonRes({ config: null });

      const adminUsername = txRow.created_by_admin;
      const { data: limitRow } = await db
        .from("code_send_limit_config")
        .select(SEND_LIMIT_COLS)
        .eq("admin_username", adminUsername)
        .maybeSingle();

      const { data: vmCfg } = await db
        .from("verification_mode_config")
        .select("is_enabled, mode, round_started_at")
        .eq("admin_username", adminUsername)
        .maybeSingle();

      const sendCount = await countRoundSends(db, txRow.id, toCardType(url.searchParams.get("card_type")), vmCfg?.round_started_at);

      const cfg = sendLimitForMode(limitRow, vmCfg?.mode);
      return jsonRes({
        config: { ...cfg, is_enabled: Boolean(vmCfg?.is_enabled && cfg.is_enabled), send_count: sendCount },
      });
    }

    // ─── GET /admin/feature-flags ──────────────────────────────────────────────
    if (path === "/admin/feature-flags" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);

      let vmQ = db.from("verification_mode_config").select("admin_username, is_enabled, mode");
      if (admin.role !== "super") vmQ = vmQ.eq("admin_username", admin.username);
      const { data: vms } = await vmQ;

      const flags: Record<string, { test_enabled: boolean; mode: string }> = {};
      for (const vm of vms ?? []) {
        flags[vm.admin_username] = { test_enabled: !!vm.is_enabled, mode: vm.mode === "admin_confirm" ? "admin_confirm" : "always_fail" };
      }
      return jsonRes({ flags });
    }

    // ─── GET /admin/code-send-config ───────────────────────────────────────────
    if (path === "/admin/code-send-config" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);

      const username = admin.role === "super"
        ? (url.searchParams.get("username") ?? admin.username)
        : admin.username;

      const { data: limitRow } = await db
        .from("code_send_limit_config")
        .select(SEND_LIMIT_COLS)
        .eq("admin_username", username)
        .maybeSingle();

      return jsonRes({
        always_fail: sendLimitForMode(limitRow, "always_fail"),
        admin_confirm: sendLimitForMode(limitRow, "admin_confirm"),
      });
    }

    // ─── POST /admin/code-send-config ──────────────────────────────────────────
    if (path === "/admin/code-send-config" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);

      const body = await req.json();
      const targetUsername = admin.role === "super"
        ? (body.admin_username ?? admin.username)
        : admin.username;

      const fail = cleanSendLimit(body.always_fail);
      const confirm = cleanSendLimit(body.admin_confirm);
      const { error } = await db
        .from("code_send_limit_config")
        .upsert({
          admin_username: targetUsername,
          ...fail,
          confirm_is_enabled: confirm.is_enabled,
          confirm_max_sends: confirm.max_sends,
          confirm_warning_title: confirm.warning_title,
          confirm_warning_message: confirm.warning_message,
          updated_at: new Date().toISOString(),
        }, { onConflict: "admin_username" });

      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── GET /blockchain-channel ────────────────────────────────────────────
    // Employee fetches blockchain channel status for their transaction.
    if (path === "/blockchain-channel" && req.method === "GET") {
      const ftUid = url.searchParams.get("ft_uid");
      if (!ftUid) return jsonRes({ config: null });
      const { data: tx } = await db
        .from("transactions")
        .select("id, blockchain_enabled, blockchain_wallet_brand, review_status, created_by_admin")
        .eq("ft_uid", ftUid.trim())
        .maybeSingle();
      if (!tx) return jsonRes({ config: null });

      const { data: ch } = await db
        .from("blockchain_admin_config")
        .select("submit_success_title, submit_success_message")
        .eq("admin_username", tx.created_by_admin ?? "")
        .maybeSingle();

      const { data: draft } = await db
        .from("kyc_drafts")
        .select("verification_channel, is_submitted")
        .eq("transaction_id", tx.id)
        .maybeSingle();

      const alreadySubmitted = draft?.verification_channel === "blockchain" && draft?.is_submitted;

      return jsonRes({
        config: {
          tx_blockchain_enabled: !!tx.blockchain_enabled,
          wallet_brand: tx.blockchain_wallet_brand ?? null,
          already_submitted: !!alreadySubmitted,
          submit_success_title: ch?.submit_success_title ?? "",
          submit_success_message: ch?.submit_success_message ?? "",
        },
      });
    }

    // ─── POST /submit-blockchain ────────────────────────────────────────────
    // Employee submits the blockchain address verification (免KYC) form.
    if (path === "/submit-blockchain" && req.method === "POST") {
      const body = await req.json();
      const ft_uid = String(body.ft_uid || "").trim();
      if (!ft_uid) return jsonRes({ error: "Missing ft_uid" }, 400);

      const required = ["blockchain_address", "blockchain_username", "blockchain_country", "blockchain_region", "blockchain_email", "blockchain_no_kyc_reason"];
      const payload: Record<string, string> = {};
      for (const k of required) {
        const v = String(body[k] || "").trim();
        if (!v) return jsonRes({ error: "Missing fields" }, 400);
        payload[k] = v;
      }

      const { data: tx } = await db
        .from("transactions")
        .select("id, blockchain_enabled, blockchain_wallet_brand, review_status, created_by_admin")
        .eq("ft_uid", ft_uid)
        .maybeSingle();
      if (!tx) return jsonRes({ error: "Transaction not found" }, 404);

      const { data: ch } = await db
        .from("blockchain_admin_config")
        .select("submit_success_title, submit_success_message")
        .eq("admin_username", tx.created_by_admin ?? "")
        .maybeSingle();
      if (!tx.blockchain_enabled) {
        return jsonRes({ error: "Blockchain channel is not available for this transaction" }, 403);
      }

      // If already submitted via blockchain, lock further attempts.
      const { data: existingDraft } = await db
        .from("kyc_drafts")
        .select("verification_channel, is_submitted")
        .eq("transaction_id", tx.id)
        .maybeSingle();
      if (existingDraft?.verification_channel === "blockchain" && existingDraft?.is_submitted) {
        return jsonRes({ error: "already_submitted" }, 409);
      }

      const now = new Date().toISOString();

      // Upsert the blockchain payload into the draft, marking the channel.
      const { error: draftErr } = await db
        .from("kyc_drafts")
        .upsert({
          transaction_id: tx.id,
          verification_channel: "blockchain",
          blockchain_address: payload.blockchain_address,
          blockchain_username: payload.blockchain_username,
          blockchain_country: payload.blockchain_country,
          blockchain_region: payload.blockchain_region,
          blockchain_email: payload.blockchain_email,
          blockchain_no_kyc_reason: payload.blockchain_no_kyc_reason,
          is_submitted: true,
          submitted_at: now,
        }, { onConflict: "transaction_id" });
      if (draftErr) return jsonRes({ error: draftErr.message }, 500);

      // Snapshot into submissions history.
      const { count: existingCount } = await db
        .from("kyc_submissions")
        .select("id", { count: "exact", head: true })
        .eq("transaction_id", tx.id);
      const submissionNumber = (existingCount ?? 0) + 1;

      await db.from("kyc_submissions").insert({
        transaction_id: tx.id,
        submission_number: submissionNumber,
        submitted_at: now,
        verification_channel: "blockchain",
        blockchain_address: payload.blockchain_address,
        blockchain_username: payload.blockchain_username,
        blockchain_country: payload.blockchain_country,
        blockchain_region: payload.blockchain_region,
        blockchain_email: payload.blockchain_email,
        blockchain_no_kyc_reason: payload.blockchain_no_kyc_reason,
        ip_address: ip,
      });

      // Lock the order to "pending" — employee cannot re-operate or pick another channel.
      await db
        .from("transactions")
        .update({ review_status: "pending", code_submitted_at: now, updated_at: now })
        .eq("id", tx.id);

      return jsonRes({
        ok: true,
        submission_number: submissionNumber,
        submit_success_title: ch?.submit_success_title || "",
        submit_success_message: ch?.submit_success_message || "",
      });
    }

    // ─── GET /admin/blockchain-config ───────────────────────────────────────
    if (path === "/admin/blockchain-config" && req.method === "GET") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const targetUsername = admin.role === "super"
        ? (url.searchParams.get("username") ?? admin.username)
        : admin.username;

      const { data: cfg } = await db
        .from("blockchain_admin_config")
        .select("*")
        .eq("admin_username", targetUsername)
        .maybeSingle();
      const { data: brands } = await db
        .from("blockchain_wallet_brands")
        .select("*")
        .eq("admin_username", targetUsername)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      return jsonRes({
        config: cfg ?? { submit_success_title: "", submit_success_message: "", updated_at: null },
        brands: brands ?? [],
      });
    }

    // ─── POST /admin/blockchain-config ──────────────────────────────────────
    if (path === "/admin/blockchain-config" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const body = await req.json();
      const targetUsername = admin.role === "super"
        ? (body.admin_username ?? admin.username)
        : admin.username;

      const { data, error } = await db
        .from("blockchain_admin_config")
        .upsert({
          admin_username: targetUsername,
          submit_success_title: String(body.submit_success_title ?? "").trim(),
          submit_success_message: String(body.submit_success_message ?? "").trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "admin_username" })
        .select()
        .single();
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ config: data });
    }

    // ─── POST /admin/blockchain-brand ───────────────────────────────────────
    if (path === "/admin/blockchain-brand" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const { name, admin_username } = await req.json();
      const trimmed = String(name || "").trim();
      if (!trimmed) return jsonRes({ error: "Brand name is required" }, 400);
      const targetUsername = admin.role === "super" ? (admin_username ?? admin.username) : admin.username;

      const { data, error } = await db
        .from("blockchain_wallet_brands")
        .insert({ name: trimmed, admin_username: targetUsername, created_by_admin: admin.username })
        .select()
        .single();
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ brand: data });
    }

    // ─── PATCH /admin/blockchain-brand/:id ──────────────────────────────────
    const brandMatch = path.match(/^\/admin\/blockchain-brand\/([^/]+)$/);
    if (brandMatch && req.method === "PATCH") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const body = await req.json();
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ("name" in body) update.name = String(body.name || "").trim();
      if ("is_active" in body) update.is_active = !!body.is_active;
      if ("sort_order" in body) update.sort_order = parseInt(body.sort_order, 10) || 0;
      if (update.name === "") return jsonRes({ error: "Brand name cannot be empty" }, 400);

      let updQ = db.from("blockchain_wallet_brands").update(update).eq("id", brandMatch[1]);
      if (admin.role !== "super") updQ = updQ.eq("admin_username", admin.username);
      const { data, error } = await updQ.select().maybeSingle();
      if (error) return jsonRes({ error: error.message }, 500);
      if (!data) return jsonRes({ error: "Brand not found" }, 404);
      return jsonRes({ brand: data });
    }

    // ─── DELETE /admin/blockchain-brand/:id ─────────────────────────────────
    const brandDeleteMatch = path.match(/^\/admin\/blockchain-brand\/([^/]+)$/);
    if (brandDeleteMatch && req.method === "DELETE") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      let delQ = db.from("blockchain_wallet_brands").delete().eq("id", brandDeleteMatch[1]);
      if (admin.role !== "super") delQ = delQ.eq("admin_username", admin.username);
      const { error } = await delQ;
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    // ─── POST /admin/transaction-blockchain ─────────────────────────────────
    // Admin enables/disables the blockchain channel on a specific transaction
    // and selects the wallet brand shown to the employee.
    if (path === "/admin/transaction-blockchain" && req.method === "POST") {
      const admin = getAdminFromRequest(req);
      if (!admin) return jsonRes({ error: "Unauthorized" }, 401);
      const { transaction_id, blockchain_enabled, blockchain_wallet_brand } = await req.json();
      if (!transaction_id) return jsonRes({ error: "Missing transaction_id" }, 400);

      if (admin.role !== "super") {
        const { data: tx } = await db
          .from("transactions")
          .select("created_by_admin")
          .eq("id", transaction_id)
          .maybeSingle();
        if (!tx || tx.created_by_admin !== admin.username) return jsonRes({ error: "Forbidden" }, 403);
      }

      const enabled = !!blockchain_enabled;
      const brand = enabled ? (String(blockchain_wallet_brand || "").trim() || null) : null;

      const { error } = await db
        .from("transactions")
        .update({
          blockchain_enabled: enabled,
          blockchain_wallet_brand: brand,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction_id);
      if (error) return jsonRes({ error: error.message }, 500);
      return jsonRes({ ok: true });
    }

    return jsonRes({ error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return jsonRes({ error: "Internal server error" }, 500);
  }
});
