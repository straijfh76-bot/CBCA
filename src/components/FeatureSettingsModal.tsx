import { useState, useEffect, useRef } from "react";
import { Settings, X, Check, AlertCircle, AlertTriangle, Clock, ChevronDown, Send, ShieldAlert, UserCheck, Lock, PenLine, Eye, Languages } from "lucide-react";
import { adminGetVerificationMode, adminSaveVerificationMode, adminGetCodeSendConfig, adminSaveCodeSendConfig } from "../lib/api";
import type { VerificationModeConfig, SendLimitsByMode } from "../lib/api";
import type { CodeSendLimitConfig } from "../lib/types";

const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm leading-relaxed bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition";

type Tone = "red" | "amber" | "blue" | "green";

const toneStyles: Record<Tone, { iconBg: string; iconText: string; bar: string; soft: string; softBorder: string; headText: string }> = {
  red: { iconBg: "bg-red-100", iconText: "text-red-600", bar: "bg-red-500", soft: "bg-red-50", softBorder: "border-red-100", headText: "text-red-700" },
  amber: { iconBg: "bg-amber-100", iconText: "text-amber-600", bar: "bg-amber-500", soft: "bg-amber-50", softBorder: "border-amber-100", headText: "text-amber-700" },
  green: { iconBg: "bg-green-100", iconText: "text-green-600", bar: "bg-green-500", soft: "bg-green-50", softBorder: "border-green-100", headText: "text-green-700" },
  blue: { iconBg: "bg-blue-100", iconText: "text-[#1E3A8A]", bar: "bg-[#1E3A8A]", soft: "bg-blue-50", softBorder: "border-blue-100", headText: "text-[#1E3A8A]" },
};

