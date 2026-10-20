import { useState, useEffect } from "react";
import { X, Save, Check, Globe, Type } from "lucide-react";
import { getSiteBranding, adminSaveSiteBranding } from "../lib/api";

interface Props {
  onClose: () => void;
}

export default function SiteBrandingModal({ onClose }: Props) {
  const [brandCode, setBrandCode] = useState("CBCA");
  const [brandTagline, setBrandTagline] = useState("Cross-Border Payroll Settlement");
  const [brandShort, setBrandShort] = useState("Cross-Border Settlement");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSiteBranding()
      .then((b) => {
        setBrandCode(b.brand_code);
        setBrandTagline(b.brand_tagline);
        setBrandShort(b.brand_short);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!brandCode.trim() || !brandTagline.trim()) {
      setError("代號與標語為必填。");
      return;
    }
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      await adminSaveSiteBranding({
        brand_code: brandCode.trim(),
        brand_tagline: brandTagline.trim(),
        brand_short: brandShort.trim() || brandTagline.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "儲存失敗。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#0A2B5E]/10 rounded-xl flex items-center justify-center">
              <Globe className="w-4.5 h-4.5 text-[#0A2B5E]" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">網站品牌設定</div>
              <div className="text-xs text-gray-400">自訂左上角標誌與登入畫面上方文字</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-6 h-6 border-2 border-gray-200 border-t-[#0A2B5E] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  標誌代號（左上角）
                </label>
                <input
                  type="text"
                  value={brandCode}
                  onChange={e => setBrandCode(e.target.value)}
                  maxLength={20}
                  placeholder="例如：CBCA"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  完整標語（電腦版標誌下方與登入畫面上方）
                </label>
                <input
                  type="text"
                  value={brandTagline}
                  onChange={e => setBrandTagline(e.target.value)}
                  maxLength={120}
                  placeholder="例如：Cross-Border Payroll Settlement"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  簡短標語（手機版標誌下方）
                </label>
                <input
                  type="text"
                  value={brandShort}
                  onChange={e => setBrandShort(e.target.value)}
                  maxLength={60}
                  placeholder="例如：Cross-Border Settlement"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2B5E] focus:border-transparent"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">留空將自動使用完整標語。</p>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60 ${
                    saved ? "bg-green-500 text-white" : "bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white"
                  }`}
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : saved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "儲存中..." : saved ? "已儲存" : "儲存設定"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
