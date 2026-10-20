import { Building2, CheckCircle, ChevronRight, Info, ShieldCheck, Wallet } from "lucide-react";

const cardBase =
  "group relative w-full text-left bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-2";

export function DebitCardOption({ onSelect }: { onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`${cardBase} bg-gradient-to-br from-white via-white to-sky-50 border-sky-200/80 hover:border-sky-400 hover:shadow-sky-900/10 focus:ring-sky-400/40`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-sky-100/60 blur-2xl transition-opacity duration-300 opacity-70 group-hover:opacity-100" />
      <div className="pointer-events-none absolute right-5 top-5 hidden sm:block w-20 h-12 rounded-lg border border-sky-200/70 bg-gradient-to-br from-sky-50 to-white rotate-6 transition-transform duration-300 group-hover:rotate-3">
        <span className="absolute left-2 top-2.5 w-4 h-3 rounded-sm bg-amber-200/80" />
        <span className="absolute left-2 bottom-2 w-10 h-1 rounded-full bg-sky-200" />
      </div>
      <div className="relative flex items-center gap-3.5 px-4 py-4 sm:px-5 lg:px-5 lg:py-4">
        <div className="flex-shrink-0 w-11 h-11 lg:w-12 lg:h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center transition-colors group-hover:bg-sky-100">
          <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-sky-700" />
        </div>
        <div className="flex-1 min-w-0 sm:pr-20">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
            <h3 className="text-[15px] lg:text-base font-bold tracking-tight text-[#0A2B5E]">Debit Card Verification</h3>
            <span className="inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 whitespace-nowrap">
              Standard
            </span>
          </div>
          <p className="text-xs lg:text-[13px] text-slate-500 leading-relaxed">Verify your identity with a debit card issued in your name by a licensed financial institution.</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {["Bank-issued card match", "Standard compliance review"].map(item => (
              <li key={item} className="flex items-center gap-1.5 text-[11px] lg:text-xs text-slate-600">
                <CheckCircle className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="relative flex items-center justify-between gap-3 border-t border-sky-100 bg-sky-50/60 px-4 sm:px-5 lg:px-5 py-2.5">
        <span className="text-[11px] lg:text-xs font-medium text-sky-800/80">Secure bank-card verification</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700 shadow-sm transition-all group-hover:bg-sky-600 group-hover:border-sky-600 group-hover:text-white group-hover:gap-2">
          Select <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
}

export function BlockchainOption({ onSelect }: { onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`${cardBase} bg-gradient-to-br from-white via-white to-teal-50 border-teal-200/80 hover:border-teal-400 hover:shadow-teal-900/10 focus:ring-teal-500/40`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-teal-100/60 blur-2xl opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute right-6 top-6 hidden sm:flex items-center transition-transform duration-300 group-hover:translate-x-1">
        {[0, 1, 2].map(n => (
          <div key={n} className="flex items-center">
            {n > 0 && <span className="w-4 h-px bg-teal-200" />}
            <span className="w-5 h-5 rounded-md border border-teal-200 bg-white/80 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-sm bg-teal-300" />
            </span>
          </div>
        ))}
      </div>
      <div className="relative px-4 py-4 sm:px-5 lg:px-5 lg:py-4">
        <div className="flex items-center gap-3.5">
          <div className="flex-shrink-0 w-11 h-11 lg:w-12 lg:h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center transition-colors group-hover:bg-teal-100">
            <Wallet className="w-5 h-5 lg:w-6 lg:h-6 text-teal-700" />
          </div>
          <div className="flex-1 min-w-0 sm:pr-20">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
              <h3 className="text-[15px] lg:text-base font-bold tracking-tight text-[#0A2B5E]">Blockchain Address Verification</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700 whitespace-nowrap">
                <ShieldCheck className="w-3 h-3" />
                KYC Exempt
              </span>
            </div>
            <p className="text-xs lg:text-[13px] text-slate-500 leading-relaxed">KYC verification is not required for this step. Please provide your activated Exclusive Digital Account receiving address for verification.</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-[11px] lg:text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Important:</span> The Cross-Border Fee must be pre-deposited into your activated Exclusive Digital Account.
          </p>
        </div>
      </div>
      <div className="relative flex items-center justify-between gap-3 border-t border-teal-100 bg-teal-50/60 px-4 sm:px-5 lg:px-5 py-2.5">
        <span className="text-[11px] lg:text-xs font-medium text-teal-800/80">Digital account information submission</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white border border-teal-200 px-3 py-1 text-xs font-bold text-teal-700 shadow-sm transition-all group-hover:bg-teal-600 group-hover:border-teal-600 group-hover:text-white group-hover:gap-2">
          Select <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
}
