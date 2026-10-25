import { useState, useEffect, useId, useCallback } from "react";
import { Bell } from "lucide-react";
import MessagePanel from "./MessagePanel";
import type { NotifItem } from "./MessagePanel";
import { getNotifications, getSiteBranding } from "../lib/api";
import type { SiteBranding } from "../lib/api";

interface Props {
  ftUid?: string;
}

// Deduplicate: for items with the same content, keep only the latest one.
function deduplicateByContent(items: NotifItem[]): NotifItem[] {
  const map = new Map<string, NotifItem>();
  for (const item of items) {
    const key = item.content.trim();
    const existing = map.get(key);
    if (!existing || new Date(item.created_at) > new Date(existing.created_at)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function isSeen(id: string, show_once: boolean, ftUid: string): boolean {
  const key = `cbca_seen_notifs_${ftUid}`;
  const store = show_once ? localStorage : sessionStorage;
  const seen: string[] = JSON.parse(store.getItem(key) || "[]");
  return seen.includes(id);
}

function markSeen(id: string, show_once: boolean, ftUid: string): void {
  const key = `cbca_seen_notifs_${ftUid}`;
  const store = show_once ? localStorage : sessionStorage;
  const seen: string[] = JSON.parse(store.getItem(key) || "[]");
  if (!seen.includes(id)) store.setItem(key, JSON.stringify([...seen, id]));
}

function BrandMark() {
  const uid = useId().replace(/:/g, "");
  return (
    <div className="relative h-9 w-9 flex-shrink-0 rounded-xl shadow-[0_5px_16px_rgba(0,13,36,0.35),0_0_14px_rgba(200,153,42,0.08)] lg:h-11 lg:w-11" aria-hidden="true">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#F6E3A8] via-[#C8992A] to-[#8F6A18] p-[1.5px]">
        <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-gradient-to-br from-[#1D4A8F] via-[#0A2B5E] to-[#051D3F] shadow-[inset_0_1px_5px_rgba(255,238,194,0.24),inset_0_-3px_6px_rgba(0,12,32,0.3)]">
          <svg viewBox="0 0 32 32" className="h-[76%] w-[76%]">
            <defs>
              <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F6E3A8" />
                <stop offset="0.5" stopColor="#C8992A" />
                <stop offset="1" stopColor="#9A7220" />
              </linearGradient>
            </defs>
            <path d="M16 2.6l10.4 3.6v8.6c0 6.7-4.3 11.6-10.4 14.6C9.9 26.4 5.6 21.5 5.6 14.8V6.2z" fill="#0A2B5E" stroke={`url(#${uid}-gold)`} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M16 5l8.2 2.8v7c0 5.4-3.4 9.4-8.2 11.9-4.8-2.5-8.2-6.5-8.2-11.9v-7z" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="0.5" strokeOpacity="0.7" strokeLinejoin="round" />
            <g fill={`url(#${uid}-gold)`}>
              <path d="M16 8.6l5.6 3.3H10.4z" />
              <rect x="10.6" y="12.5" width="10.8" height="1" />
              <rect x="11.5" y="14.2" width="1.6" height="5.4" />
              <rect x="15.2" y="14.2" width="1.6" height="5.4" />
              <rect x="18.9" y="14.2" width="1.6" height="5.4" />
              <rect x="10.6" y="20.2" width="10.8" height="1" />
              <rect x="11.8" y="21.8" width="8.4" height="0.9" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function Header({ ftUid }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [branding, setBranding] = useState<SiteBranding>({ brand_code: "CBCA", brand_tagline: "Cross-Border Payroll Settlement", brand_short: "Cross-Border Settlement" });
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getSiteBranding()
      .then(setBranding)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ftUid) return;
    getNotifications(ftUid)
      .then((notifs) => {
        const popupHistory = notifs.filter((n) => n.mode === "popup");
        setHistory(popupHistory);
        const unseenCount = popupHistory.filter((n) => !isSeen(n.id, n.show_once, ftUid)).length;
        setUnread(unseenCount);
      })
      .catch(() => {});
  }, [ftUid]);

  useEffect(() => {
    if (!drawerOpen) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.paddingRight = "";
      window.scrollTo(0, scrollY);
    };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  function openDrawer() {
    setDrawerOpen(true);
    if (!ftUid) return;
    setNewIds(new Set(history.filter((n) => !isSeen(n.id, n.show_once, ftUid)).map((n) => n.id)));
    // Mark all popup notifications as seen in their respective storage
    history.forEach((n) => markSeen(n.id, n.show_once, ftUid));
    setUnread(0);
  }

  return (
    <>
      <header className="site-header sticky top-0 z-40 flex-shrink-0 text-white" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:h-20">
          <span className="pointer-events-none absolute inset-y-0 left-2 w-[3px] bg-gradient-to-b from-[#EFD68E] via-[#C8992A] to-[#8F6A18] shadow-[5px_0_0_-1px_rgba(200,153,42,0.2)] sm:left-4 lg:w-1" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-2.5 lg:gap-3.5">
            <BrandMark />
            <div className="flex min-w-0 flex-col gap-1 lg:gap-1.5">
              <span className="truncate font-['Archivo',sans-serif] text-[20px] font-extrabold leading-none tracking-[0.14em] text-[#FFF8E7] [font-stretch:125%] [text-shadow:0_2px_10px_rgba(0,0,0,0.18)] lg:text-[27px]">{branding.brand_code}</span>
              <span className="h-px w-8 bg-gradient-to-r from-[#EFD68E] via-[#C8992A] to-[#C8992A]/30 lg:w-10" aria-hidden="true" />
              <span className="truncate text-[8px] font-semibold uppercase leading-none tracking-[0.04em] text-[#D4C6A4] min-[360px]:tracking-[0.16em] lg:hidden">{branding.brand_tagline}</span>
              <span className="hidden truncate text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-[#D4C6A4] lg:block">{branding.brand_tagline}</span>
            </div>
          </div>
          {ftUid && (
            <button
              onClick={openDrawer}
              className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#C8992A]/30 bg-white/[0.03] text-[#E8CD8B] transition hover:border-[#E8CD8B]/60 hover:bg-[#C8992A]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8CD8B]"
              aria-label="Message history"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#0A2B5E]">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          )}
        </div>
        <div className="h-px bg-gradient-to-r from-[#C8992A] via-[#E8B84B] to-[#C8992A] shadow-[0_-1px_0_#C8992A]" aria-hidden="true" />
      </header>

      {drawerOpen && (
        <MessagePanel items={deduplicateByContent(history)} newIds={newIds} onClose={closeDrawer} />
      )}
    </>
  );
}
