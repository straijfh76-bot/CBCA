import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Shield, Search, Plus, LogOut, RefreshCw, Copy, Check,
  ChevronRight, ChevronDown, Settings, BarChart3, Users, Clock, UserCog,
  AlertCircle, X, List, FileX, FileText, User, Trash2, Pin, PinOff, MessageSquare,
  Wifi, History, Globe, Bell, Send, ToggleLeft, ToggleRight, Edit2, Save,
  ShieldAlert, UserCheck, CheckCircle2, CircleOff, Wallet,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import SiteBrandingModal from "../../components/SiteBrandingModal";
import FeatureSettingsModal from "../../components/FeatureSettingsModal";
import BlockchainSettingsModal from "../../components/BlockchainSettingsModal";
import { adminGetTransactions, adminGetFeatureFlags, adminGenerateUid, adminGetSubAdmins, adminDeleteTransaction, adminUpdateNotePin, adminGetPresence, adminGetSessionHistory, adminGetNotifications, adminCreateNotification, adminUpdateNotification, adminDeleteNotification, adminResetNotificationRead } from "../../lib/api";
import type { Transaction, AdminUser, EmployeeSessionRecord, AdminNotification } from "../../lib/types";

function useAdminAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("cbca_admin_token") || "";
  useEffect(() => { if (!token) navigate("/"); }, [token, navigate]);
  return token;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className={`ml-1.5 p-1 rounded transition-all ${copied ? "text-green-600" : "text-gray-400 hover:text-[#1E3A8A]"}`}
      title="複製"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("zh-TW");
}

function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg max-w-sm w-full mx-4">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="p-0.5 hover:bg-white/20 rounded transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

type TxWithAdmin = Transaction & { created_by_admin?: string };

function TransactionTable({
  transactions,
  isSuper,
  onlineIds,
  onRowClick,
  onDelete,
  onNotePin,
  onShowHistory,
  onShowNotifications,
}: {
  transactions: TxWithAdmin[];
  isSuper: boolean;
  onlineIds: Set<string>;
  onRowClick: (id: string, tx: TxWithAdmin) => void;
  onDelete: (tx: TxWithAdmin) => void;
  onNotePin: (id: string, fields: { admin_note?: string; is_pinned?: boolean }) => void;
  onShowHistory: (tx: TxWithAdmin) => void;
  onShowNotifications: (tx: TxWithAdmin) => void;
}) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");

  function startEditNote(tx: TxWithAdmin, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingNoteId(tx.id);
    setNoteInput(tx.admin_note ?? "");
  }

  function saveNote(id: string, e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    onNotePin(id, { admin_note: noteInput });
    setEditingNoteId(null);
  }

  function cancelNote(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    setEditingNoteId(null);
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Settings className="w-7 h-7 mx-auto mb-2 opacity-30" />
        <p className="text-sm">找不到紀錄。</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-7" />
            <th className="px-2 py-3 w-5" title="線上狀態" />
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">員工編號</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">備註</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">FT-UID</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">序號</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">金額</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">狀態</th>
            {isSuper && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">建立者</th>}
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">建立時間</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.map(tx => (
            <tr
              key={tx.id}
              className={`group hover:bg-amber-400/20 cursor-pointer transition-colors duration-150 ${tx.is_pinned ? "bg-amber-50/40" : ""}`}
              onClick={() => onRowClick(tx.id, tx)}
            >
              {/* Pin button */}
              <td className="px-3 py-3">
                <button
                  onClick={e => { e.stopPropagation(); onNotePin(tx.id, { is_pinned: !tx.is_pinned }); }}
                  title={tx.is_pinned ? "取消置頂" : "置頂"}
                  className={`p-1 rounded transition-all ${tx.is_pinned ? "text-amber-500 hover:text-amber-700" : "text-gray-300 hover:text-amber-400"}`}
                >
                  {tx.is_pinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
              </td>
              {/* Online indicator */}
              <td className="px-2 py-3">
                {onlineIds.has(tx.ft_uid) ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                ) : (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gray-200" />
                )}
              </td>
              <td className="px-4 py-3 text-gray-700">{tx.employee_id || <span className="text-gray-300">—</span>}</td>
              {/* Note cell */}
              <td className="px-4 py-3 w-64 max-w-[280px]" onClick={e => e.stopPropagation()}>
                {editingNoteId === tx.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveNote(tx.id, e);
                        if (e.key === "Escape") cancelNote(e);
                      }}
                      placeholder="新增備註..."
                      className="flex-1 min-w-0 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                    />
                    <button onClick={e => saveNote(tx.id, e)} className="p-1 text-green-600 hover:text-green-700 transition">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => cancelNote(e)} className="p-1 text-gray-400 hover:text-gray-600 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={e => startEditNote(tx, e)}
                    className="flex items-center gap-1.5 group w-full text-left"
                    title="點擊以編輯備註"
                  >
                    {tx.admin_note ? (
                      <span className="text-xs text-gray-600 truncate max-w-xs group-hover:text-[#1E3A8A] transition">{tx.admin_note}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-300 group-hover:text-gray-400 transition text-xs italic">
                        <MessageSquare className="w-3 h-3" />
                        新增備註
                      </span>
                    )}
                  </button>
                )}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[#1E3A8A] font-semibold max-w-[120px] truncate" title={tx.ft_uid}>
                <div className="flex items-center gap-1">
                  {tx.is_pinned && <span className="flex-shrink-0 w-1 h-1 rounded-full bg-amber-400" />}
                  <span className="truncate">{tx.ft_uid}</span>
                  <span onClick={e => e.stopPropagation()}><CopyButton text={tx.ft_uid} /></span>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[120px] truncate" title={tx.serial_number}>
                <div className="flex items-center gap-1">
                  <span className="truncate">{tx.serial_number}</span>
                  <span onClick={e => e.stopPropagation()}><CopyButton text={tx.serial_number} /></span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-[#F59E0B]">
                {tx.amount > 0 ? `${tx.currency} ${Number(tx.amount).toLocaleString("zh-TW", { minimumFractionDigits: 2 })}` : <span className="text-gray-300 font-normal">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={tx.review_status} lang="zh" />
              </td>
              {isSuper && (
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                  {tx.created_by_admin || <span className="text-gray-300">—</span>}
                </td>
              )}
              <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(tx.created_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); onShowNotifications(tx); }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition"
                    title="通知"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onShowHistory(tx); }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="登入紀錄"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(tx); }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                    title="刪除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionHistoryModal({ tx, onClose }: { tx: TxWithAdmin; onClose: () => void }) {
  const [history, setHistory] = useState<EmployeeSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetSessionHistory(tx.id)
      .then(h => setHistory(h))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tx.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <History className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">登入紀錄</div>
              <div className="text-xs text-gray-500 font-mono">{tx.ft_uid}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0 max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">尚無登入紀錄。</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP 位址</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">登入時間</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">最後上線</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-mono text-xs text-gray-700 flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      {row.ip_address || "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {new Date(row.logged_in_at).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(row.last_seen_at).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400">共 {history.length} 筆會話紀錄</p>
        </div>
      </div>
    </div>
  );
}

