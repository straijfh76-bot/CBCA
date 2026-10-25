import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle, Clock, Shield, ChevronRight, Wallet, FileCheck2, UserCheck, Hash, Fingerprint } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { rehydrateSession } from "../lib/session";
import { getBlockchainChannel } from "../lib/api";
import { DEFAULT_BLOCKCHAIN_SUCCESS_TITLE, DEFAULT_BLOCKCHAIN_SUCCESS_MESSAGE } from "../lib/types";
import type { Transaction } from "../lib/types";

type SuccessContent = { title: string; message: string };

const STANDARD_TITLE = "Submission Successful";
const STANDARD_NEXT_STEP = "Your application has been submitted and is now awaiting verification confirmation. Please contact your department manager if further confirmation is required.";

export default function SubmittedPage() {
  const { ftUid } = useParams<{ ftUid: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [tx, setTx] = useState<Transaction | null>(location.state?.transaction || null);
  const [bcContent, setBcContent] = useState<SuccessContent | null>(location.state?.blockchainSuccess || null);

  useEffect(() => {
    if (location.state?.transaction) return;
    let cancelled = false;
    rehydrateSession().then((res) => {
      if (!cancelled && res) setTx(res.transaction);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [location.state]);

  useEffect(() => {
    if (!ftUid) return;
    let cancelled = false;
    getBlockchainChannel(ftUid)
      .then((cfg) => {
        if (cancelled || !cfg?.already_submitted) return;
        setBcContent({
          title: cfg.submit_success_title || DEFAULT_BLOCKCHAIN_SUCCESS_TITLE,
          message: cfg.submit_success_message || DEFAULT_BLOCKCHAIN_SUCCESS_MESSAGE,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ftUid]);

  const isBlockchain = !!bcContent;
  const title = bcContent?.title || STANDARD_TITLE;
  const nextStep = bcContent?.message || STANDARD_NEXT_STEP;

  const steps = isBlockchain
    ? [
        { icon: Wallet, label: "Blockchain details submitted", done: true },
        { icon: FileCheck2, label: "Cross-Border Fee pre-deposit", done: false },
        { icon: UserCheck, label: "Department manager confirmation", done: false },
      ]
    : [
        { icon: FileCheck2, label: "KYC documents submitted", done: true },
        { icon: Clock, label: "ISFC review in progress", done: false },
        { icon: UserCheck, label: "Department manager confirmation", done: false },
      ];

  return (
    <div className="min-h-screen-safe flex flex-col">
      <Header />

      <main className="flex-1 w-full">
        <section className="relative overflow-hidden px-4 pt-6 pb-24 sm:px-6 sm:pt-8 sm:pb-28 lg:px-8 lg:pt-10 lg:pb-32">

          <div className="relative mx-auto max-w-4xl px-1 sm:px-2 [&_h1]:!text-[1.45rem] sm:[&_h1]:!text-2xl lg:[&_h1]:!text-3xl [&_p]:!max-w-none [&>div:first-child]:!grid [&>div:first-child]:!w-full [&>div:first-child]:!max-w-none [&>div:first-child]:!grid-cols-1 [&>div:first-child]:!gap-4 sm:[&>div:first-child]:!grid-cols-[auto_minmax(0,1fr)] sm:[&>div:first-child]:!gap-5 [&>div:first-child]:!text-center sm:[&>div:first-child]:!text-left [&>div:first-child>div:first-child]:!mx-auto sm:[&>div:first-child>div:first-child]:!mx-0 [&>div:first-child>div:first-child]:!h-14 [&>div:first-child>div:first-child]:!w-14 sm:[&>div:first-child>div:first-child]:!h-16 sm:[&>div:first-child>div:first-child]:!w-16 [&>div:first-child>div:first-child_svg]:!h-7 [&>div:first-child>div:first-child_svg]:!w-7 sm:[&>div:first-child>div:first-child_svg]:!h-8 sm:[&>div:first-child>div:first-child_svg]:!w-8 [&_h1]:!mt-2.5 [&_h1+span]:!mt-2.5 [&_h1+span+p]:!mt-2.5">
            <div className="flex w-full max-w-2xl flex-col items-center text-center md:flex-row md:items-center md:text-left gap-3 sm:gap-4 md:gap-6 animate-dialog-pop">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping-slow" />
                <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-white">
                  <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10" />
                </span>
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200">
                  {isBlockchain && <Wallet className="w-3 h-3" />}
                  {isBlockchain ? "Blockchain Verification Submitted" : "Submitted"}
                </span>
                <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-[#0A2B5E] break-words">{title}</h1>
                <span className="mt-3 mx-auto md:mx-0 block h-[2px] w-12 rounded-full bg-gradient-to-r from-[#C8992A] to-[#e8b84b]" />
              </div>
            </div>
          </div>
        </section>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 lg:-mt-24 pb-10" style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-5">
            <section className="md:col-span-3 rounded-3xl bg-white shadow-[0_20px_48px_-20px_rgba(6,20,46,0.25)] ring-1 ring-black/5 overflow-hidden">
              <div className="relative overflow-hidden px-5 sm:px-6 pt-5 sm:pt-6 pb-5 sm:pb-6 border-b border-[#C8992A]/15 bg-gradient-to-br from-[#FFFCF5] via-[#FBF6EA] to-[#F6EEDB]">
                <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#e8b84b] via-[#C8992A] to-[#A67C1E]" />
                <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#e8b84b]/20 blur-3xl" />
                <div className="relative flex items-center justify-between gap-3 pb-4 border-b border-[#C8992A]/15">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#F3D27A] via-[#E2B24A] to-[#C8992A] ring-1 ring-white/60 shadow-md shadow-[#A67C1E]/30 flex items-center justify-center">
                      <Clock className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_1px_rgba(120,85,15,0.4)]" />
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C8992A] opacity-60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#A67C1E] ring-2 ring-[#FBF6EA]" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-[#A67C1E] uppercase tracking-[0.16em] leading-tight">Next Step</p>
                      <p className="mt-0.5 text-[15px] font-semibold text-[#0A2B5E] leading-tight">Action required</p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex flex-shrink-0 items-center rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A67C1E] ring-1 ring-[#C8992A]/30">
                    Pending
                  </span>
                </div>
                <p className="relative pt-4 text-[14px] sm:text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{nextStep}</p>
              </div>

              <div className="px-5 sm:px-6 py-5 sm:py-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-4">Progress</p>
                <ol className="space-y-0">
                  {steps.map((s, i) => {
                    const Icon = s.icon;
                    const last = i === steps.length - 1;
                    return (
                      <li key={s.label} className="relative flex gap-3.5 pb-5 last:pb-0">
                        {!last && <span className={`absolute left-[17px] top-9 bottom-0 w-px ${s.done ? "bg-emerald-300" : "bg-slate-200"}`} />}
                        <span className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ring-1 ${s.done ? "bg-emerald-500 text-white ring-emerald-500 shadow-md shadow-emerald-500/30" : i === 1 ? "bg-[#FBF8F1] text-[#A67C1E] ring-[#C8992A]/40" : "bg-slate-50 text-slate-400 ring-slate-200"}`}>
                          {s.done ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </span>
                        <div className="pt-1.5">
                          <p className={`text-sm font-semibold ${s.done ? "text-slate-800" : i === 1 ? "text-[#0A2B5E]" : "text-slate-500"}`}>{s.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{s.done ? "Completed" : i === 1 ? "Current step" : "Pending"}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>

            <aside className="md:col-span-2 flex flex-col gap-4 sm:gap-5">
              {tx && (
                <section className="rounded-3xl bg-white shadow-[0_20px_48px_-20px_rgba(6,20,46,0.25)] ring-1 ring-black/5 px-5 sm:px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Reference Details</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 px-3.5 py-3">
                      <Fingerprint className="w-4 h-4 text-[#1E3A8A] mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-500">FT-UID</p>
                        <p className="font-mono text-[13px] font-semibold text-slate-800 break-all">{tx.ft_uid}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 px-3.5 py-3">
                      <Hash className="w-4 h-4 text-[#1E3A8A] mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-500">ISFC Reference</p>
                        <p className="font-mono text-[13px] font-semibold text-slate-800 break-all">{tx.cbca_reference}</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                    Use your FT-UID and serial number to check the review status at any time.
                  </p>
                </section>
              )}

              <section className="rounded-3xl bg-white shadow-[0_20px_48px_-20px_rgba(6,20,46,0.25)] ring-1 ring-black/5 px-5 sm:px-6 py-5">
                <button
                  onClick={() => navigate("/")}
                  className="w-full flex items-center justify-center gap-2 select-none rounded-2xl py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0A2B5E] to-[#1E3A8A] shadow-lg shadow-[#0A2B5E]/25 hover:shadow-[#0A2B5E]/40 transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
                >
                  Return to Home
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center gap-2 mt-4 text-[11px] text-slate-400">
                  <Shield className="w-3 h-3" />
                  <span>ISFC Secure Review System &middot; End-to-End Encrypted</span>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
