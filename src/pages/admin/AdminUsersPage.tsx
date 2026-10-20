import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, ArrowLeft, Plus, UserCheck, UserX, KeyRound,
  AlertCircle, Check, X, RefreshCw, Users
} from "lucide-react";
import {
  adminGetSubAdmins, adminCreateSubAdmin,
  adminToggleSubAdmin, adminResetSubAdminPassword
} from "../../lib/api";
import type { AdminUser } from "../../lib/types";

function useAdminAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("cbca_admin_token") || "";
  const role = localStorage.getItem("cbca_admin_role") || "";
  useEffect(() => {
    if (!token) navigate("/");
    else if (role !== "super") navigate("/admin/dashboard");
  }, [token, role, navigate]);
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  useAdminAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  // Feedback
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  function showFeedback(msg: string, ok: boolean) {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  }

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminGetSubAdmins();
      setAdmins(list);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      await adminCreateSubAdmin(newUsername.trim(), newPassword);
      setNewUsername("");
      setNewPassword("");
      setShowCreate(false);
      showFeedback(`次級管理員「${newUsername.trim()}」建立成功。`, true);
      fetchAdmins();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "建立管理員失敗。");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(username: string, currentActive: boolean) {
    try {
      await adminToggleSubAdmin(username, !currentActive);
      showFeedback(`「${username}」已${!currentActive ? "啟用" : "停用"}。`, true);
      fetchAdmins();
    } catch (err: unknown) {
      showFeedback(err instanceof Error ? err.message : "更新失敗。", false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError("");
    setResetting(true);
    try {
      await adminResetSubAdminPassword(resetTarget, resetPassword);
      setResetTarget(null);
      setResetPassword("");
      showFeedback(`「${resetTarget}」的密碼已重設。`, true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "重設密碼失敗。");
    } finally {
      setResetting(false);
    }
  }

  const subAdmins = admins.filter(a => a.role === "sub");
  const superAdmins = admins.filter(a => a.role === "super");

  return (
    <div className="min-h-screen bg-gray-50" translate="no">
      {/* Header */}
      <header className="bg-[#0A2B5E] text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard")} className="p-1.5 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#0A2B5E]" />
          </div>
          <div>
            <div className="font-bold text-sm">管理員帳號管理</div>
            <div className="text-[10px] text-blue-200">僅限超級管理員</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={fetchAdmins} className="p-1.5 hover:bg-white/10 rounded-lg transition" title="重新整理">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Feedback toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${feedback.ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {feedback.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Super Admins (read-only display) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-[#0A2B5E]">超級管理員</h2>
            <span className="ml-auto text-xs text-gray-400">{superAdmins.length} 個帳號</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-5 h-5 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">使用者名稱</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">角色</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">建立時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {superAdmins.map(a => (
                  <tr key={a.id}>
                    <td className="px-6 py-3 font-mono text-sm font-semibold text-[#0A2B5E]">{a.username}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
                        <Shield className="w-3 h-3" />
                        超級管理員
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString("zh-TW")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Sub-Admins */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1E3A8A]" />
            <h2 className="font-semibold text-[#0A2B5E]">次級管理員</h2>
            <span className="ml-auto text-xs text-gray-400">{subAdmins.length} 個帳號</span>
            <button
              onClick={() => { setShowCreate(v => !v); setCreateError(""); }}
              className="ml-2 flex items-center gap-1.5 bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              新增次級管理員
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="px-6 py-5 bg-blue-50 border-b border-blue-100">
              <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">使用者名稱</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="例如：operator01"
                    minLength={3}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">密碼</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="至少 6 個字元"
                    minLength={6}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2 pt-5">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
                  >
                    {creating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                    建立
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setCreateError(""); }}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm px-3 py-2 rounded-lg border border-gray-200 transition"
                  >
                    <X className="w-4 h-4" />
                    取消
                  </button>
                </div>
              </form>
              {createError && (
                <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-5 h-5 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
            </div>
          ) : subAdmins.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">尚無次級管理員。請在上方建立一位。</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">使用者名稱</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">狀態</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">建立者</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">建立時間</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subAdmins.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-3 font-mono text-sm font-semibold text-[#0A2B5E]">{a.username}</td>
                    <td className="px-6 py-3">
                      {a.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          啟用中
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                          已停用
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500 font-mono">{a.created_by || "—"}</td>
                    <td className="px-6 py-3 text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString("zh-TW")}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(a.username, a.is_active)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                            a.is_active
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                          title={a.is_active ? "停用帳號" : "啟用帳號"}
                        >
                          {a.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          {a.is_active ? "停用" : "啟用"}
                        </button>
                        <button
                          onClick={() => { setResetTarget(a.username); setResetPassword(""); setResetError(""); }}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-[#1E3A8A] hover:bg-blue-100 transition"
                          title="重設密碼"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          重設密碼
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-[#0A2B5E] text-lg mb-1">重設密碼</h3>
            <p className="text-gray-500 text-sm mb-5">
              為 <span className="font-mono font-semibold text-[#1E3A8A]">{resetTarget}</span> 設定新密碼。
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">新密碼</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="至少 6 個字元"
                  minLength={6}
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
                />
              </div>
              {resetError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {resetError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
                >
                  {resetting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {resetting ? "儲存中..." : "儲存密碼"}
                </button>
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
