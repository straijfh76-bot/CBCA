import React from "react";

type StatusType = "pending" | "processing" | "approved" | "failed" | "draft";

const en: Record<StatusType, { label: string; bg: string; text: string; dot: string }> = {
  draft:      { label: "Draft",       bg: "bg-gray-100",   text: "text-gray-600",  dot: "bg-gray-400" },
  pending:    { label: "Pending",     bg: "bg-yellow-50",  text: "text-yellow-700",dot: "bg-yellow-400" },
  processing: { label: "Processing",  bg: "bg-blue-50",    text: "text-blue-700",  dot: "bg-blue-500" },
  approved:   { label: "Approved",    bg: "bg-green-50",   text: "text-green-700", dot: "bg-green-500" },
  failed:     { label: "Failed",      bg: "bg-red-50",     text: "text-red-700",   dot: "bg-red-500" },
};

const zh: Record<StatusType, { label: string; bg: string; text: string; dot: string }> = {
  draft:      { label: "草稿",       bg: "bg-gray-100",   text: "text-gray-600",  dot: "bg-gray-400" },
  pending:    { label: "待處理",     bg: "bg-yellow-50",  text: "text-yellow-700",dot: "bg-yellow-400" },
  processing: { label: "處理中",     bg: "bg-blue-50",    text: "text-blue-700",  dot: "bg-blue-500" },
  approved:   { label: "已核准",     bg: "bg-green-50",   text: "text-green-700", dot: "bg-green-500" },
  failed:     { label: "未通過",     bg: "bg-red-50",     text: "text-red-700",   dot: "bg-red-500" },
};

const strongStyles: Record<StatusType, { pill: string; dot: string }> = {
  draft:      { pill: "bg-gray-600 text-white ring-gray-700/20 shadow-gray-500/30",           dot: "bg-white" },
  pending:    { pill: "bg-gradient-to-r from-amber-500 to-orange-500 text-white ring-orange-600/20 shadow-orange-500/30", dot: "bg-white" },
  processing: { pill: "bg-gradient-to-r from-sky-500 to-blue-600 text-white ring-blue-700/20 shadow-blue-500/30",       dot: "bg-white" },
  approved:   { pill: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white ring-emerald-700/20 shadow-emerald-500/30", dot: "bg-white" },
  failed:     { pill: "bg-gradient-to-r from-rose-500 to-red-600 text-white ring-red-700/20 shadow-red-500/30",         dot: "bg-white" },
};

export default function StatusBadge({ status, lang = "en", corner = false }: { status: StatusType; lang?: "en" | "zh"; corner?: boolean }) {
  const config = lang === "zh" ? zh : en;
  const c = config[status] || config.draft;
  if (corner) {
    const s = strongStyles[status] || strongStyles.draft;
    return (
      <span className={`inline-flex items-center gap-2 rounded-bl-2xl px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider shadow-md sm:px-4 sm:text-xs ${s.pill}`}>
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${s.dot}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
        </span>
        {c.label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