function NumberField({ value, onChange, min, max, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = (raw: string) => {
    const n = Math.max(min, Math.min(max, parseInt(raw, 10) || 0));
    setText(String(n));
    onChange(n);
  };
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        onChange={e => {
          setText(e.target.value);
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={e => commit(e.target.value)}
        className={`${inputClass} pr-14 text-base font-semibold`}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">{unit}</span>
    </div>
  );
}

function Section({ icon, tone, title, description, param, prompt }: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  description: string;
  param: React.ReactNode;
  prompt: React.ReactNode;
}) {
  const t = toneStyles[tone];
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${t.bar}`} />
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className={`p-6 pl-8 ${t.soft} border-b lg:border-b-0 lg:border-r ${t.softBorder}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm ${t.iconText}`}>{icon}</div>
            <h4 className="text-base font-bold text-[#0A2B5E]">{title}</h4>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-4">{description}</p>
          {param}
        </div>
        <div className="min-w-0 p-6">{prompt}</div>
      </div>
    </section>
  );
}

function PanelHeader({ icon, label, note, className }: { icon: React.ReactNode; label: string; note?: string; className: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider">{icon}{label}</p>
      {note && <span className="text-[11px] font-semibold rounded-full bg-white/80 px-2.5 py-0.5">{note}</span>}
    </div>
  );
}

function PromptPreview({ icon, tone, title, message }: { icon: React.ReactNode; tone: Tone; title: string; message: string }) {
  const t = toneStyles[tone];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.iconBg} ${t.iconText}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#0A2B5E] break-words">{title}</p>
        <p className="text-sm text-gray-500 leading-relaxed mt-0.5 break-words whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
}

function DefaultPromptPanel({ note, zhTitle, zhMessage, ...prompt }: { icon: React.ReactNode; tone: Tone; title: string; message: string; note: string; zhTitle: string; zhMessage: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
      <PanelHeader icon={<Lock className="w-3.5 h-3.5" />} label="系統預設提示（不可修改）" note={note} className="bg-slate-200/70 border-slate-200 text-slate-600" />
      <div className="p-4 space-y-3">
        <PromptPreview {...prompt} />
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-emerald-700 mb-1"><Languages className="w-3.5 h-3.5" />中文翻譯</p>
          <p className="text-sm font-semibold text-gray-800">{zhTitle}</p>
          <p className="text-sm text-gray-600 leading-relaxed mt-0.5">{zhMessage}</p>
        </div>
      </div>
    </div>
  );
}

function CustomPromptPanel({ icon, tone, title, message, defaultTitle, defaultMessage, onTitle, onMessage, note }: {
  icon: React.ReactNode;
  tone: Tone;
  title: string;
  message: string;
  defaultTitle: string;
  defaultMessage: string;
  onTitle: (v: string) => void;
  onMessage: (v: string) => void;
  note: string;
}) {
  return (
    <div className={`rounded-2xl overflow-hidden border ${toneStyles[tone].softBorder} bg-white`}>
      <PanelHeader icon={<PenLine className="w-3.5 h-3.5" />} label="自訂提示框（可修改）" note={note} className={`${toneStyles[tone].soft} ${toneStyles[tone].softBorder} ${toneStyles[tone].headText}`} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 p-5">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">標題</label>
            <input type="text" value={title} onChange={e => onTitle(e.target.value)} placeholder={defaultTitle} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">內容</label>
            <textarea rows={4} value={message} onChange={e => onMessage(e.target.value)} placeholder={defaultMessage} className={`${inputClass} resize-none`} />
          </div>
          <p className="text-[11px] text-gray-400">留空時使用灰色提示文字作為預設內容。</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5"><Eye className="w-4 h-4 text-gray-400" />員工看到的效果</p>
          <div className={`relative rounded-xl border border-dashed ${toneStyles[tone].softBorder} ${toneStyles[tone].soft} bg-[radial-gradient(circle,rgba(148,163,184,0.35)_1px,transparent_1px)] bg-[length:14px_14px] p-5 [&>div]:shadow-lg [&>div]:shadow-slate-900/5 transition-shadow`}>
            <PromptPreview icon={icon} tone={tone} title={title || defaultTitle} message={message || defaultMessage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OffNotice({ text }: { text: string }) {
  return (
    <div className="h-full min-h-[120px] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center px-6 text-center">
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

const MIN_EXPIRY_SECONDS = 10;

const modeOptions: { value: VerificationModeConfig["mode"]; label: string; desc: string; icon: React.ReactNode; badge: string; solid: string; card: string; descText: string }[] = [
  { value: "always_fail", label: "一律錯誤", desc: "員工輸入任何驗證碼都會被判定為錯誤，不需管理員操作。", icon: <ShieldAlert className="w-4 h-4" />, badge: "bg-red-50 text-red-600 ring-red-100", solid: "bg-red-600 hover:bg-red-700 shadow-red-600/25", card: "border-red-200 bg-red-50 before:bg-red-500", descText: "text-red-800" },
  { value: "admin_confirm", label: "需管理員確認", desc: "員工送出驗證碼後進入等待，由管理員在後台判定正確或錯誤。", icon: <UserCheck className="w-4 h-4" />, badge: "bg-amber-50 text-amber-600 ring-amber-100", solid: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25", card: "border-amber-200 bg-amber-50 before:bg-amber-500", descText: "text-amber-900" },
];

function modeCardClass(mode: VerificationModeConfig["mode"], enabled: boolean) {
  if (!enabled) return "border-gray-200 bg-gray-50 before:bg-gray-300";
  return (modeOptions.find(o => o.value === mode) ?? modeOptions[0]).card;
}

function ModeSelect({ value, disabled, onChange }: { value: VerificationModeConfig["mode"]; disabled: boolean; onChange: (v: VerificationModeConfig["mode"]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = modeOptions.find(o => o.value === value) ?? modeOptions[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);

  return (
    <div className="flex items-center gap-3">
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl pl-1.5 pr-3 py-1.5 text-sm font-bold shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E3A8A] disabled:cursor-not-allowed ${disabled ? "bg-gray-200 text-gray-500 shadow-none" : `${current.solid} text-white`} ${open ? "ring-2 ring-offset-2 ring-[#1E3A8A]/30" : ""}`}
        >
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${disabled ? "bg-white text-gray-400" : "bg-white/20 text-white"}`}>{current.icon}</span>
          {current.label}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${disabled ? "text-gray-400" : "text-white/90"} ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div role="listbox" className="absolute left-0 top-full mt-2 z-20 w-80 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
            <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold tracking-wide text-gray-400">選擇驗證方式</p>
            {modeOptions.map(o => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <span className={`mt-0.5 w-8 h-8 flex-shrink-0 rounded-lg ring-1 flex items-center justify-center ${o.badge}`}>{o.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#0A2B5E]">{o.label}</span>
                    <span className="block text-xs leading-relaxed text-gray-500 mt-0.5">{o.desc}</span>
                  </span>
                  {selected && <Check className="mt-1 w-4 h-4 flex-shrink-0 text-[#1E3A8A]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className={`max-w-[280px] text-xs font-medium leading-relaxed ${disabled ? "text-gray-600" : current.descText}`}>
        {disabled ? "測試模式關閉中，員工的驗證碼依正常流程驗證。開啟後可選擇驗證方式。" : current.desc}
      </p>
    </div>
  );
}

export default function FeatureSettingsModal({
  adminUsername,
  onClose,
  onSaved,
}: {
  adminUsername: string;
  onClose: () => void;
  onSaved: (username: string, state: { testEnabled: boolean; mode: VerificationModeConfig["mode"] }) => void;
}) {
  const [cfg, setCfg] = useState<VerificationModeConfig>({
    is_enabled: false,
    mode: "always_fail",
    timeout_seconds: 30,
    code_expiry_seconds: 0,
    max_fail_attempts: 0,
    wrong_code_title: "",
    wrong_code_message: "",
    timeout_title: "",
    timeout_message: "",
    fail_limit_title: "",
    fail_limit_message: "",
    confirm_max_fail_attempts: 0,
    confirm_code_expiry_seconds: 0,
    confirm_fail_limit_title: "",
    confirm_fail_limit_message: "",
  });
  const emptyLimit = { is_enabled: false, max_sends: 0, warning_title: "", warning_message: "" };
  const [limits, setLimits] = useState<SendLimitsByMode>({ always_fail: emptyLimit, admin_confirm: emptyLimit });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    Promise.all([adminGetVerificationMode(adminUsername), adminGetCodeSendConfig(adminUsername)])
      .then(([vm, sl]) => {
        setCfg(c => ({ ...c, ...vm, code_expiry_seconds: vm.code_expiry_seconds ?? 0, confirm_code_expiry_seconds: vm.confirm_code_expiry_seconds ?? 0 }));
        const norm = (l: CodeSendLimitConfig) => ({ ...l, max_sends: l.is_enabled ? l.max_sends : 0 });
        setLimits({ always_fail: norm(sl.always_fail), admin_confirm: norm(sl.admin_confirm) });
      })
      .catch(() => setLoadError("無法載入設定，請關閉後重試。"))
      .finally(() => setLoading(false));
  }, [adminUsername]);

  async function handleSave() {
    const badExpiry = (secs: number) => secs > 0 && secs < MIN_EXPIRY_SECONDS;
    if (badExpiry(cfg.code_expiry_seconds) || badExpiry(cfg.confirm_code_expiry_seconds)) {
      const which = badExpiry(cfg.code_expiry_seconds) ? "一律錯誤" : "需管理員確認";
      setError(`「${which}」的驗證碼有效時間至少 ${MIN_EXPIRY_SECONDS} 秒，或設為 0。`);
      return;
    }
    setSaving(true);
    setError("");
    const limitsToSave: SendLimitsByMode = {
      always_fail: { ...limits.always_fail, is_enabled: limits.always_fail.max_sends > 0 },
      admin_confirm: { ...limits.admin_confirm, is_enabled: limits.admin_confirm.max_sends > 0 },
    };
    try {
      await Promise.all([adminSaveVerificationMode(adminUsername, cfg), adminSaveCodeSendConfig(adminUsername, limitsToSave)]);
      onSaved(adminUsername, { testEnabled: cfg.is_enabled, mode: cfg.mode });
      setSaveSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "儲存失敗。");
      setSaving(false);
    }
  }

  const isConfirm = cfg.mode === "admin_confirm";
  const limit = limits[cfg.mode];
  const setLimit = (fn: (c: CodeSendLimitConfig) => CodeSendLimitConfig) =>
    setLimits(all => ({ ...all, [cfg.mode]: fn(all[cfg.mode]) }));
  const keys = isConfirm
    ? { max: "confirm_max_fail_attempts", expiry: "confirm_code_expiry_seconds", title: "confirm_fail_limit_title", message: "confirm_fail_limit_message" } as const
    : { max: "max_fail_attempts", expiry: "code_expiry_seconds", title: "fail_limit_title", message: "fail_limit_message" } as const;
  const max = cfg[keys.max];
  const expiry = cfg[keys.expiry];
  const modeLabel = isConfirm ? "需管理員確認" : "一律錯誤";

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#1E3A8A]" />
            </div>
            <div>
              <h3 className="font-bold text-[#0A2B5E] text-base">驗證碼功能設定</h3>
              <p className="text-[11px] text-gray-400">管理員 {adminUsername}</p>
            </div>
          </div>
          <div className={`relative flex flex-wrap items-center gap-4 rounded-2xl border pl-5 pr-3 py-2 shadow-sm transition-colors duration-300 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-l-2xl before:transition-colors ${modeCardClass(cfg.mode, cfg.is_enabled)}`}>
            <label className="flex items-center gap-3 cursor-pointer select-none whitespace-nowrap">
              <button
                type="button"
                role="switch"
                aria-checked={cfg.is_enabled}
                onClick={() => setCfg(c => ({ ...c, is_enabled: !c.is_enabled }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 ${cfg.is_enabled ? "bg-[#1E3A8A]" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${cfg.is_enabled ? "translate-x-5" : ""}`} />
              </button>
              <span className="leading-tight">
                <span className="block text-sm font-bold text-[#0A2B5E]">測試模式</span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.is_enabled ? "bg-green-500" : "bg-gray-300"}`} />
                  {cfg.is_enabled ? "已啟用" : "已關閉"}
                </span>
              </span>
            </label>
            <span className="hidden sm:block h-9 w-px bg-gray-200" />
            <ModeSelect value={cfg.mode} disabled={!cfg.is_enabled} onChange={mode => setCfg(c => ({ ...c, mode }))} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{error}
            </p>
          )}
          <button onClick={onClose} className="w-24 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !!loadError || saving || saveSuccess}
            className="w-36 py-2.5 rounded-xl bg-[#0A2B5E] text-white text-sm font-semibold hover:bg-[#1E3A8A] transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            儲存全部設定
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 gap-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-base font-bold text-green-700">設定已儲存！</p>
          <p className="text-xs text-gray-400">所有設定都已更新。</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="h-full flex items-center justify-center py-20 text-sm text-red-500 gap-2">
            <AlertCircle className="w-4 h-4" />{loadError}
          </div>
        ) : (
          <div className="w-full px-5 md:px-10 py-6">
            {!cfg.is_enabled && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-[#1E3A8A]">
                <Lock className="w-4 h-4 flex-shrink-0" />
                測試模式未啟用，以下設定暫不生效。請先打開上方「測試模式」開關再調整。
              </div>
            )}

            {cfg.is_enabled && (
              <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${isConfirm ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"}`}>
                {isConfirm ? <UserCheck className="w-4 h-4 flex-shrink-0" /> : <ShieldAlert className="w-4 h-4 flex-shrink-0" />}
                <span>目前編輯「<strong className="font-bold">{modeLabel}</strong>」的設定。兩種驗證方式的設定完全分開，員工端只會套用上方選中的方式。</span>
              </div>
            )}

            <fieldset disabled={!cfg.is_enabled} className={`space-y-5 transition-opacity ${cfg.is_enabled ? "" : "opacity-50 pointer-events-none"}`}>
              <Section
                icon={<AlertTriangle className="w-5 h-5" />}
                tone="red"
                title="驗證碼錯誤"
                description={isConfirm ? "管理員拒絕驗證碼時，員工會看到此提示。" : "員工每次提交驗證碼都會被判定為錯誤，並看到此提示。"}
                param={<p className="text-xs text-gray-400 leading-relaxed">此提示由系統固定，無需設定參數。</p>}
                prompt={
                  <DefaultPromptPanel
                    icon={<AlertTriangle className="w-5 h-5" />}
                    tone="red"
                    title="Incorrect Verification Code"
                    message="The verification code you entered is incorrect. Please try again."
                    zhTitle="驗證碼錯誤"
                    zhMessage="您輸入的驗證碼不正確，請重新輸入。"
                    note="輸入錯誤時顯示"
                  />
                }
              />

              <Section
                icon={<ShieldAlert className="w-5 h-5" />}
                tone="red"
                title="最大錯誤次數"
                description={`${isConfirm ? "管理員拒絕驗證碼" : "提交驗證碼被判定錯誤"}與驗證碼過期會計入次數，管理員確認超時不計入。達到上限後顯示右側提示，並禁止員工再次發送與提交驗證碼。開啟測試模式或切換驗證方式時次數會歸零，只修改其他設定不會。設為 0 表示不限制。`}
                param={
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">次數上限</label>
                    <NumberField value={max} min={0} max={999} unit="次" onChange={v => setCfg(c => ({ ...c, [keys.max]: v }))} />
                  </div>
                }
                prompt={
                  max > 0 ? (
                    <CustomPromptPanel
                      icon={<AlertCircle className="w-5 h-5" />}
                      tone="red"
                      title={cfg[keys.title]}
                      message={cfg[keys.message]}
                      defaultTitle="Too Many Failed Attempts"
                      defaultMessage="You have reached the maximum number of failed attempts."
                      onTitle={v => setCfg(c => ({ ...c, [keys.title]: v }))}
                      onMessage={v => setCfg(c => ({ ...c, [keys.message]: v }))}
                      note={`第 ${max} 次錯誤時顯示`}
                    />
                  ) : <OffNotice text="目前不限制錯誤次數。設定大於 0 後即可自訂上限提示。" />
                }
              />

              <Section
                icon={<Clock className="w-5 h-5" />}
                tone="amber"
                title="驗證碼有效時間"
                description={`員工按下發送驗證碼後開始計時，時間到了仍未提交驗證碼，畫面會立即彈出「驗證碼已過期」提示，員工需重新發送。過期會計入錯誤次數。最少 ${MIN_EXPIRY_SECONDS} 秒；設為 0 表示驗證碼不會過期，也不會彈出此提示。`}
                param={
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">有效時間</label>
                    <NumberField value={expiry} min={0} max={3600} unit="秒" onChange={v => setCfg(c => ({ ...c, [keys.expiry]: v }))} />
                  </div>
                }
                prompt={
                  expiry > 0 ? (
                    <DefaultPromptPanel
                      icon={<Clock className="w-5 h-5" />}
                      tone="amber"
                      title="Verification Code Expired"
                      message="Your verification code has expired. Please request a new code."
                      zhTitle="驗證碼已過期"
                      zhMessage="您的驗證碼已過期，請重新獲取驗證碼。"
                      note={`發送後 ${expiry} 秒未提交時顯示`}
                    />
                  ) : <OffNotice text="目前不限制有效時間，不會顯示過期提示。" />
                }
              />

              <Section
                icon={<Send className="w-5 h-5" />}
                tone="blue"
                title="發送次數限制"
                description={`每筆交易最多可發送的驗證碼次數（包含超時或錯誤後重新發送）。達到上限後員工無法再發送，再按發送時會看到右側警告。開啟測試模式或切換驗證方式時次數會歸零。測試模式關閉時此限制不生效。設為 0 表示不限制。`}
                param={
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">最高發送次數</label>
                    <NumberField value={limit.max_sends} min={0} max={999} unit="次" onChange={v => setLimit(c => ({ ...c, max_sends: v }))} />
                  </div>
                }
                prompt={
                  limit.max_sends > 0 ? (
                    <CustomPromptPanel
                      icon={<Send className="w-5 h-5" />}
                      tone="blue"
                      title={limit.warning_title}
                      message={limit.warning_message}
                      defaultTitle="Verification Limit Reached"
                      defaultMessage="You have reached the maximum number of verification code requests."
                      onTitle={v => setLimit(c => ({ ...c, warning_title: v }))}
                      onMessage={v => setLimit(c => ({ ...c, warning_message: v }))}
                      note={`已發送 ${limit.max_sends} 次後再發送時顯示`}
                    />
                  ) : <OffNotice text="目前不限制發送次數。設定大於 0 後即可自訂警告內容。" />
                }
              />

              {isConfirm && (
                <Section
                  icon={<UserCheck className="w-5 h-5" />}
                  tone="green"
                  title="管理員確認超時"
                  description="員工提交驗證碼後，管理員需在限定時間內確認或拒絕。超時後這次提交自動作廢並顯示右側提示，員工可重新發送驗證碼再提交。超時不計入錯誤次數。"
                  param={
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">確認時限</label>
                      <NumberField value={cfg.timeout_seconds} min={1} max={600} unit="秒" onChange={v => setCfg(c => ({ ...c, timeout_seconds: v }))} />
                    </div>
                  }
                  prompt={
                    <CustomPromptPanel
                      icon={<Clock className="w-5 h-5" />}
                      tone="green"
                      title={cfg.timeout_title}
                      message={cfg.timeout_message}
                      defaultTitle="Confirmation Timed Out"
                      defaultMessage="The admin did not confirm the code within the allowed time."
                      onTitle={v => setCfg(c => ({ ...c, timeout_title: v }))}
                      onMessage={v => setCfg(c => ({ ...c, timeout_message: v }))}
                      note={`${cfg.timeout_seconds} 秒未確認時顯示`}
                    />
                  }
                />
              )}
            </fieldset>
          </div>
        )}
      </div>
    </div>
  );
}
