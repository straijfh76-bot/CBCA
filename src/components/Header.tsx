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

function BrandMark({ size = 40 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  return (
    <div className="relative rounded-xl overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#efd68e] via-[#C8992A] to-[#8f6a18] p-[1.5px] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.85)]">
        <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-[#1d4a8f] via-[#0A2B5E] to-[#051d3f] flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-[76%] h-[76%]">
            <defs>
              <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f6e3a8" />
                <stop offset="0.5" stopColor="#C8992A" />
                <stop offset="1" stopColor="#9a7220" />
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
      <header className="sticky top-0 z-40 bg-[#0A2B5E] text-white shadow-xl border-b border-[#1a3f7a]" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
        {/* Mobile header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <BrandMark size={36} />
              <div className="flex flex-col min-w-0">
                <span className="text-[15px] font-extrabold tracking-[0.18em] leading-none text-white">{branding.brand_code}</span>
                <span className="block h-px w-5 bg-gradient-to-r from-[#C8992A] to-transparent my-1" />
                <span className="text-[9px] text-blue-200/80 tracking-[0.24em] uppercase leading-none font-medium truncate">{branding.brand_short}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {ftUid && (
                <button
                  onClick={openDrawer}
                  className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition"
                  aria-label="Message history"
                >
                  <Bell className="w-4 h-4 text-blue-200" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-[#C8992A] via-[#e8b84b] to-[#C8992A]" />
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block">
          <div className="max-w-7xl mx-auto px-4 py-0 flex items-stretch justify-between">
            <div className="flex items-stretch gap-0">
              <div className="w-1 bg-gradient-to-b from-[#efd68e] via-[#C8992A] to-[#8f6a18] self-stretch mr-5" />
              <div className="flex items-center my-3">
                <BrandMark size={44} />
                <div className="flex flex-col justify-center ml-3.5">
                  <span className="text-[1.25rem] font-extrabold tracking-[0.2em] leading-none text-white">{branding.brand_code}</span>
                  <span className="block h-px w-8 bg-gradient-to-r from-[#C8992A] to-transparent my-[6px]" />
                  <span className="text-[10px] text-blue-200/90 tracking-[0.26em] uppercase leading-none font-medium">
                    {branding.brand_tagline}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {ftUid && (
                <button
                  onClick={openDrawer}
                  className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-400/30 hover:bg-white/10 transition"
                  aria-label="Message history"
                >
                  <Bell className="w-4 h-4 text-blue-200" />
                  <span className="text-[11px] text-blue-200 font-medium">Messages</span>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-[#C8992A] via-[#e8b84b] to-[#C8992A]" />
        </div>
      </header>

      {drawerOpen && (
        <MessagePanel items={deduplicateByContent(history)} newIds={newIds} onClose={closeDrawer} />
      )}
    </>
  );
}
