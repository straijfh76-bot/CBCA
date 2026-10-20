import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Eye, X, Monitor, Tablet, Smartphone, RefreshCw } from "lucide-react";

const DEVICES = {
  desktop: { label: "電腦", icon: Monitor, width: 0, height: 0 },
  tablet: { label: "平板", icon: Tablet, width: 820, height: 1180 },
  mobile: { label: "手機", icon: Smartphone, width: 390, height: 844 },
} as const;

type DeviceKey = keyof typeof DEVICES;

const BEZEL = { tablet: 16, mobile: 12 } as const;
const STAGE_PADDING = 24;

export default function EmployeePreviewModal({ txId, ftUid, onClose }: { txId: string; ftUid: string; onClose: () => void }) {
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setStage({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const src = `${window.location.pathname}#/admin/preview/${txId}`;
  const spec = DEVICES[device];
  const bezel = device === "desktop" ? 0 : BEZEL[device];
  const outerW = spec.width + bezel * 2;
  const outerH = spec.height + bezel * 2;
  const scale = device === "desktop" || !stage.w
    ? 1
    : Math.min(1, (stage.w - STAGE_PADDING * 2) / outerW, (stage.h - STAGE_PADDING * 2) / outerH);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)] w-full h-full max-w-[1600px] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-[#0A2B5E] via-[#0F3A7A] to-[#1D4F96] text-white flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
              <Eye className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold leading-tight flex items-center gap-2">
                員工端預覽
                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse" />即時同步
                </span>
              </h3>
              <p className="text-[11px] text-blue-100/80 mt-0.5 truncate">{ftUid} · 預覽中按鈕不會執行任何操作</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {device !== "desktop" && (
              <span className="hidden md:inline text-[11px] font-medium text-blue-100/90 tabular-nums mr-1">
                {spec.width} × {spec.height} · {Math.round(scale * 100)}%
              </span>
            )}
            <div className="flex rounded-lg bg-white/10 p-1 ring-1 ring-white/15">
              {(Object.keys(DEVICES) as DeviceKey[]).map(key => {
                const { label, icon: Icon } = DEVICES[key];
                return (
                  <button
                    key={key}
                    onClick={() => setDevice(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${device === key ? "bg-white text-[#0A2B5E] shadow-sm" : "text-blue-100 hover:text-white hover:bg-white/10"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setReloadKey(k => k + 1)} className="p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/15 transition" title="重新整理">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/15 transition" title="關閉 (Esc)">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-sky-400 via-blue-300 to-sky-400" />
        </div>

        <div
          ref={stageRef}
          className={`flex-1 min-h-0 relative overflow-hidden ${device === "desktop" ? "bg-white" : "bg-[radial-gradient(circle_at_center,_#E2E8F0_0%,_#CBD5E1_100%)] flex items-center justify-center"}`}
        >
          {device === "desktop" ? (
            <iframe key={`d-${reloadKey}`} src={src} title="員工端預覽（電腦）" className="absolute inset-0 w-full h-full border-0" />
          ) : (
            <div style={{ width: outerW * scale, height: outerH * scale }} className="flex-shrink-0">
              <div
                style={{ width: outerW, height: outerH, padding: bezel, transform: `scale(${scale})`, transformOrigin: "top left" }}
                className={`bg-slate-900 shadow-2xl ring-1 ring-slate-700 ${device === "mobile" ? "rounded-[44px]" : "rounded-[32px]"}`}
              >
                <iframe
                  key={`${device}-${reloadKey}`}
                  src={src}
                  title={`員工端預覽（${spec.label}）`}
                  style={{ width: spec.width, height: spec.height }}
                  className={`block border-0 bg-white ${device === "mobile" ? "rounded-[32px]" : "rounded-[18px]"}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
