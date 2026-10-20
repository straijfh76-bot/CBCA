import { ArrowRight, Wallet, Clock, Hourglass, CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { Transaction } from "../lib/types";

const STATUS_THEMES: Record<string, {
  icon: LucideIcon; heading: string; bg: string; border: string; shadow: string; accent: string; glow: string;
  iconBg: string; iconShadow: string; title: string; body: string; noteBorder: string;
}> = {
  deposit: {
    icon: Wallet, heading: "Action Required: Fee Pre-Deposit",
    bg: "from-amber-50 via-orange-50/60 to-white", border: "border-amber-200", shadow: "shadow-amber-900/10",
    accent: "from-amber-400 via-orange-500 to-rose-500", glow: "bg-orange-200",
    iconBg: "from-amber-400 to-orange-500", iconShadow: "shadow-orange-500/30",
    title: "text-amber-950", body: "text-amber-900/80", noteBorder: "border-amber-200",
  },
  pending: {
    icon: Clock, heading: "Awaiting Review",
    bg: "from-sky-50 via-blue-50/60 to-white", border: "border-sky-200", shadow: "shadow-sky-900/10",
    accent: "from-sky-400 to-blue-600", glow: "bg-sky-200",
    iconBg: "from-sky-500 to-blue-600", iconShadow: "shadow-blue-500/30",
    title: "text-slate-900", body: "text-slate-600", noteBorder: "border-sky-200",
  },
  processing: {
    icon: Hourglass, heading: "Review In Progress",
    bg: "from-blue-50 via-cyan-50/50 to-white", border: "border-blue-200", shadow: "shadow-blue-900/10",
    accent: "from-cyan-400 to-blue-600", glow: "bg-cyan-200",
    iconBg: "from-cyan-500 to-blue-600", iconShadow: "shadow-blue-500/30",
    title: "text-slate-900", body: "text-slate-600", noteBorder: "border-blue-200",
  },
  approved: {
    icon: CheckCircle2, heading: "Verification Approved",
    bg: "from-emerald-50 via-teal-50/50 to-white", border: "border-emerald-200", shadow: "shadow-emerald-900/10",
    accent: "from-emerald-400 to-teal-600", glow: "bg-emerald-200",
    iconBg: "from-emerald-500 to-teal-600", iconShadow: "shadow-emerald-500/30",
    title: "text-emerald-950", body: "text-emerald-900/75", noteBorder: "border-emerald-200",
  },
  failed: {
    icon: XCircle, heading: "Verification Not Approved",
    bg: "from-rose-50 via-red-50/50 to-white", border: "border-rose-200", shadow: "shadow-rose-900/10",
    accent: "from-rose-400 to-red-600", glow: "bg-rose-200",
    iconBg: "from-rose-500 to-red-600", iconShadow: "shadow-red-500/30",
    title: "text-rose-950", body: "text-rose-900/75", noteBorder: "border-rose-200",
  },
};

type BadgeStatus = "pending" | "processing" | "approved" | "failed" | "draft";

export default function StatusNotice({ tx, blockchainLocked, canModify, onResubmit }: {
  tx: Transaction;
  blockchainLocked?: boolean;
  canModify: boolean;
  onResubmit: () => void;
}) {
  const depositPending = blockchainLocked && tx.review_status === "pending";
  const t = STATUS_THEMES[depositPending ? "deposit" : tx.review_status] ?? STATUS_THEMES.pending;
  const Icon = t.icon;

  return (
    <div className={`group relative overflow-hidden rounded-2xl border ${t.border} bg-gradient-to-br ${t.bg} shadow-lg ${t.shadow} transition-shadow duration-300 hover:shadow-xl`}>
      <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${t.accent}`} />
      <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${t.glow} blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-90`} />

      <div className="absolute right-0 top-0 z-10">
        <StatusBadge status={tx.review_status as BadgeStatus} corner />
      </div>

      <div className="relative flex items-start gap-3.5 py-4 pl-5 pr-4 pt-5 sm:gap-5 sm:py-5 sm:pl-7 sm:pr-6">
        <div className="relative flex-shrink-0">
          {depositPending && <span className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${t.iconBg} animate-ping opacity-20`} />}
          <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${t.iconBg} shadow-md ${t.iconShadow} sm:h-12 sm:w-12 sm:rounded-2xl`}>
            <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className={`pr-24 text-[15px] font-bold leading-tight sm:pr-28 sm:text-base ${t.title}`}>{t.heading}</h2>
          <p className={`mt-1.5 text-[13px] leading-relaxed sm:text-sm ${t.body}`}>
            {depositPending && "Your application has been submitted. Please complete the Cross-Border Fee pre-deposit, then contact your department manager to complete the verification confirmation process."}
            {tx.review_status === "pending" && !depositPending && "Your documents are awaiting review. Please stand by."}
            {tx.review_status === "processing" && "Your documents are currently under review. Please stand by."}
            {tx.review_status === "approved" && "Review approved. Your funds will be settled shortly."}
            {tx.review_status === "failed" && "Your identity verification has not been approved. Please review the official decision below and resubmit your documents accordingly."}
          </p>

          {tx.review_note && (
            <div className={`mt-3 rounded-xl border bg-white/80 p-3 text-[13px] leading-relaxed text-gray-700 sm:mt-4 sm:p-3.5 sm:text-sm ${t.noteBorder}`}>
              <span className={`font-semibold ${t.title}`}>Official Review Decision: </span>
              {tx.review_note}
            </div>
          )}

          {canModify && (
            <button
              onClick={onResubmit}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A2B5E] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#0A2B5E]/20 transition hover:bg-[#1E3A8A] active:scale-[0.98] sm:inline-flex sm:w-auto sm:py-2.5"
            >
              Update Documents &amp; Resubmit
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
