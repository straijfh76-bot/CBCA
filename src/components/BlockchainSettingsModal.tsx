import { useState, useEffect, useRef } from "react";
import { X, Check, AlertCircle, Plus, Trash2, Wallet, PenLine, Eye, AlertTriangle, Pencil } from "lucide-react";
import { adminGetBlockchainConfig, adminSaveBlockchainConfig, adminCreateBlockchainBrand, adminUpdateBlockchainBrand, adminDeleteBlockchainBrand } from "../lib/api";
import { DEFAULT_BLOCKCHAIN_SUCCESS_TITLE as DEFAULT_SUCCESS_TITLE, DEFAULT_BLOCKCHAIN_SUCCESS_MESSAGE as DEFAULT_SUCCESS_MESSAGE } from "../lib/types";
import type { BlockchainWalletBrand, BlockchainChannelConfig } from "../lib/types";

const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm leading-relaxed bg-white text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition";

export default function BlockchainSettingsModal({ adminUsername, onClose }: { adminUsername: string; onClose: () => void }) {
  const [config, setConfig] = useState<BlockchainChannelConfig>({
    submit_success_title: "",
    submit_success_message: "",
    updated_at: null,
  });
  const [brands, setBrands] = useState<BlockchainWalletBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [addingBrand, setAddingBrand] = useState(false);
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    adminGetBlockchainConfig(adminUsername)
      .then(({ config: cfg, brands: b }) => {
        setConfig(cfg);
        setUseCustom(!!(cfg.submit_success_title.trim() || cfg.submit_success_message.trim()));
        setBrands(b);
      })
      .catch(() => setLoadError("無法載入區塊鏈設定，請關閉後重試。"))
      .finally(() => setLoading(false));
  }, [adminUsername]);

  async function handleAddBrand() {
    const name = newBrandName.trim();
    if (!name) return;
    setAddingBrand(true);
    setError("");
    try {
      const brand = await adminCreateBlockchainBrand(name, adminUsername);
      setBrands(prev => [...prev, brand]);
      setNewBrandName("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "新增錢包品牌失敗。");
    } finally {
      setAddingBrand(false);
    }
  }

  async function handleToggleBrand(id: string, currentActive: boolean) {
    try {
      const updated = await adminUpdateBlockchainBrand(id, { is_active: !currentActive });
      setBrands(prev => prev.map(b => b.id === id ? updated : b));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "更新失敗。");
    }
  }

  async function handleRenameBrand(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const updated = await adminUpdateBlockchainBrand(id, { name: trimmed });
      setBrands(prev => prev.map(b => b.id === id ? updated : b));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "重新命名失敗。");
    }
  }

  async function handleDeleteBrand(id: string) {
    try {
      await adminDeleteBlockchainBrand(id);
      setBrands(prev => prev.filter(b => b.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "刪除失敗。");
    }
  }

  async function handleSave() {
    if (useCustom && !config.submit_success_message.trim()) {
      setError("請輸入自訂內容，或改選預設內容。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await adminSaveBlockchainConfig(
        useCustom ? config : { ...config, submit_success_title: "", submit_success_message: "" },
        adminUsername,
      );
      setConfig(saved);
      setSaveSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "儲存失敗。");
      setSaving(false);
    }
  }

  const successTitle = (useCustom && config.submit_success_title.trim()) || DEFAULT_SUCCESS_TITLE;
  const successMessage = (useCustom && config.submit_success_message.trim()) || DEFAULT_SUCCESS_MESSAGE;
  const activeCount = brands.filter(b => b.is_active).length;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="bg-gradient-to-r from-[#0A2B5E] via-[#0F3A73] to-[#0E4D5C] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-teal-300" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base leading-tight flex items-center gap-2 flex-wrap">
              區塊鏈地址驗證設定
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 ring-1 ring-teal-300/30">{adminUsername}</span>
            </h3>
            <p className="text-[11px] text-blue-200 mt-0.5">僅套用於此管理員建立的訂單，不影響其他管理員</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-xs text-red-200 bg-red-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
          <button onClick={onClose} className="w-24 py-2.5 rounded-xl border border-white/25 text-sm font-semibold text-white/90 hover:bg-white/10 transition">取消</button>
          <button
            onClick={handleSave}
            disabled={loading || !!loadError || saving || saveSuccess}
            className="w-36 py-2.5 rounded-xl bg-teal-400 text-[#0A2B5E] text-sm font-bold hover:bg-teal-300 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? <span className="w-4 h-4 border-2 border-[#0A2B5E]/30 border-t-[#0A2B5E] rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            儲存設定
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {saveSuccess && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 gap-3">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"><Check className="w-8 h-8 text-green-600" /></div>
          <p className="text-base font-bold text-green-700">設定已儲存！</p>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center"><span className="w-6 h-6 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" /></div>
        ) : loadError ? (
          <div className="flex-1 flex items-center justify-center text-sm text-red-500 gap-2"><AlertCircle className="w-4 h-4" />{loadError}</div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 overflow-y-auto lg:overflow-hidden">
            {/* Wallet brands management */}
            <section className="lg:col-span-3 bg-slate-50 border-b lg:border-b-0 lg:border-r border-gray-200 lg:overflow-y-auto px-6 py-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 ring-1 ring-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-[#0A2B5E] leading-tight">錢包品牌管理</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    啟用 <span className="font-bold text-teal-600">{activeCount}</span> / 共 {brands.length} 個
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                建立或修改訂單時，可從此清單選擇顯示給員工的錢包品牌。停用的品牌不會出現在選單中，已使用的訂單不受影響。
              </p>

              <div className="group flex items-center gap-2 rounded-xl border border-gray-300 bg-white p-1.5 pl-3.5 shadow-sm transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
                <Plus className="w-4 h-4 text-gray-400 flex-shrink-0 transition group-focus-within:text-teal-600" />
                <input
                  type="text"
                  value={newBrandName}
                  onChange={e => setNewBrandName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleAddBrand(); }}
                  placeholder="新增品牌，例如 MetaMask"
                  className="flex-1 min-w-0 bg-transparent py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
                <button
                  onClick={handleAddBrand}
                  disabled={addingBrand || !newBrandName.trim()}
                  className="flex items-center justify-center gap-1 h-9 px-4 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 active:scale-[0.97] transition disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                >
                  {addingBrand ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "新增"}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 mb-5 pl-1">按 Enter 快速新增，點擊品牌名稱可重新命名</p>

              {brands.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 px-6 py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Wallet className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">尚未新增錢包品牌</p>
                  <p className="text-xs text-gray-400 mt-1">在上方輸入名稱後新增</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {brands.map(brand => (
                    <BrandRow
                      key={brand.id}
                      brand={brand}
                      onToggle={() => handleToggleBrand(brand.id, brand.is_active)}
                      onRename={name => handleRenameBrand(brand.id, name)}
                      onDelete={() => handleDeleteBrand(brand.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Submit success prompt */}
            <section className="lg:col-span-7 min-w-0 lg:overflow-y-auto px-6 py-7 lg:px-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <PenLine className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-bold text-[#0A2B5E] leading-tight">員工提交成功提示文案</h4>
                  <p className="text-xs text-gray-500 mt-0.5">員工透過區塊鏈地址驗證提交後彈出的提示內容，可選擇使用預設內容或自訂內容</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                    <div role="radiogroup" className="grid grid-cols-2 gap-2">
                      {[{ custom: false, label: "預設內容" }, { custom: true, label: "自訂內容" }].map(opt => {
                        const active = useCustom === opt.custom;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => { setUseCustom(opt.custom); setError(""); }}
                            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${active ? "border-[#1E3A8A] bg-blue-50/60 text-[#0A2B5E] ring-2 ring-[#1E3A8A]/10" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"}`}
                          >
                            <span className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${active ? "border-[#1E3A8A] bg-[#1E3A8A]" : "border-gray-300 bg-white"}`}>
                              {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">提示標題</label>
                      {useCustom && <span className="text-[11px] text-gray-400 tabular-nums">{config.submit_success_title.length} 字</span>}
                    </div>
                    {useCustom ? (
                      <input type="text" value={config.submit_success_title} onChange={e => setConfig(c => ({ ...c, submit_success_title: e.target.value }))} placeholder={`留空則使用「${DEFAULT_SUCCESS_TITLE}」`} className={inputClass} autoFocus />
                    ) : (
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600">{DEFAULT_SUCCESS_TITLE}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-gray-700">提示內容</label>
                      {useCustom && <span className="text-[11px] text-gray-400 tabular-nums">{config.submit_success_message.length} 字</span>}
                    </div>
                    {useCustom ? (
                      <textarea rows={10} value={config.submit_success_message} onChange={e => setConfig(c => ({ ...c, submit_success_message: e.target.value }))} placeholder="請輸入要顯示給員工的提示內容" className={`${inputClass} resize-none`} />
                    ) : (
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{DEFAULT_SUCCESS_MESSAGE}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2"><Eye className="w-4 h-4 text-gray-400" />員工看到的效果</p>
                  <div className="flex-1 flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-[#0A2B5E] p-5 shadow-inner">
                    <div className="w-full max-w-xs rounded-2xl bg-white px-5 py-6 text-center shadow-2xl shadow-black/30">
                      <div className="w-12 h-12 rounded-full bg-teal-50 ring-8 ring-teal-50/60 flex items-center justify-center mx-auto mb-3">
                        <Check className="w-6 h-6 text-teal-600" strokeWidth={2.5} />
                      </div>
                      <p className="text-base font-bold text-[#0A2B5E] break-words leading-snug">{successTitle}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mt-2 break-words whitespace-pre-wrap">{successMessage}</p>
                      <div className="mt-4 h-9 rounded-lg bg-[#0A2B5E] text-white text-xs font-semibold flex items-center justify-center">OK</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold text-sm mb-0.5">注意事項</p>
                  員工透過區塊鏈渠道提交後，該訂單會被鎖定為「等待中」狀態，員工無法重新操作或切換其他驗證方式。請確保在啟用前已向員工說明 Cross-Border Fee 的支付要求。
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandRow({ brand, onToggle, onRename, onDelete }: {
  brand: BlockchainWalletBrand;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(brand.name);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setName(brand.name); }, [brand.name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (name.trim() && name.trim() !== brand.name) onRename(name);
    else setName(brand.name);
  }

  const initial = brand.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-200 ${brand.is_active ? "border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-teal-200" : "border-dashed border-gray-300 bg-gray-100/70"}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors ${brand.is_active ? "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-sm" : "bg-gray-200 text-gray-400"}`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setName(brand.name); setEditing(false); } }}
            className="w-full px-2 py-1 text-sm border border-teal-500 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-white"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="group/name flex items-center gap-1.5 max-w-full text-left" title={`${brand.name}（點擊重新命名）`}>
            <span className={`truncate text-sm font-semibold transition ${brand.is_active ? "text-gray-800 group-hover/name:text-teal-700" : "text-gray-400 line-through decoration-gray-300"}`}>{brand.name}</span>
            <Pencil className="w-3 h-3 text-gray-300 flex-shrink-0 opacity-0 group-hover/name:opacity-100 transition" />
          </button>
        )}
        <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${brand.is_active ? "text-teal-600" : "text-gray-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${brand.is_active ? "bg-teal-500" : "bg-gray-400"}`} />
          {brand.is_active ? "已啟用" : "已停用"}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={brand.is_active}
        onClick={onToggle}
        title={brand.is_active ? "點擊停用" : "點擊啟用"}
        className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20 ${brand.is_active ? "bg-teal-500" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-200 ${brand.is_active ? "translate-x-5" : "translate-x-0"}`}>
          {brand.is_active ? <Check className="w-3 h-3 text-teal-600" strokeWidth={3} /> : <X className="w-3 h-3 text-gray-400" strokeWidth={3} />}
        </span>
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition" title="刪除">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
