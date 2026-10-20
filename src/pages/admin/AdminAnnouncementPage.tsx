import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Shield, FileText, Save, Check, AlertCircle,
  Clock, User, Globe, UserCog, CheckCircle2, Timer,
} from "lucide-react";
import { adminGetAnnouncement, adminSaveAnnouncement } from "../../lib/api";
import RichTextEditor from "../../components/RichTextEditor";

function useAdminAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("cbca_admin_token") || "";
  const role = localStorage.getItem("cbca_admin_role") || "sub";
  const username = localStorage.getItem("cbca_admin_user") || "";
  useEffect(() => { if (!token) navigate("/"); }, [token, navigate]);
  return { token, role, username };
}

function ReadSecondsField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-[#1E3A8A]" />
        需閱讀時間
      </label>

      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            type="number"
            min={1}
            max={600}
            value={value}
            onChange={e => onChange(Math.max(1, Math.min(600, parseInt(e.target.value) || 1)))}
            className="w-24 px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition"
          />
          <span className="absolute right-3 text-xs text-gray-400 font-medium pointer-events-none">秒</span>
        </div>
        <p className="text-sm text-gray-500">
          員工必須等待 <strong className="text-[#0A2B5E]">{value} 秒</strong> 才能繼續。
        </p>
      </div>
    </div>
  );
}

function TimeoutMinutesField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
        <Timer className="w-3.5 h-3.5 text-[#1E3A8A]" />
        確認逾時時間
      </label>
      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            type="number"
            min={1}
            max={60}
            value={value}
            onChange={e => onChange(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
            className="w-24 px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm font-mono font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition"
          />
          <span className="absolute right-3 text-xs text-gray-400 font-medium pointer-events-none">分</span>
        </div>
        <p className="text-sm text-gray-500">
          若管理員在 <strong className="text-[#0A2B5E]">{value} 分鐘</strong> 內未回應，員工將看到逾時提示。
        </p>
      </div>
    </div>
  );
}

