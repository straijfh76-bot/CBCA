import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, Bell, Plus, LogOut, Trash2, X, AlertCircle, Check,
  ToggleLeft, ToggleRight, Edit2, Save, ChevronDown, ChevronUp, ArrowLeft, RotateCcw,
} from "lucide-react";
import { adminGetNotifications, adminCreateNotification, adminUpdateNotification, adminDeleteNotification, adminResetNotificationRead } from "../../lib/api";
import type { AdminNotification } from "../../lib/types";

function useAdminAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("cbca_admin_token") || "";
  useEffect(() => { if (!token) navigate("/"); }, [token, navigate]);
  return token;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Toast({ message, type, onClose }: { message: string; type: "error" | "success"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl max-w-sm w-full mx-4 ${type === "error" ? "bg-red-600" : "bg-green-600"}`}>
      {type === "error" ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="p-0.5 hover:bg-white/20 rounded transition"><X className="w-4 h-4" /></button>
    </div>
  );
}

const EMPTY_FORM = { title: "", content: "", mode: "popup" as "popup" | "banner", is_fixed: false };

export default function AdminNotificationsPage() {
  useAdminAuth();
  const navigate = useNavigate();
  const role = localStorage.getItem("cbca_admin_role");

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function showToast(message: string, type: "error" | "success" = "error") {
    setToast({ message, type });
  }

  function handleLogout() {
    localStorage.removeItem("cbca_admin_token");
    localStorage.removeItem("cbca_admin_role");
    localStorage.removeItem("cbca_admin_username");
    navigate("/");
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetNotifications();
      setNotifications(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return showToast("標題和內容為必填");
    setSubmitting(true);
    try {
      const n = await adminCreateNotification(form);
      setNotifications((prev) => [n, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      showToast("通知已建立", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "建立失敗");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(n: AdminNotification) {
    try {
      const updated = await adminUpdateNotification(n.id, { is_active: !n.is_active });
      setNotifications((prev) => prev.map((x) => x.id === n.id ? updated : x));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "更新失敗");
    }
  }

  async function handleToggleFixed(n: AdminNotification) {
    try {
      const updated = await adminUpdateNotification(n.id, { is_fixed: !n.is_fixed });
      setNotifications((prev) => prev.map((x) => x.id === n.id ? updated : x));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "更新失敗");
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.title.trim() || !editForm.content.trim()) return showToast("標題和內容為必填");
    try {
      const updated = await adminUpdateNotification(id, { title: editForm.title, content: editForm.content });
      setNotifications((prev) => prev.map((x) => x.id === id ? updated : x));
      setEditingId(null);
      showToast("已儲存", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "儲存失敗");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await adminDeleteNotification(id);
      setNotifications((prev) => prev.filter((x) => x.id !== id));
      showToast("已刪除", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleResend(n: AdminNotification) {
    try {
      // Single PATCH: activate + reset read_at so recipients see the popup again
      const updated = await adminUpdateNotification(n.id, { is_active: true, read_at: null });
      setNotifications((prev) => prev.map((x) => x.id === n.id ? updated : x));
      showToast("已重新發送通知", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "重新發送失敗");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#0A2B5E] text-white shadow-xl border-b border-[#1a3f7a]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-2 border-[#C8992A]/70" />
              <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-[#1a4080] to-[#0A2B5E] flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-widest text-white">CBCA 管理後台</div>
              <div className="text-[10px] text-blue-300 tracking-wide">通知管理</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin/dashboard")} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition">
              <ArrowLeft className="w-4 h-4" />
              總覽
            </button>
            {role === "super" && (
              <button onClick={() => navigate("/admin/users")} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition">
                管理管理員
              </button>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition">
              <LogOut className="w-4 h-4" />
              登出
            </button>
          </div>
        </div>
        <div className="h-[2px] bg-gradient-to-r from-[#C8992A] via-[#e8b84b] to-[#C8992A]" />
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A2B5E] flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">通知</h1>
              <p className="text-xs text-gray-500">管理員工通知 — 彈窗與橫幅模式</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow"
          >
            <Plus className="w-4 h-4" />
            新通知
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">建立通知</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">標題</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="通知標題"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2B5E]/20 focus:border-[#0A2B5E]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">內容</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="通知內容..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0A2B5E]/20 focus:border-[#0A2B5E]"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">模式</label>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as "popup" | "banner", is_fixed: e.target.value === "popup" ? false : f.is_fixed }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2B5E]/20 focus:border-[#0A2B5E]"
                  >
                    <option value="popup">彈窗 — 每次登入時顯示一次</option>
                    <option value="banner">橫幅 — 顯示於 KYC 表單頂部</option>
                  </select>
                </div>
                {form.mode === "banner" && (
                  <div className="sm:w-64">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">固定顯示</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { value: true, label: "始終顯示於 KYC 表單", desc: "釘選 — 每次皆可見" },
                        { value: false, label: "未固定", desc: "僅在啟用時顯示" },
                      ].map(({ value, label, desc }) => (
                        <label
                          key={String(value)}
                          className={`flex items-start gap-3 border rounded-xl px-3 py-2.5 cursor-pointer transition ${form.is_fixed === value ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                        >
                          <input
                            type="radio"
                            name="is_fixed"
                            checked={form.is_fixed === value}
                            onChange={() => setForm((f) => ({ ...f, is_fixed: value }))}
                            className="mt-0.5 accent-green-600 flex-shrink-0"
                          />
                          <div>
                            <div className={`text-xs font-semibold ${form.is_fixed === value ? "text-green-800" : "text-gray-700"}`}>{label}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0A2B5E] hover:bg-[#1E3A8A] disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow"
                >
                  {submitting ? "建立中…" : "建立"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notifications list */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">載入中…</div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center text-gray-400">
              <Bell className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">尚無通知。請先在上方建立一則。</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${n.is_active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                <div className="px-5 py-4 flex items-start gap-4">
                  {/* Mode badge */}
                  <div className={`flex-shrink-0 mt-0.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wide ${n.mode === "popup" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                    {n.mode === "popup" ? "彈窗" : "橫幅"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {editingId === n.id ? (
                      <div className="space-y-2">
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2B5E]/20 focus:border-[#0A2B5E]"
                        />
                        <textarea
                          value={editForm.content}
                          onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                          rows={3}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0A2B5E]/20 focus:border-[#0A2B5E]"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900 truncate">{n.title}</span>
                          {n.is_fixed && n.mode === "banner" && (
                            <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">固定顯示</span>
                          )}
                        </div>
                        <p
                          className={`text-xs text-gray-500 leading-relaxed whitespace-pre-wrap ${expandedId !== n.id ? "line-clamp-2" : ""}`}
                        >
                          {n.content}
                        </p>
                        {n.content.length > 100 && (
                          <button
                            onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                            className="flex items-center gap-0.5 text-[11px] text-blue-500 hover:text-blue-700 mt-1 transition"
                          >
                            {expandedId === n.id ? <><ChevronUp className="w-3 h-3" />收合</> : <><ChevronDown className="w-3 h-3" />展開</>}
                          </button>
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-400">{formatDate(n.created_at)}</span>
                      {n.created_by_admin && <span className="text-[10px] text-gray-400">由 {n.created_by_admin}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleActive(n)}
                      title={n.is_active ? "停用" : "啟用"}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${n.is_active ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                    >
                      {n.is_active ? <><ToggleRight className="w-4 h-4" />啟用</> : <><ToggleLeft className="w-4 h-4" />關閉</>}
                    </button>

                    {/* Fixed toggle (banner only) */}
                    {n.mode === "banner" && (
                      <button
                        onClick={() => handleToggleFixed(n)}
                        title={n.is_fixed ? "取消固定" : "設定固定顯示"}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${n.is_fixed ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                      >
                        固定
                      </button>
                    )}

                    {/* Edit / Save */}
                    {editingId === n.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(n.id)}
                          className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition"
                          title="儲存"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition"
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setEditingId(n.id); setEditForm({ title: n.title, content: n.content }); }}
                        className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(n.id)}
                      disabled={deletingId === n.id}
                      className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 disabled:opacity-50 transition"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Resend */}
                    <button
                      onClick={() => handleResend(n)}
                      title="重新發送（自動啟用並重置已讀）"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      重新發送
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
