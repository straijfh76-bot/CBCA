import { useEffect, useState } from "react";
import { getNotifications } from "./api";

export type FixedBanner = { id: string; title: string; content: string };

const cacheKey = (ftUid: string) => `cbca_fixed_banners_${ftUid}`;

function readCache(ftUid: string | undefined): FixedBanner[] {
  if (!ftUid) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(cacheKey(ftUid)) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((b) => b && typeof b.id === "string" && typeof b.title === "string" && typeof b.content === "string")
      : [];
  } catch {
    return [];
  }
}

function writeCache(ftUid: string, banners: FixedBanner[]) {
  try {
    localStorage.setItem(cacheKey(ftUid), JSON.stringify(banners));
  } catch { /* storage full or unavailable */ }
}

function sameBanners(a: FixedBanner[], b: FixedBanner[]) {
  return a.length === b.length && a.every((x, i) => x.id === b[i].id && x.title === b[i].title && x.content === b[i].content);
}

export function useFixedBanners(ftUid: string | undefined, intervalMs = 4000) {
  const [banners, setBanners] = useState<FixedBanner[]>(() => readCache(ftUid));

  useEffect(() => {
    if (!ftUid) return;
    let cancelled = false;
    const cached = readCache(ftUid);
    setBanners((prev) => (sameBanners(prev, cached) ? prev : cached));
    const load = () => getNotifications(ftUid)
      .then((notifs) => {
        if (cancelled) return;
        const next = notifs
          .filter((n) => n.mode === "banner" && n.is_fixed)
          .map((n) => ({ id: n.id, title: n.title, content: n.content }));
        writeCache(ftUid, next);
        setBanners((prev) => (sameBanners(prev, next) ? prev : next));
      })
      .catch(() => {});
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    load();
    const id = setInterval(load, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ftUid, intervalMs]);

  return banners;
}
