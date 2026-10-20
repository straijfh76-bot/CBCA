import { useEffect } from "react";
import { Bell, X, Inbox, MessageSquareText } from "lucide-react";
import type { AdminNotification } from "../lib/types";
import { useLockBodyScroll } from "../lib/useLockBodyScroll";

export type NotifItem = Pick<AdminNotification, "id" | "title" | "content" | "mode" | "is_fixed" | "show_once" | "created_at">;

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MessagePanel({ items, newIds, onClose }: { items: NotifItem[]; newIds: Set<string>; onClose: () => void }) {
  useLockBodyScroll();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const newCount = items.filter((n) => newIds.has(n.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end" role="dialog" aria-modal="true" aria-label="Message history">
      <div className="absolute inset-0 bg-[#051d3f]/65 animate-dialog-fade" onClick={onClose} />

      <div
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 shadow-2xl animate-slide-up lg:h-full lg:max-w-md lg:animate-slide-in-right lg:border-l lg:border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="relative flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#123b78] via-[#0A2B5E] to-[#051d3f] px-5 py-4 text-white" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#C8992A]/20 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#efd68e] via-[#C8992A] to-[#8f6a18] p-[1.5px] shadow-md shadow-black/30">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0A2B5E]">
                  <Bell className="h-4 w-4 text-[#efd68e]" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold leading-tight">Messages</h2>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-blue-100 ring-1 ring-white/15">{items.length}</span>
                  {newCount > 0 && (
                    <span className="rounded-full bg-[#C8992A] px-2 py-0.5 text-[10px] font-bold leading-none text-[#051d3f]">{newCount} new</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-blue-100 ring-1 ring-white/15 transition hover:rotate-90 hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#C8992A] via-[#e8b84b] to-[#C8992A]" />
        </div>

        <div className="scroll-touch flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                <Inbox className="h-9 w-9 text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-700">No messages yet</p>
              <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-slate-500">Official notices about your settlement will appear here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((n) => {
                const isNew = newIds.has(n.id);
                return (
                  <li
                    key={n.id}
                    className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${isNew ? "border-[#C8992A]/40" : "border-slate-200"}`}
                  >
                    <div className={`absolute inset-y-0 left-0 w-1 ${isNew ? "bg-gradient-to-b from-[#efd68e] to-[#C8992A]" : "bg-[#0A2B5E]/15 group-hover:bg-[#0A2B5E]/40"} transition-colors`} />
                    <div className="flex gap-3 p-4 pl-5">
                      <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${isNew ? "bg-amber-50 text-[#a37a1c]" : "bg-slate-100 text-[#0A2B5E]"}`}>
                        <MessageSquareText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-slate-900">{n.title}</h3>
                          {isNew && (
                            <span className="flex-shrink-0 rounded-full bg-[#C8992A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#051d3f]">New</span>
                          )}
                        </div>
                        <time className="mt-1 block text-[11px] font-medium text-slate-400">{formatTime(n.created_at)}</time>
                        <p className="mt-2.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{n.content}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 lg:hidden">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-[#0A2B5E] py-3.5 text-sm font-bold text-white shadow-md shadow-[#0A2B5E]/20 transition hover:bg-[#1E3A8A] active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
