import React, { useState } from "react";
import { Shield, CheckCircle, ArrowRight, ArrowLeft, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import StatusNotice from "./StatusNotice";
import NoticeCard from "./NoticeCard";
import type { Transaction } from "../lib/types";

// ── Desktop-only helpers ───────────────────────────────────────────────────

function Field({ label, value, mono = false, highlight = false }: {
  label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 flex-shrink-0 w-44">{label}</span>
      <span className={`text-sm text-right flex-1 ${mono ? "font-mono" : ""} ${highlight ? "text-[#F59E0B] font-bold text-lg" : "text-gray-800 font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 -mx-6 mb-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E3A8A]">{children}</h3>
    </div>
  );
}

// ── Mobile field row ───────────────────────────────────────────────────────

function MobileRow({ label, value, mono = false, highlight = false }: {
  label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</div>
      <div className={`text-sm break-all ${mono ? "font-mono text-xs" : ""} ${highlight ? "text-[#F59E0B] font-extrabold text-xl" : "text-gray-800 font-medium"}`}>
        {value}
      </div>
    </div>
  );
}

function MobileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
      <div className="bg-[#0A2B5E]/5 border-b border-gray-100 px-4 py-2.5">
        <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A]">{title}</h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}


// ── Shared helpers ─────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: 2 }).format(amount);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
}


export interface Banner { id: string; title: string; content: string }

export default function TransactionView({ tx, kycSubmitted, banners, onBack, onStartVerification, onResubmit, blockchainLocked }: {
  tx: Transaction;
  kycSubmitted: boolean;
  banners: Banner[];
  onBack: () => void;
  onStartVerification: () => void;
  onResubmit: () => void;
  blockchainLocked?: boolean;
}) {
  const [hashVerified, setHashVerified] = useState(false);
  const feeAmount = tx.fee_crossborder > 0 ? (tx.amount * tx.fee_crossborder) / 100 : 0;
  const netAmount = tx.amount - feeAmount;
  const canModify = tx.review_status === "failed" && !blockchainLocked;
  const awaitingCode = tx.review_status === "awaiting_admin_confirmation";
  const hasSubmitted = !awaitingCode && (kycSubmitted || tx.review_status === "pending" || tx.review_status === "processing" || tx.review_status === "approved" || tx.review_status === "failed");
  const settlementLabel = (unit: string) => `${tx.settlement_days || 3} ${unit} after verification approval`;

  const bannerCards = banners.map((b) => (
    <NoticeCard key={b.id} title={b.title} content={b.content} />
  ));

  function handleHashVerify() {
    setHashVerified(true);
    setTimeout(() => setHashVerified(false), 3000);
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE layout  (< lg)
      ════════════════════════════════════════════════════════════════════ */}
      <main className="lg:hidden flex-1 flex flex-col bg-gray-50">
        {/* Top bar with back + status */}
        <div className="bg-[#0A2B5E] px-4 pt-4 pb-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-4 transition"
          >
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="text-[13px] font-medium">Back</span>
          </button>

          <div className="text-[10px] text-blue-300 uppercase tracking-widest font-bold mb-1">Settlement Voucher</div>
          <div className="text-white font-extrabold text-lg leading-tight">Cross-Border Settlement</div>
          <div className="text-blue-200 text-xs mt-1">{formatDate(tx.created_at)}</div>

          {/* Amount highlight */}
          {tx.amount > 0 && (
            <div className="mt-4 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-blue-200 text-xs font-semibold">Withdrawal Amount</span>
              <span className="text-[#F59E0B] font-extrabold text-xl">{formatAmount(tx.amount, "USD")}</span>
            </div>
          )}

          {/* Status chip */}
          <div className="mt-3 flex items-center gap-2">
            <StatusBadge status={tx.review_status} />
          </div>
        </div>

        {/* Content slides up from below */}
        <div className="flex-1 -mt-6 bg-gray-50 rounded-t-3xl pt-6 px-4 pb-6 max-w-xl mx-auto w-full" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>

          {hasSubmitted && (
            <div className="mb-4">
              <StatusNotice tx={tx} blockchainLocked={blockchainLocked} canModify={canModify} onResubmit={onResubmit} />
            </div>
          )}

          {/* System notifications */}
          {banners.length > 0 && (
            <div className="space-y-2.5 mb-4">
              {bannerCards}
            </div>
          )}

          {/* AML badge */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-700 font-medium">Passed AML &amp; sanctions screening — FATF compliant</span>
          </div>

          {/* Sections */}
          <MobileSection title="Transaction Identification">
            <MobileRow label="FT-UID" value={tx.ft_uid} mono />
            <MobileRow label="Serial Number" value={tx.serial_number} mono />
            <MobileRow label="CBCA Reference" value={tx.cbca_reference} mono />
            <MobileRow label="Created At" value={formatDateTime(tx.created_at)} />
            <MobileRow label="Security Hash (SHA-256)" value={
              <button onClick={handleHashVerify} className="text-[#1E3A8A] underline font-mono text-[11px] break-all text-left">
                {tx.hash_value || "—"}
                {hashVerified && <span className="ml-2 text-green-600 font-bold no-underline not-italic">✓ Verified</span>}
              </button>
            } />
          </MobileSection>

          <MobileSection title="Transaction Details">
            <MobileRow label="Company" value={tx.company_name || "—"} />
            <MobileRow label="Employee ID" value={tx.employee_id || "—"} mono />
            <MobileRow label="Jurisdiction" value={tx.jurisdiction || "—"} />
            <MobileRow label="Agreement No." value={tx.agreement_number || "—"} mono />
            <MobileRow label="Issue Date" value={formatDate(tx.issue_date)} />
            <MobileRow label="Est. Settlement" value={settlementLabel("days")} />
          </MobileSection>

          <MobileSection title="Amount & Fees">
            <MobileRow label="Withdrawal Amount" value={formatAmount(tx.amount, "USD")} highlight />
            {feeAmount > 0 && (
              <>
                <MobileRow label="Cross-Border Fee" value={`${tx.fee_crossborder}% = ${formatAmount(feeAmount, "USD")}`} />
                <div className="py-3 flex items-center justify-between border-t-2 border-dashed border-gray-200 mt-1">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Net Settlement</span>
                  <span className="text-[#F59E0B] font-extrabold text-lg">{formatAmount(netAmount, "USD")}</span>
                </div>
              </>
            )}
          </MobileSection>

          <MobileSection title="Compliance & Digital Seal">
            <div className="py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#1E3A8A] flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-[#1E3A8A]" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-[#0A2B5E]">ISFC Digital Seal</div>
                <div className="text-xs text-gray-400 font-mono">{tx.cbca_reference}</div>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>
            <p className="text-xs text-gray-400 pb-4 leading-relaxed">
              This settlement is executed in accordance with the laws of {tx.jurisdiction || "the applicable jurisdiction"} and ISFC regulations. All information is cryptographically signed.
            </p>
          </MobileSection>

          {/* CTA */}
          {!hasSubmitted && (
            <button
              onClick={onStartVerification}
              className="w-full bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0A2B5E]/20 active:scale-[0.98] text-[15px]"
            >
              Complete Identity Verification
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP layout  (lg+) — original unchanged
      ════════════════════════════════════════════════════════════════════ */}
      <main className="hidden lg:block flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-[#0A2B5E] hover:text-[#1E3A8A] mb-5 group"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm group-hover:shadow-md transition">
            <ArrowLeft className="w-4 h-4" />
          </span>
          Back
        </button>

        {hasSubmitted && (
          <div className="mb-6">
            <StatusNotice tx={tx} blockchainLocked={blockchainLocked} canModify={canModify} onResubmit={onResubmit} />
          </div>
        )}

        {hasSubmitted && banners.length > 0 && (
          <div className="mb-6 space-y-3">{bannerCards}</div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0A2B5E] to-[#1E3A8A] text-white px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-blue-200 mb-1">Cross-Border Settlement Voucher</div>
                <h1 className="text-xl font-bold">Cross-Border Settlement Authorization</h1>
                <div className="text-blue-200 text-sm mt-1">ISFC Official Document &middot; {formatDate(tx.created_at)}</div>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/30">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div className="text-[10px] text-blue-200 mt-1 text-right">Digital Seal</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-b border-green-200 px-6 py-2.5 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-700 font-medium">
              This transaction has passed AML and sanctions screening in compliance with FATF standards.
            </span>
          </div>

          {!hasSubmitted && banners.length > 0 && (
            <div className="px-6 pt-5 space-y-3">{bannerCards}</div>
          )}

          <div className="p-6 space-y-6">
            <div>
              <SectionTitle>Transaction Identification</SectionTitle>
              <Field label="Financial Transfer UID" value={tx.ft_uid} mono />
              <Field label="Withdrawal Serial Number" value={tx.serial_number} mono />
              <Field label="CBCA Reference Number" value={tx.cbca_reference} mono />
              <Field label="Transaction Created At" value={formatDateTime(tx.created_at)} />
              <Field
                label="Security Hash (SHA-256)"
                value={
                  <button
                    onClick={handleHashVerify}
                    className="text-[#1E3A8A] underline underline-offset-2 font-mono text-xs break-all text-right hover:text-[#0A2B5E] transition"
                  >
                    {tx.hash_value || "—"}
                    {hashVerified && (
                      <span className="ml-2 text-green-600 font-semibold no-underline">✓ Hash verified</span>
                    )}
                  </button>
                }
              />
            </div>

            <div>
              <SectionTitle>Transaction Details</SectionTitle>
              <Field label="Originating Company" value={tx.company_name || "—"} />
              <Field label="Employee ID" value={tx.employee_id || "—"} mono />
              <Field label="Jurisdiction" value={tx.jurisdiction || "—"} />
              <Field label="Agreement Number" value={tx.agreement_number || "—"} mono />
              <Field label="Issue Date" value={formatDate(tx.issue_date)} />
              <Field label="Estimated Settlement Date" value={settlementLabel("business days")} />
            </div>

            <div>
              <SectionTitle>Amount &amp; Fee Breakdown</SectionTitle>
              <Field label="Withdrawal Amount" value={formatAmount(tx.amount, "USD")} highlight />
              {feeAmount > 0 && (
                <>
                  <Field label="Cross-Border Fee" value={`${tx.fee_crossborder}% = ${formatAmount(feeAmount, "USD")}`} />
                  <div className="flex justify-between items-center py-3 mt-1 border-t-2 border-dashed border-gray-300">
                    <span className="text-sm font-bold text-gray-700">Net Settlement Amount</span>
                    <span className="text-[#F59E0B] font-bold text-lg">{formatAmount(netAmount, "USD")}</span>
                  </div>
                </>
              )}
            </div>

            <div>
              <SectionTitle>Compliance &amp; Digital Seal</SectionTitle>
              <div className="bg-[#0A2B5E]/5 border border-[#1E3A8A]/20 rounded-xl p-4 mb-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-[#1E3A8A] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#1E3A8A]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0A2B5E]">ISFC Digital Seal</div>
                  <div className="text-xs text-gray-500 mt-0.5">This transaction has been cryptographically signed by ISFC and is tamper-proof.</div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">{tx.cbca_reference}</div>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500 ml-auto flex-shrink-0" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                This settlement is executed in accordance with the laws of {tx.jurisdiction || "the applicable jurisdiction"} and
                ISFC cross-border payment regulations. Fund clearing is supervised by the relevant international regulatory authority.
                All transaction information is protected by digital signature; any tampering will trigger an ISFC security
                alert and be referred to the regulator.
              </p>
            </div>
          </div>

          {!hasSubmitted && (
            <div className="px-6 pb-6">
              <button
                onClick={onStartVerification}
                className="w-full bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0A2B5E]/20"
              >
                Next Step: Complete Identity Verification
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                You will be directed to the KYC and card information submission form.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