function PreviewCard({ title, content, readSeconds }: { title: string; content: string; readSeconds: number }) {
  if (!title && !content) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">員工預覽</span>
        <span className="text-xs text-gray-400 ml-1">— 員工將看到的內容</span>
      </div>
      <div className="p-5">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm max-w-md mx-auto">
          <div className="bg-[#0A2B5E] px-4 py-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-white flex-shrink-0" />
            <span className="text-white font-bold text-sm truncate">{title || "重要通知"}</span>
          </div>
          <div
            className="p-4 bg-gray-50 max-h-44 overflow-y-auto text-xs text-gray-700 leading-relaxed prose prose-xs max-w-none"
            dangerouslySetInnerHTML={{ __html: content || "<p class='text-gray-400 italic'>尚無內容。</p>" }}
          />
          <div className="px-4 py-3 bg-white border-t border-gray-100">
            <div className="w-full py-2 rounded-lg bg-gray-200 text-gray-400 text-xs font-semibold text-center">
              請閱讀內容 — 於 {readSeconds} 秒後可繼續
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncementPage() {
  const navigate = useNavigate();
  const { role, username } = useAdminAuth();
  const isSuper = role === "super";

  // Global (super admin) fields
  const [globalTitle, setGlobalTitle] = useState("");
  const [globalContent, setGlobalContent] = useState("");
  const [globalSeconds, setGlobalSeconds] = useState(60);
  const [globalTimeoutMinutes, setGlobalTimeoutMinutes] = useState(5);
  const [globalUpdatedBy, setGlobalUpdatedBy] = useState<string | null>(null);
  const [globalUpdatedAt, setGlobalUpdatedAt] = useState<string | null>(null);

  // Sub-admin custom fields
  const [subTitle, setSubTitle] = useState("");
  const [subContent, setSubContent] = useState("");
  const [subSeconds, setSubSeconds] = useState(60);
  const [subUpdatedAt, setSubUpdatedAt] = useState<string | null>(null);

  // "default" = use global, "custom" = use own
  const [activeTab, setActiveTab] = useState<"default" | "custom">("default");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGetAnnouncement()
      .then(({ announcement, sub_announcement }) => {
        if (announcement) {
          setGlobalTitle(announcement.title);
          setGlobalContent(announcement.content);
          setGlobalSeconds(announcement.read_seconds ?? 60);
          setGlobalTimeoutMinutes(announcement.confirmation_timeout_minutes ?? 5);
          setGlobalUpdatedBy(announcement.updated_by ?? null);
          setGlobalUpdatedAt(announcement.updated_at ?? null);
        }
        if (sub_announcement) {
          setSubTitle(sub_announcement.title);
          setSubContent(sub_announcement.content);
          setSubSeconds(sub_announcement.read_seconds);
          setActiveTab(sub_announcement.use_custom ? "custom" : "default");
          setSubUpdatedAt(sub_announcement.updated_at ?? null);
        }
      })
      .catch(() => setError("載入公告失敗。"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (isSuper) {
      if (!globalTitle.trim() || !globalContent.trim()) {
        setError("標題和內容為必填。");
        return;
      }
      setError("");
      setSaving(true);
      try {
        await adminSaveAnnouncement(globalTitle.trim(), globalContent, globalSeconds, undefined, globalTimeoutMinutes);
        setGlobalUpdatedBy(username);
        setGlobalUpdatedAt(new Date().toISOString());
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "儲存失敗。");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Sub-admin
    if (activeTab === "custom" && (!subTitle.trim() || !subContent.trim())) {
      setError("自訂公告的標題和內容為必填。");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await adminSaveAnnouncement(
        subTitle.trim(),
        subContent,
        subSeconds,
        activeTab === "custom",
      );
      setSubUpdatedAt(new Date().toISOString());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "儲存失敗。");
    } finally {
      setSaving(false);
    }
  }

  // What the preview shows depends on the active tab
  const previewTitle = isSuper ? globalTitle : (activeTab === "custom" ? subTitle : globalTitle);
  const previewContent = isSuper ? globalContent : (activeTab === "custom" ? subContent : globalContent);
  const previewSeconds = isSuper ? globalSeconds : (activeTab === "custom" ? subSeconds : globalSeconds);

  return (
    <div className="min-h-screen bg-gray-50" translate="no">
      <header className="bg-[#0A2B5E] text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard")} className="p-1.5 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-[#0A2B5E]" />
          </div>
          <div>
            <div className="font-bold text-sm">公告設定</div>
            <div className="text-[10px] text-blue-200">員工驗證碼通知內容</div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
          <FileText className="w-5 h-5 text-[#1E3A8A] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#0A2B5E] mb-1">關於此公告</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {isSuper
                ? "在員工要求驗證碼之前，會以全螢幕視窗顯示給員工。您的全域設定適用於所有員工，除非二級管理員已啟用自身的自訂公告。"
                : "在員工要求驗證碼之前顯示給員工。可選擇使用全域預設，或建立僅適用於您交易的專屬自訂公告。"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex items-center justify-center">
            <span className="w-7 h-7 border-2 border-gray-200 border-t-[#1E3A8A] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── ACTIVE MODE BANNER ─── */}
            {!isSuper && (
              <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 border ${
                activeTab === "custom"
                  ? "bg-[#0A2B5E] border-[#0A2B5E] text-white"
                  : "bg-white border-gray-200 text-gray-700"
              }`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  activeTab === "custom" ? "bg-white/15" : "bg-gray-100"
                }`}>
                  {activeTab === "custom"
                    ? <UserCog className="w-4 h-4 text-white" />
                    : <Globe className="w-4 h-4 text-gray-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${activeTab === "custom" ? "text-white/60" : "text-gray-400"}`}>
                    目前生效模式
                  </p>
                  <p className={`text-sm font-semibold ${activeTab === "custom" ? "text-white" : "text-gray-800"}`}>
                    {activeTab === "custom"
                      ? "自訂公告 — 您的員工會看到您個人化的內容"
                      : "預設（全域）公告 — 您的員工會看到超級管理員的內容"
                    }
                  </p>
                </div>
                <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${activeTab === "custom" ? "bg-emerald-400" : "bg-gray-300"} animate-pulse`} />
              </div>
            )}

            {/* ─── SUB-ADMIN TAB SWITCHER ─── */}
            {!isSuper && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-gray-200">
                  {(["default", "custom"] as const).map(tab => {
                    const active = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setError(""); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all relative ${
                          active
                            ? "text-[#0A2B5E] bg-white"
                            : "text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-50/80"
                        }`}
                      >
                        {tab === "default"
                          ? <Globe className="w-4 h-4" />
                          : <UserCog className="w-4 h-4" />
                        }
                        {tab === "default" ? "預設（全域）" : "自訂"}
                        {active && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0A2B5E] rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active mode banner */}
                <div className={`flex items-center gap-2.5 px-5 py-3 text-xs font-semibold border-b ${
                  activeTab === "custom"
                    ? "bg-[#0A2B5E]/5 border-[#0A2B5E]/10 text-[#0A2B5E]"
                    : "bg-gray-50 border-gray-100 text-gray-500"
                }`}>
                  <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${activeTab === "custom" ? "text-[#0A2B5E]" : "text-gray-400"}`} />
                  {activeTab === "default"
                    ? "生效模式：使用超級管理員設定的全域公告。您的員工將看到全域內容。"
                    : "生效模式：儲存後，您的自訂公告將顯示給您交易中的員工。"
                  }
                </div>

                {/* Tab content */}
                <div className="p-6 space-y-5">
                  {activeTab === "default" ? (
                    /* ── Default tab: read-only global view ── */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">全域標題</label>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 font-medium">
                          {globalTitle || <span className="text-gray-400 italic">尚未設定標題。</span>}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">全域內容</label>
                        <div
                          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-sm text-gray-700 leading-relaxed h-[1024px] overflow-y-auto prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: globalContent || "<p class='text-gray-400 italic'>尚未設定內容。</p>" }}
                        />
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600">
                          閱讀時間：<strong className="text-[#0A2B5E]">{globalSeconds} 秒</strong>
                        </span>
                      </div>
                      {(globalUpdatedBy || globalUpdatedAt) && (
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1 border-t border-gray-100">
                          {globalUpdatedBy && (
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              由 <strong className="text-gray-500">{globalUpdatedBy}</strong> 設定
                            </span>
                          )}
                          {globalUpdatedAt && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(globalUpdatedAt).toLocaleString("zh-TW")}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Save button to commit "use_custom = false" */}
                      {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {error}
                        </div>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          saved ? "bg-emerald-500 text-white" : "bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white"
                        } disabled:opacity-60`}
                      >
                        {saving
                          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />
                        }
                        {saving ? "儲存中..." : saved ? "已儲存" : "使用預設公告"}
                      </button>
                    </div>
                  ) : (
                    /* ── Custom tab: editable own config ── */
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          視窗標題 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={subTitle}
                          onChange={e => setSubTitle(e.target.value)}
                          maxLength={500}
                          placeholder="例如：重要通知 — 請仔細閱讀"
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          公告內容 <span className="text-red-500">*</span>
                        </label>
                        <RichTextEditor
                          value={subContent}
                          onChange={setSubContent}
                          placeholder="請在此輸入您的自訂公告內容。"
                          minHeight={260}
                        />
                      </div>
                      <ReadSecondsField value={subSeconds} onChange={setSubSeconds} />
                      {subUpdatedAt && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 border-t border-gray-100 pt-3">
                          <Clock className="w-3.5 h-3.5" />
                          上次儲存時間 {new Date(subUpdatedAt).toLocaleString("zh-TW")}
                        </div>
                      )}
                      {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {error}
                        </div>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                          saved ? "bg-emerald-500 text-white" : "bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white"
                        } disabled:opacity-60`}
                      >
                        {saving
                          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />
                        }
                        {saving ? "儲存中..." : saved ? "已儲存" : "儲存自訂公告"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── SUPER ADMIN: single global editor ─── */}
            {isSuper && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-[#0A2B5E]/8 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-[#0A2B5E]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0A2B5E]">全域公告</p>
                    <p className="text-xs text-gray-500">適用於所有員工。二級管理員可自行建立覆蓋的公告。</p>
                  </div>
                  <span className="ml-auto text-[10px] bg-[#0A2B5E]/10 text-[#0A2B5E] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">超級管理員</span>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      視窗標題 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={globalTitle}
                      onChange={e => setGlobalTitle(e.target.value)}
                      maxLength={500}
                      placeholder="例如：重要通知 — 請仔細閱讀"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      公告內容 <span className="text-red-500">*</span>
                    </label>
                    <RichTextEditor
                      value={globalContent}
                      onChange={setGlobalContent}
                      placeholder="請在此輸入公告內容。"
                      minHeight={1120}
                    />
                  </div>
                  <ReadSecondsField value={globalSeconds} onChange={setGlobalSeconds} />
                  <TimeoutMinutesField value={globalTimeoutMinutes} onChange={setGlobalTimeoutMinutes} />
                  {(globalUpdatedBy || globalUpdatedAt) && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1 border-t border-gray-100">
                      {globalUpdatedBy && (
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          最後由 <strong className="text-gray-600">{globalUpdatedBy}</strong> 更新
                        </span>
                      )}
                      {globalUpdatedAt && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(globalUpdatedAt).toLocaleString("zh-TW")}
                        </span>
                      )}
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      saved ? "bg-emerald-500 text-white" : "bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white"
                    } disabled:opacity-60`}
                  >
                    {saving
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />
                    }
                    {saving ? "儲存中..." : saved ? "儲存成功" : "儲存公告"}
                  </button>
                </div>
              </div>
            )}

            {/* Live preview */}
            <PreviewCard
              title={previewTitle}
              content={previewContent}
              readSeconds={previewSeconds}
            />
          </>
        )}
      </div>
    </div>
  );
}
