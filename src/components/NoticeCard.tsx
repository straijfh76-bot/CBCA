import { Bell } from "lucide-react";

export default function NoticeCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="group relative rounded-2xl bg-gradient-to-br from-[#FFFBF2] via-[#FFF6E5] to-[#FDEFD6] border border-amber-200/90 ring-1 ring-inset ring-white/70 shadow-[0_10px_30px_-14px_rgba(180,83,9,0.35)] overflow-hidden transition-all duration-300 hover:border-amber-300 hover:shadow-[0_16px_40px_-14px_rgba(180,83,9,0.5)]">
      <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-amber-300/30 to-orange-300/0 blur-2xl transition-opacity duration-500 group-hover:opacity-80" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 w-56 h-40 rounded-full bg-orange-200/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(rgba(180,83,9,0.12)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(to_left,black,transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 shadow-[2px_0_10px_rgba(245,158,11,0.45)]" />
      <div className="relative flex gap-3 sm:gap-4 pl-5 pr-4 sm:pl-6 sm:pr-5 py-3.5 sm:py-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 ring-1 ring-amber-600/20 shadow-[0_6px_14px_-4px_rgba(234,88,12,0.55),inset_0_1px_0_rgba(255,255,255,0.45)] flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
          <Bell className="w-[18px] h-[18px] text-white drop-shadow-[0_1px_1px_rgba(124,45,18,0.35)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 sm:gap-3 mb-1">
            <h3 className="text-[13px] sm:text-sm font-bold text-[#0A2B5E] tracking-tight leading-snug break-words min-w-0">{title}</h3>
            <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_2px_8px_-2px_rgba(234,88,12,0.5)] text-[10px] font-semibold text-white uppercase tracking-wider flex-shrink-0">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-white/80 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
              </span>
              Notice
            </span>
          </div>
          <p className="text-[13px] sm:text-sm text-[#5B4636] leading-relaxed whitespace-pre-line break-words">{content}</p>
        </div>
      </div>
    </div>
  );
}