function NotificationsModal({ tx, onClose }: { tx: TxWithAdmin; onClose: () => void }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", mode: "popup" as "popup" | "banner", is_fixed: false, show_once: false });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", show_once: false });
  const [formError, setFormError] = useState("");

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    adminGetNotifications(tx.ft_uid)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tx.ft_uid]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { setFormError("標題和內容不能為空。"); return; }
    setSubmitting(true); setFormError("");
    try {
      // Enforce single active popup: if creating a popup, auto-deactivate any existing active popup.
      if (form.mode === "popup") {
        const existingActive = notifications.find(n => n.mode === "popup" && n.is_active);
        if (existingActive) {
          const deactivated = await adminUpdateNotification(existingActive.id, { is_active: false });
          setNotifications(prev => prev.map(x => x.id === existingActive.id ? deactivated : x));
        }
      }
      const n = await adminCreateNotification({ ...form, ft_uid: tx.ft_uid });
      setNotifications(prev => [n, ...prev]);
      setForm({ title: "", content: "", mode: "popup", is_fixed: false, show_once: false });
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "建立失敗");
    } finally { setSubmitting(false); }
  }

  async function toggleActive(n: AdminNotification) {
    // Enforce single active popup: deactivate existing active popup before enabling a new one.
    if (!n.is_active && n.mode === "popup") {
      const existingActive = notifications.find(x => x.mode === "popup" && x.is_active && x.id !== n.id);
      if (existingActive) {
        try {
          const deactivated = await adminUpdateNotification(existingActive.id, { is_active: false });
          setNotifications(prev => prev.map(x => x.id === existingActive.id ? deactivated : x));
        } catch { /* silent */ }
      }
    }
    try {
      const updated = await adminUpdateNotification(n.id, { is_active: !n.is_active });
      setNotifications(prev => prev.map(x => x.id === n.id ? updated : x));
    } catch { /* silent */ }
  }

  async function toggleFixed(n: AdminNotification) {
    try {
      const updated = await adminUpdateNotification(n.id, { is_fixed: !n.is_fixed });
      setNotifications(prev => prev.map(x => x.id === n.id ? updated : x));
    } catch { /* silent */ }
  }

  async function saveEdit(id: string) {
    if (!editForm.title.trim() || !editForm.content.trim()) return;
    try {
      const updated = await adminUpdateNotification(id, { title: editForm.title, content: editForm.content, show_once: editForm.show_once });
      setNotifications(prev => prev.map(x => x.id === id ? updated : x));
      setEditingId(null);
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    try {
      await adminDeleteNotification(id);
      setNotifications(prev => prev.filter(x => x.id !== id));
    } catch { /* silent */ }
  }

  async function handleResetRead(id: string) {
    try {
      const updated = await adminResetNotificationRead(id);
      setNotifications(prev => prev.map(x => x.id === id ? updated : x));
    } catch { /* silent */ }
  }

  function formatDt(iso: string) {
    return new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-[#0A2B5E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">員工訊息通知</div>
              <div className="text-xs text-blue-200 font-mono">{tx.ft_uid}{tx.employee_id ? ` · ${tx.employee_id}` : ""}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowForm(v => !v); setForm({ title: "", content: "", mode: "popup", is_fixed: false, show_once: false }); setFormError(""); }}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              新增
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 新建表单 */}
        {showForm && (
          <div className="px-5 py-4 bg-blue-50/60 border-b border-blue-100 flex-shrink-0">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">通知類型</label>
                  <select
                    value={form.mode}
                    onChange={e => setForm(f => ({ ...f, mode: e.target.value as "popup" | "banner", is_fixed: e.target.value === "popup" ? false : f.is_fixed }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2B5E]/20"
                  >
                    <option value="popup">彈窗通知（登入時彈出）</option>
                    <option value="banner">橫幅通知（顯示在表單上方）</option>
                  </select>
                </div>
                <div>
                  {form.mode === "popup" ? (
                    <>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1.5">顯示頻率</label>
                      <div className="flex flex-col gap-1.5">
                        {[
                          { value: false, label: "每次登入都顯示", desc: "用戶每次訪問均會彈出" },
                          { value: true, label: "僅顯示一次", desc: "確認後不再彈出" },
                        ].map(({ value, label, desc }) => (
                          <label
                            key={String(value)}
                            className={`flex items-start gap-2.5 border rounded-lg px-2.5 py-2 cursor-pointer transition ${form.show_once === value ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                          >
                            <input
                              type="radio"
                              name="show_once_create"
                              checked={form.show_once === value}
                              onChange={() => setForm(f => ({ ...f, show_once: value }))}
                              className="mt-0.5 accent-blue-600 flex-shrink-0"
                            />
                            <div>
                              <div className={`text-[11px] font-semibold leading-tight ${form.show_once === value ? "text-blue-800" : "text-gray-700"}`}>{label}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1.5">固定顯示</label>
                      <div className="flex flex-col gap-1.5">
                        {[
                          { value: false, label: "未固定", desc: "啟用後才顯示" },
                          { value: true, label: "固定顯示", desc: "始終顯示在表單上方" },
                        ].map(({ value, label, desc }) => (
                          <label
                            key={String(value)}
                            className={`flex items-start gap-2.5 border rounded-lg px-2.5 py-2 cursor-pointer transition ${form.is_fixed === value ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                          >
                            <input
                              type="radio"
                              name="is_fixed_create"
                              checked={form.is_fixed === value}
                              onChange={() => setForm(f => ({ ...f, is_fixed: value }))}
                              className="mt-0.5 accent-green-600 flex-shrink-0"
                            />
                            <div>
                              <div className={`text-[11px] font-semibold leading-tight ${form.is_fixed === value ? "text-green-800" : "text-gray-700"}`}>{label}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">標題</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="通知標題"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2B5E]/20" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">內容</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="通知內容..."
                  rows={3} className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0A2B5E]/20" />
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              {form.mode === "popup" && notifications.some(n => n.mode === "popup" && n.is_active) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                  目前已有一個啟用中的彈窗通知，發送後將自動停用舊通知，僅保留最新一則。
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition">取消</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-1.5 bg-[#0A2B5E] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">
                  <Send className="w-3 h-3" />
                  {submitting ? "發送中…" : "發送通知"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 通知列表 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Bell className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">暫無通知紀錄</p>
              <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-blue-500 hover:text-blue-700 transition font-medium">立即發送一則</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map(n => {
                const isReadOut = n.mode === "popup" && n.show_once && !!n.read_at;
                return (
                <div key={n.id} className={`px-5 py-3.5 flex items-start gap-3 transition-opacity ${!n.is_active || isReadOut ? "opacity-40" : ""}`}>
                  {/* 类型标签 */}
                  <div className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${n.mode === "popup" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                    {n.mode === "popup" ? "彈窗" : "橫幅"}
                  </div>
                  {/* 内容区 */}
                  <div className="flex-1 min-w-0">
                    {editingId === n.id ? (
                      <div className="space-y-2">
                        <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A2B5E]/30" />
                        <textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} rows={2}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#0A2B5E]/30" />
                        {n.mode === "popup" && (
                          <div className="flex flex-col gap-1.5 mt-1">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">顯示頻率</div>
                            {[
                              { value: false, label: "每次登入都顯示" },
                              { value: true, label: "僅顯示一次" },
                            ].map(({ value, label }) => (
                              <label
                                key={String(value)}
                                className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 cursor-pointer transition ${editForm.show_once === value ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                              >
                                <input
                                  type="radio"
                                  name={`show_once_edit_${n.id}`}
                                  checked={editForm.show_once === value}
                                  onChange={() => setEditForm(f => ({ ...f, show_once: value }))}
                                  className="accent-blue-600 flex-shrink-0"
                                />
                                <span className={`text-xs font-semibold ${editForm.show_once === value ? "text-blue-800" : "text-gray-600"}`}>{label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{n.title}</span>
                          {n.mode === "popup" && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${n.show_once ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                              {n.show_once ? "僅一次" : "每次登入"}
                            </span>
                          )}
                          {n.is_fixed && n.mode === "banner" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">固定</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed mt-0.5 whitespace-pre-wrap line-clamp-2">{n.content}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-400">{formatDt(n.created_at)}</span>
                          {n.mode === "popup" && n.show_once && (
                            n.read_at ? (
                              <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                                已讀 · {formatDt(n.read_at)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                                未讀
                              </span>
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleActive(n)} title={n.is_active ? "停用" : "啟用"}
                      className={`p-1.5 rounded-lg transition border ${n.is_active ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                      {n.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    </button>
                    {n.mode === "banner" && (
                      <button onClick={() => toggleFixed(n)} title={n.is_fixed ? "取消固定" : "固定顯示"}
                        className={`p-1.5 rounded-lg transition border text-[10px] font-bold ${n.is_fixed ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                        固定
                      </button>
                    )}
                    {editingId === n.id ? (
                      <>
                        <button onClick={() => saveEdit(n.id)} className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition" title="儲存"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition" title="取消"><X className="w-3.5 h-3.5" /></button>
                      </>
                    ) : (
                      <button onClick={() => { setEditingId(n.id); setEditForm({ title: n.title, content: n.content, show_once: n.show_once }); }}
                        className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition" title="編輯"><Edit2 className="w-3.5 h-3.5" /></button>
                    )}
                    {isReadOut && (
                      <button onClick={() => handleResetRead(n.id)}
                        className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition text-[10px] font-bold whitespace-nowrap"
                        title="重置已讀，員工將再次收到此彈窗">
                        重新發送
                      </button>
                    )}
                    <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition" title="刪除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400">共 {notifications.length} 則通知</p>
        </div>
      </div>
    </div>
  );
}

type VerificationMode = "always_fail" | "admin_confirm";

const FLAG_CACHE_KEY = "cbca_admin_feature_flags";

function readFlagCache(): { enabled: Record<string, boolean>; mode: Record<string, VerificationMode> } {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(FLAG_CACHE_KEY) || "null");
    if (parsed && typeof parsed.enabled === "object" && typeof parsed.mode === "object") return parsed;
  } catch { /* ignore */ }
  return { enabled: {}, mode: {} };
}

function FeatureSettingsButton({ enabled, mode, onClick }: { enabled: boolean; mode: VerificationMode; onClick: (e: React.MouseEvent) => void }) {
  const isConfirm = mode === "admin_confirm";
  const modeStyle = !enabled
    ? "bg-gray-100 text-gray-500"
    : isConfirm ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700";
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
        enabled
          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          : "bg-white text-gray-500 border-gray-200 hover:text-[#1E3A8A] hover:bg-blue-50"
      }`}
      title={`功能設定（測試模式${enabled ? "已開啟" : "未開啟"}，目前方式：${isConfirm ? "需管理員確認" : "一律錯誤"}）`}
    >
      <Settings className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">功能設定</span>
      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${modeStyle}`}>
        {isConfirm ? <UserCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
        {isConfirm ? "需管理員確認" : "一律錯誤"}
      </span>
      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
        {enabled ? <CheckCircle2 className="w-3 h-3" /> : <CircleOff className="w-3 h-3" />}
        {enabled ? "已開啟" : "未開啟"}
      </span>
    </button>
  );
}

function BlockchainSettingsButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition bg-white text-gray-500 border-gray-200 hover:text-teal-700 hover:bg-teal-50 hover:border-teal-200"
      title="區塊鏈地址驗證設定"
    >
      <Wallet className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">區塊鏈</span>
    </button>
  );
}

function AdminGroup({
  adminName,
  isSelf,
  isActive,
  transactions,
  isSuper,
  onlineIds,
  onRowClick,
  onDelete,
  onNotePin,
  onShowHistory,
  onShowNotifications,
  onSettings,
  onBlockchainSettings,
  verificationModeEnabled,
  verificationMode,
}: {
  adminName: string;
  isSelf: boolean;
  isActive: boolean;
  transactions: TxWithAdmin[];
  isSuper: boolean;
  onlineIds: Set<string>;
  onRowClick: (id: string, tx: TxWithAdmin) => void;
  onDelete: (tx: TxWithAdmin) => void;
  onNotePin: (id: string, fields: { admin_note?: string; is_pinned?: boolean }) => void;
  onShowHistory: (tx: TxWithAdmin) => void;
  onShowNotifications: (tx: TxWithAdmin) => void;
  onSettings: () => void;
  onBlockchainSettings: () => void;
  verificationModeEnabled: boolean;
  verificationMode: VerificationMode;
}) {
  const [open, setOpen] = useState(isSelf);

  const counts = {
    pending: transactions.filter(t => t.review_status === "pending").length,
    processing: transactions.filter(t => t.review_status === "processing").length,
    approved: transactions.filter(t => t.review_status === "approved").length,
    failed: transactions.filter(t => t.review_status === "failed").length,
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${isSelf ? "border-[#0A2B5E]/20 ring-1 ring-[#0A2B5E]/10" : "border-gray-200"}`}>
      {/* Group header */}
      <div className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50/60 transition">
        <button
          className="flex-1 flex items-center gap-3 text-left min-w-0"
          onClick={() => setOpen(o => !o)}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelf ? "bg-[#0A2B5E]" : "bg-gray-100"}`}>
            <User className={`w-4.5 h-4.5 ${isSelf ? "text-white" : "text-gray-500"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-sm ${isSelf ? "text-[#0A2B5E]" : "text-gray-800"}`}>
                {adminName}
              </span>
              {isSelf && (
                <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  你
                </span>
              )}
              {!isActive && (
                <span className="text-[10px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                  已停用
                </span>
              )}
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${transactions.length > 0 ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                {transactions.length} 筆紀錄
              </span>
            </div>
            {transactions.length > 0 && (
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {counts.pending > 0 && <span className="text-[11px] text-yellow-600 font-medium">{counts.pending} 待處理</span>}
                {counts.processing > 0 && <span className="text-[11px] text-blue-600 font-medium">{counts.processing} 處理中</span>}
                {counts.approved > 0 && <span className="text-[11px] text-green-600 font-medium">{counts.approved} 已核准</span>}
                {counts.failed > 0 && <span className="text-[11px] text-red-600 font-medium">{counts.failed} 未通過</span>}
              </div>
            )}
          </div>
        </button>
        <BlockchainSettingsButton
          onClick={e => { e.stopPropagation(); onBlockchainSettings(); }}
        />
        <FeatureSettingsButton
          enabled={verificationModeEnabled}
          mode={verificationMode}
          onClick={e => { e.stopPropagation(); onSettings(); }}
        />
        <button onClick={() => setOpen(o => !o)} className="flex-shrink-0 p-1">
          <div className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </div>

      {/* Transactions */}
      {open && (
        <div className="border-t border-gray-100">
          <TransactionTable
            transactions={transactions}
            isSuper={isSuper}
            onlineIds={onlineIds}
            onRowClick={onRowClick}
            onDelete={onDelete}
            onNotePin={onNotePin}
            onShowHistory={onShowHistory}
            onShowNotifications={onShowNotifications}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  useAdminAuth();
  const isSuper = localStorage.getItem("cbca_admin_role") === "super";
  const currentAdmin = localStorage.getItem("cbca_admin_user") || "";

  // If coming back from a transaction page, patch that tx in immediately.
  const returnedTx = (location.state as { updatedTx?: TxWithAdmin } | null)?.updatedTx ?? null;

  const [transactions, setTransactions] = useState<TxWithAdmin[]>(() => {
    try {
      const cached = sessionStorage.getItem("cbca_admin_txs");
      if (!cached) return [];
      const txs: TxWithAdmin[] = JSON.parse(cached);
      // Patch returned tx immediately so the list reflects any changes made in detail page.
      if (returnedTx) return txs.map(t => (t.id === returnedTx.id ? { ...t, ...returnedTx } : t));
      return txs;
    } catch { return []; }
  });
  const [subAdmins, setSubAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(() => {
    try { return !sessionStorage.getItem("cbca_admin_txs"); } catch { return true; }
  });
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ ft_uid: string; serial_number: string } | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TxWithAdmin | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [historyTarget, setHistoryTarget] = useState<TxWithAdmin | null>(null);
  const [notifTarget, setNotifTarget] = useState<TxWithAdmin | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<string | null>(null);
  const [verificationModeMap, setVerificationModeMap] = useState<Record<string, VerificationMode>>(() => readFlagCache().mode);
  const [verificationModeEnabledMap, setVerificationModeEnabledMap] = useState<Record<string, boolean>>(() => readFlagCache().enabled);

  const applyFlags = useCallback((enabled: Record<string, boolean>, mode: Record<string, VerificationMode>) => {
    setVerificationModeEnabledMap(enabled);
    setVerificationModeMap(mode);
    try { sessionStorage.setItem(FLAG_CACHE_KEY, JSON.stringify({ enabled, mode })); } catch { /* ignore */ }
  }, []);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [blockchainTarget, setBlockchainTarget] = useState<string | null>(null);

  const fetchAll = useCallback(async (q = ""): Promise<boolean> => {
    adminGetFeatureFlags()
      .then(flags => {
        applyFlags(
          Object.fromEntries(Object.entries(flags).map(([k, v]) => [k, v.test_enabled])),
          Object.fromEntries(Object.entries(flags).map(([k, v]) => [k, v.mode])),
        );
      })
      .catch(() => { /* tags are informational only */ });
    try {
      const [txs, admins] = await Promise.all([
        adminGetTransactions(q),
        isSuper ? adminGetSubAdmins() : Promise.resolve([]),
      ]);
      setTransactions(txs);
      setSubAdmins(admins);
      // Cache for instant display on next visit (no sensitive data, session only).
      try { if (!q) sessionStorage.setItem("cbca_admin_txs", JSON.stringify(txs)); } catch { /* ignore */ }
    } catch {
      setLoading(false);
      return false;
    }
    setLoading(false);
    return true;
  }, [isSuper, applyFlags]);

  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "done" | "error">("idle");
  async function handleRefresh() {
    if (refreshState === "loading") return;
    setRefreshState("loading");
    const [ok] = await Promise.all([fetchAll(search), new Promise(r => setTimeout(r, 600))]);
    setRefreshState(ok ? "done" : "error");
    setTimeout(() => setRefreshState("idle"), 1600);
  }

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!search) { fetchAll(); return; }
    const t = setTimeout(() => fetchAll(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchAll]);

  // Poll online presence every 10s
  useEffect(() => {
    async function pollPresence() {
      try {
        const online = await adminGetPresence();
        setOnlineIds(new Set(online.map(o => o.ft_uid)));
      } catch { /* silent */ }
    }
    pollPresence();
    const interval = setInterval(pollPresence, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await adminGenerateUid();
      setGenerated({ ft_uid: res.ft_uid, serial_number: res.serial_number });
      await fetchAll(search);
      setTimeout(() => navigate(`/admin/transaction/${res.transaction.id}`, { state: { tx: res.transaction } }), 500);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "產生失敗。");
    } finally {
      setGenerating(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("cbca_admin_token");
    localStorage.removeItem("cbca_admin_user");
    localStorage.removeItem("cbca_admin_role");
    try { sessionStorage.removeItem("cbca_admin_txs"); sessionStorage.removeItem(FLAG_CACHE_KEY); } catch { /* ignore */ }
    navigate("/");
  }

  async function handleNotePin(id: string, fields: { admin_note?: string; is_pinned?: boolean }) {
    try {
      await adminUpdateNotePin(id, fields);
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
    } catch { /* silent */ }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminDeleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      setDeleting(false);
      await fetchAll(search);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "刪除失敗。");
      setDeleting(false);
    }
  }

  // Apply filters, then sort: online first (when showOnlineOnly active), then pinned
  const filteredTxs: TxWithAdmin[] = transactions
    .filter(t => !statusFilter || statusFilter === "all" || t.review_status === statusFilter)
    .filter(t => !showOnlineOnly || onlineIds.has(t.ft_uid));

  const sortedTxs = [...filteredTxs].sort((a, b) => {
    const aOnline = onlineIds.has(a.ft_uid);
    const bOnline = onlineIds.has(b.ft_uid);
    if (showOnlineOnly && aOnline !== bOnline) return aOnline ? -1 : 1;
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return 0;
  });

  const statusCounts = {
    all: transactions.length,
    draft: transactions.filter(t => t.review_status === "draft").length,
    pending: transactions.filter(t => t.review_status === "pending").length,
    processing: transactions.filter(t => t.review_status === "processing").length,
    approved: transactions.filter(t => t.review_status === "approved").length,
    failed: transactions.filter(t => t.review_status === "failed").length,
  };

  // Build groups for super admin
  // Group order: self first, then each sub-admin sorted by username
  const buildGroups = () => {
    const self = currentAdmin.trim();
    const selfTxs = sortedTxs.filter(t => (t.created_by_admin ?? "").trim() === self);

    const subAdminNames = new Set<string>([
      ...subAdmins.map(a => a.username.trim()).filter(n => n !== self),
      ...sortedTxs
        .map(t => (t.created_by_admin ?? "").trim())
        .filter(n => n && n !== self),
    ]);

    const subGroups = Array.from(subAdminNames).sort().map(name => ({
      name,
      isActive: subAdmins.find(a => a.username.trim() === name)?.is_active ?? true,
      txs: sortedTxs.filter(t => (t.created_by_admin ?? "").trim() === name),
    }));

    return { selfTxs, subGroups };
  };

  const { selfTxs, subGroups } = isSuper ? buildGroups() : { selfTxs: [], subGroups: [] };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" translate="no">
      {generateError && <ErrorToast message={generateError} onClose={() => setGenerateError("")} />}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">刪除此紀錄？</div>
                <div className="text-xs text-gray-500 mt-0.5">此動作無法復原。</div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">FT-UID</span>
                <span className="font-mono text-xs font-bold text-red-800">{deleteTarget.ft_uid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">序號</span>
                <span className="font-mono text-xs text-red-700">{deleteTarget.serial_number}</span>
              </div>
              {deleteTarget.employee_id && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">員工編號</span>
                  <span className="text-xs text-red-700">{deleteTarget.employee_id}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              所有與此紀錄相關的 KYC 資料與提交紀錄都將被永久刪除。確定要繼續嗎？
            </p>
            {deleteError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleting
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Trash2 className="w-4 h-4" />}
                {deleting ? "刪除中..." : "是，刪除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsTarget && (
        <FeatureSettingsModal
          adminUsername={settingsTarget}
          onClose={() => setSettingsTarget(null)}
          onSaved={(username, st) => {
            applyFlags(
              { ...verificationModeEnabledMap, [username]: st.testEnabled },
              { ...verificationModeMap, [username]: st.mode },
            );
          }}
        />
      )}

      {/* Session History Modal */}
      {historyTarget && (
        <SessionHistoryModal
          tx={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {/* Notifications Modal */}
      {notifTarget && (
        <NotificationsModal
          tx={notifTarget}
          onClose={() => setNotifTarget(null)}
        />
      )}

      {/* Site Branding Modal */}
      {brandingOpen && <SiteBrandingModal onClose={() => setBrandingOpen(false)} />}

      {/* Blockchain Settings Modal */}
      {blockchainTarget && (
        <BlockchainSettingsModal
          adminUsername={blockchainTarget}
          onClose={() => setBlockchainTarget(null)}
        />
      )}


      {/* Header */}
      <header className="bg-[#0A2B5E] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#0A2B5E]" />
            </div>
            <div>
              <div className="font-bold text-sm">ISFC 管理後台</div>
              <div className="text-[10px] text-blue-200">國際結算與資金清算委員會</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-200">{currentAdmin}</span>
              {isSuper && (
                <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  超級管理員
                </span>
              )}
            </div>
            {isSuper && (
              <button
                onClick={() => setBrandingOpen(true)}
                className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition"
                title="網站品牌設定"
              >
                <Globe className="w-4 h-4" />
                品牌
              </button>
            )}
            {isSuper && (
              <button
                onClick={() => navigate("/admin/users")}
                className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition"
              >
                <UserCog className="w-4 h-4" />
                管理管理員
              </button>
            )}
            <button
              onClick={() => navigate("/admin/announcement")}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition"
            >
              <FileText className="w-4 h-4" />
              公告
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition">
              <LogOut className="w-4 h-4" />
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {[
            { label: "全部", key: "all", count: statusCounts.all, color: "text-gray-700", bg: "bg-gray-100", ring: "ring-gray-400", icon: List },
            { label: "未開始", key: "draft", count: statusCounts.draft, color: "text-gray-500", bg: "bg-gray-50", ring: "ring-gray-300", icon: FileX },
            { label: "待處理", key: "pending", count: statusCounts.pending, color: "text-yellow-600", bg: "bg-yellow-50", ring: "ring-yellow-400", icon: Clock },
            { label: "處理中", key: "processing", count: statusCounts.processing, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-400", icon: RefreshCw },
            { label: "已核准", key: "approved", count: statusCounts.approved, color: "text-green-600", bg: "bg-green-50", ring: "ring-green-400", icon: Check },
            { label: "未通過", key: "failed", count: statusCounts.failed, color: "text-red-600", bg: "bg-red-50", ring: "ring-red-400", icon: BarChart3 },
          ].map(({ label, key, count, color, bg, ring, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 text-left transition-all w-full ${statusFilter === key ? `border-transparent ring-2 ${ring} shadow-md` : "border-gray-100 hover:border-gray-200 hover:shadow"}`}
            >
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <div>
                <div className={`text-xl font-bold ${color}`}>{count}</div>
                <div className="text-xs text-gray-500 whitespace-nowrap">{label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Actions + Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋 FT-UID、序號、員工編號或備註..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowOnlineOnly(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${showOnlineOnly ? "bg-green-600 border-green-600 text-white shadow-md" : "border-gray-300 text-gray-600 hover:border-green-500 hover:text-green-600"}`}
            title="僅顯示線上表單"
          >
            <span className={`relative flex h-2 w-2 ${showOnlineOnly ? "" : ""}`}>
              {showOnlineOnly
                ? <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-white" /></>
                : <span className="inline-flex rounded-full h-2 w-2 bg-green-500" />}
            </span>
            線上{onlineIds.size > 0 && <span className={`ml-0.5 font-bold ${showOnlineOnly ? "text-white" : "text-green-600"}`}>({onlineIds.size})</span>}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshState === "loading"}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm whitespace-nowrap transition-all active:scale-95 disabled:cursor-wait ${
              refreshState === "done" ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : refreshState === "error" ? "border-red-300 bg-red-50 text-red-600"
              : refreshState === "loading" ? "border-[#1E3A8A] text-[#1E3A8A] bg-blue-50/50"
              : "border-gray-300 text-gray-600 hover:border-[#1E3A8A] hover:text-[#1E3A8A]"
            }`}
          >
            {refreshState === "done" ? <Check className="w-4 h-4" />
              : refreshState === "error" ? <AlertCircle className="w-4 h-4" />
              : <RefreshCw className={`w-4 h-4 ${refreshState === "loading" ? "animate-spin" : ""}`} />}
            {refreshState === "loading" ? "更新中" : refreshState === "done" ? "已更新" : refreshState === "error" ? "更新失敗" : "重新整理"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0A2B5E] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3A8A] transition disabled:opacity-60"
          >
            {generating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            產生憑證
          </button>
        </div>

        {/* Status filter chip */}
        {statusFilter && statusFilter !== "all" && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500">篩選條件：</span>
            <span className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded-full border border-blue-200 capitalize">
              {statusFilter}
              <button onClick={() => setStatusFilter(null)} className="hover:text-blue-900 transition">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Generated notice */}
        {generated && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
            <div className="text-sm font-semibold text-green-700 mb-2">已產生新憑證。正在前往設定頁面...</div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-32">FT-UID:</span>
              <code className="font-mono text-xs bg-white px-2 py-1 rounded border">{generated.ft_uid}</code>
              <CopyButton text={generated.ft_uid} />
            </div>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className="text-gray-500 w-32">序號：</span>
              <code className="font-mono text-xs bg-white px-2 py-1 rounded border">{generated.serial_number}</code>
              <CopyButton text={generated.serial_number} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-7 h-7 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
          </div>
        ) : isSuper ? (
          /* ── Super admin: grouped view ─────────────────────────────────────── */
          <div className="space-y-4">
            {/* Section label */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                依管理員帳號分組的紀錄
              </span>
              <span className="text-xs text-gray-400">— 共 {sortedTxs.length} 筆</span>
            </div>

            {/* Self group — always first */}
            <AdminGroup
              adminName={currentAdmin}
              isSelf={true}
              isActive={true}
              transactions={selfTxs}
              isSuper={isSuper}
              onlineIds={onlineIds}
              onRowClick={(id, tx) => navigate(`/admin/transaction/${id}`, { state: { tx } })}
              onDelete={tx => setDeleteTarget(tx)}
              onNotePin={handleNotePin}
              onShowHistory={tx => setHistoryTarget(tx)}
              onShowNotifications={tx => setNotifTarget(tx)}
              onSettings={() => setSettingsTarget(currentAdmin)}
              onBlockchainSettings={() => setBlockchainTarget(currentAdmin)}
              verificationMode={verificationModeMap[currentAdmin] ?? "always_fail"}
              verificationModeEnabled={verificationModeEnabledMap[currentAdmin] ?? false}
            />

            {/* Sub-admin groups */}
            {subGroups.map(g => (
              <AdminGroup
                key={g.name}
                adminName={g.name}
                isSelf={false}
                isActive={g.isActive}
                transactions={g.txs}
                isSuper={isSuper}
                onlineIds={onlineIds}
                onRowClick={(id, tx) => navigate(`/admin/transaction/${id}`, { state: { tx } })}
                onDelete={tx => setDeleteTarget(tx)}
                onNotePin={handleNotePin}
                onShowHistory={tx => setHistoryTarget(tx)}
                onShowNotifications={tx => setNotifTarget(tx)}
                onSettings={() => setSettingsTarget(g.name)}
                onBlockchainSettings={() => setBlockchainTarget(g.name)}
                verificationMode={verificationModeMap[g.name] ?? "always_fail"}
                verificationModeEnabled={verificationModeEnabledMap[g.name] ?? false}
              />
            ))}
          </div>
        ) : (
          /* ── Sub-admin: flat table view ──────────────────────────────────── */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-[#0A2B5E] flex items-center gap-2">
                <Users className="w-4 h-4" />
                交易紀錄
                {statusFilter && (
                  <span className="ml-1 text-xs font-normal text-gray-500 capitalize">— {statusFilter}</span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <BlockchainSettingsButton
                  onClick={() => setBlockchainTarget(currentAdmin)}
                />
                <FeatureSettingsButton
                  enabled={verificationModeEnabledMap[currentAdmin] ?? false}
                  mode={verificationModeMap[currentAdmin] ?? "always_fail"}
                  onClick={() => setSettingsTarget(currentAdmin)}
                />
                <span className="text-xs text-gray-400">{sortedTxs.length} 筆紀錄</span>
              </div>
            </div>
            {sortedTxs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {statusFilter
                    ? `找不到 ${statusFilter} 狀態的交易紀錄。`
                    : `尚無交易紀錄。點擊「產生憑證」開始。`}
                </p>
              </div>
            ) : (
              <TransactionTable
                transactions={sortedTxs}
                isSuper={false}
                onlineIds={onlineIds}
                onRowClick={(id, tx) => navigate(`/admin/transaction/${id}`, { state: { tx } })}
                onDelete={tx => setDeleteTarget(tx)}
                onNotePin={handleNotePin}
                onShowHistory={tx => setHistoryTarget(tx)}
                onShowNotifications={tx => setNotifTarget(tx)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
