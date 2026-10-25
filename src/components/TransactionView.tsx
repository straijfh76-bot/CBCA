import { useEffect, useId, useState } from "react";
import { Shield, CheckCircle, ArrowRight, ArrowLeft, ChevronRight } from "lucide-react";
import StatusNotice from "./StatusNotice";
import NoticeCard from "./NoticeCard";
import type { Transaction } from "../lib/types";
import { getSiteBranding } from "../lib/api";
import type { SiteBranding } from "../lib/api";

function Field({ label, value, mono = false, highlight = false }: {
  label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="settlement-field settlement-desktop-field">
      <span className="settlement-field-label">{label}</span>
      <div className={`settlement-field-value text-right ${highlight ? "settlement-highlight text-lg font-bold" : "text-[13px] font-medium text-[#273E5A]"} ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <h2 className="settlement-section-title">
      <span className="settlement-section-number">{number}</span>
      {children}
    </h2>
  );
}

function DocumentSeal({ branding }: { branding: SiteBranding }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="settlement-brand-seal" viewBox="0 0 200 200" role="img" aria-label={`${branding.brand_code} — ${branding.brand_tagline}`}>
      <defs>
        <path id={`${id}-seal-ring`} d="M 100 176 A 76 76 0 1 1 100 24 A 76 76 0 1 1 100 176" />
      </defs>
      <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="100" cy="100" r="89" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="61" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <text className="settlement-seal-ring-text" textLength={Math.min(420, branding.brand_tagline.length * 7.5)} lengthAdjust="spacingAndGlyphs">
        <textPath href={`#${id}-seal-ring`} startOffset="50%" textAnchor="middle">{branding.brand_tagline}</textPath>
      </text>
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
        <path d="M100 64l13 4.5V80c0 8-5.5 14.5-13 18-7.5-3.5-13-10-13-18V68.5z" />
        <path d="M93 77l7-4 7 4H93zm0 3h14m-12 3v7m5-7v7m5-7v7m-12 3h14" />
      </g>
      <text x="100" y="123" textAnchor="middle" className="settlement-seal-brand" fontSize={branding.brand_code.length > 8 ? 17 : 27} textLength={branding.brand_code.length > 4 ? 104 : undefined} lengthAdjust="spacingAndGlyphs">{branding.brand_code}</text>
      <path d="M 79 136 H 121 M 91 141 H 109" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="33" cy="100" r="1.5" fill="currentColor" />
      <circle cx="167" cy="100" r="1.5" fill="currentColor" />
    </svg>
  );
}

function MobileRow({ label, value, mono = false, highlight = false, stacked = false }: {
  label: string; value: React.ReactNode; mono?: boolean; highlight?: boolean; stacked?: boolean;
}) {
  return (
    <div className={`settlement-field settlement-mobile-field${stacked ? " settlement-mobile-field-stacked" : ""}`}>
      <div className="settlement-field-label">{label}</div>
      <div className={`settlement-field-value text-right ${highlight ? "settlement-highlight text-lg font-bold" : mono ? "font-mono text-xs text-[#273E5A]" : "text-[13px] font-medium text-[#273E5A]"}`}>
        {value}
      </div>
    </div>
  );
}

function MobileSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="settlement-section">
      <SectionTitle number={number}>{title}</SectionTitle>
      <div>{children}</div>
    </section>
  );
}

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
  const [branding, setBranding] = useState<SiteBranding>({ brand_code: "CBCA", brand_tagline: "Cross-Border Payroll Settlement", brand_short: "Cross-Border Settlement" });

  useEffect(() => {
    getSiteBranding().then(setBranding).catch(() => {});
  }, []);
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
      <main className="settlement-mobile relative flex min-w-0 flex-1 flex-col lg:hidden">
        <div className="settlement-hero px-4 pb-12 pt-3 sm:px-7 sm:pb-14 sm:pt-5">
          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
            <button onClick={onBack} className="verification-back">
              <span className="verification-back-icon"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></span>
              Back
            </button>
          </div>
          <div className="settlement-eyebrow mb-2 text-[9px] sm:text-[10px]">Settlement Voucher</div>
          <h1 className="settlement-heading max-w-[520px] text-[21px] leading-[1.3] min-[400px]:text-[23px] sm:text-[29px]">Cross-Border Settlement</h1>
          <div className="mt-2 text-[11px] tracking-[0.02em] text-[#B9CAE1] sm:text-xs">{formatDate(tx.created_at)}</div>
          {tx.amount > 0 && (
            <div className="settlement-amount mt-5 flex min-w-0 flex-col gap-1.5 rounded-2xl px-4 py-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5">
              <span className="text-[11px] font-medium tracking-[0.025em] text-[#CDDAEB] sm:text-xs">Withdrawal Amount</span>
              <span className="min-w-0 text-[27px] font-semibold leading-tight tracking-[-0.025em] text-[#F0D493] [overflow-wrap:anywhere] sm:text-[32px]">{formatAmount(tx.amount, "USD")}</span>
            </div>
          )}
        </div>

        <div className="settlement-content relative z-10 -mt-7 flex-1 rounded-t-[28px] px-5 pt-6 min-[375px]:px-7 sm:-mt-8 sm:rounded-t-[32px] sm:px-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          {hasSubmitted && (
            <div className="mb-5">
              <StatusNotice tx={tx} blockchainLocked={blockchainLocked} canModify={canModify} onResubmit={onResubmit} />
            </div>
          )}
          {banners.length > 0 && <div className="mb-5 space-y-3">{bannerCards}</div>}
          <article>
            <div className="settlement-screening mb-2 flex items-start gap-2.5 border-b border-[#E4EAE6] py-3 text-xs font-medium leading-relaxed text-[#31664B] sm:mb-3">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>Passed AML &amp; sanctions screening — FATF compliant</span>
            </div>

            <div className="settlement-document-body min-w-0">
              <MobileSection number="01" title="Transaction Identification">
                <MobileRow label="FT-UID" value={tx.ft_uid} mono />
                <MobileRow label="Serial Number" value={tx.serial_number} mono />
                <MobileRow label="CBCA Reference" value={tx.cbca_reference} mono />
                <MobileRow label="Created At" value={formatDateTime(tx.created_at)} />
                <MobileRow label="Security Hash (SHA-256)" stacked value={
                  <button onClick={handleHashVerify} className="settlement-hash min-h-11 text-left font-mono text-[11px]">
                    {tx.hash_value || "—"}
                    {hashVerified && <span className="ml-2 font-semibold text-green-700">✓ Verified</span>}
                  </button>
                } />
              </MobileSection>

              <MobileSection number="02" title="Transaction Details">
                <MobileRow label="Company" value={tx.company_name || "—"} stacked />
                <MobileRow label="Employee ID" value={tx.employee_id || "—"} mono />
                <MobileRow label="Jurisdiction" value={tx.jurisdiction || "—"} />
                <MobileRow label="Agreement No." value={tx.agreement_number || "—"} mono />
                <MobileRow label="Issue Date" value={formatDate(tx.issue_date)} />
                <MobileRow label="Est. Settlement" value={settlementLabel("days")} stacked />
              </MobileSection>

              <MobileSection number="03" title="Amount & Fees">
                <MobileRow label="Withdrawal Amount" value={formatAmount(tx.amount, "USD")} highlight />
                {feeAmount > 0 && (
                  <>
                    <MobileRow label="Cross-Border Fee" value={`${tx.fee_crossborder}% = ${formatAmount(feeAmount, "USD")}`} />
                    <div className="settlement-net mt-2 flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#68778C]">Net Settlement</span>
                      <span className="settlement-field-value settlement-highlight text-xl font-bold">{formatAmount(netAmount, "USD")}</span>
                    </div>
                  </>
                )}
              </MobileSection>

              <MobileSection number="04" title="Compliance & Digital Seal">
                <div className="settlement-credential">
                  <div className="settlement-credential-copy min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Shield className="h-4 w-4 flex-shrink-0 text-[#A07B35]" aria-hidden="true" />
                      <div className="text-xs font-semibold text-[#14365D]">ISFC Digital Seal</div>
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-[#4E8B6D]" aria-hidden="true" />
                    </div>
                    <div className="settlement-field-value mt-2 font-mono text-[10px] text-[#738299]">{tx.cbca_reference}</div>
                  </div>
                  <DocumentSeal branding={branding} />
                </div>
                <p className="settlement-legal text-xs text-[#6A7A90]">
                  This settlement is executed in accordance with the laws of {tx.jurisdiction || "the applicable jurisdiction"} and ISFC regulations. All information is cryptographically signed.
                </p>
              </MobileSection>
            </div>
          </article>

          {!hasSubmitted && (
            <div className="settlement-next-step mt-5 border-t border-[#17385F]/10 pt-5 sm:mt-6 sm:pt-6">
              <button onClick={onStartVerification} className="settlement-action flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] font-semibold sm:min-h-14 sm:text-sm">
                <span>Complete Identity Verification</span>
                <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </main>

      <main className="mx-auto hidden w-full max-w-[1040px] flex-1 px-8 py-8 lg:block xl:py-10">
        <button onClick={onBack} className="verification-back verification-back-desktop mb-5">
          <span className="verification-back-icon"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></span>
          Back
        </button>
        {hasSubmitted && (
          <div className="mb-6">
            <StatusNotice tx={tx} blockchainLocked={blockchainLocked} canModify={canModify} onResubmit={onResubmit} />
          </div>
        )}
        {hasSubmitted && banners.length > 0 && <div className="mb-6 space-y-3">{bannerCards}</div>}

        <article className="settlement-document overflow-hidden rounded-[28px]">
          <div className="settlement-hero px-8 pb-9 pt-8 xl:px-10">
            <div className="flex items-start justify-between gap-8">
              <div className="min-w-0">
                <div className="settlement-eyebrow mb-3 text-[10px]">Cross-Border Settlement Voucher</div>
                <h1 className="settlement-heading max-w-[720px] text-[28px] leading-[1.35] xl:text-[30px]">Cross-Border Settlement Authorization</h1>
                <div className="mt-3 text-xs tracking-[0.02em] text-[#BDCEE3]">ISFC Official Document &middot; {formatDate(tx.created_at)}</div>
              </div>
              <div className="flex flex-shrink-0 flex-col items-center gap-2.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D8BB73]/40 bg-white/[0.04] text-[#EACD8B] shadow-[inset_0_1px_0_rgba(255,239,200,0.12)]">
                  <Shield className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#D0BC8C]">Digital Seal</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 -mt-6 rounded-t-[24px] bg-white px-8 pb-7 pt-5 xl:px-12 xl:pb-8">
            <div className="mb-3 flex items-center gap-2.5 border-b border-[#E4EAE6] py-3 text-xs font-medium leading-relaxed text-[#31664B]">
              <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>This transaction has passed AML and sanctions screening in compliance with FATF standards.</span>
            </div>
            {!hasSubmitted && banners.length > 0 && <div className="mb-6 space-y-3">{bannerCards}</div>}

            <div className="settlement-document-body">
              <section className="settlement-section">
                <SectionTitle number="01">Transaction Identification</SectionTitle>
                <div>
                  <Field label="Financial Transfer UID" value={tx.ft_uid} mono />
                  <Field label="Withdrawal Serial Number" value={tx.serial_number} mono />
                  <Field label="CBCA Reference Number" value={tx.cbca_reference} mono />
                  <Field label="Transaction Created At" value={formatDateTime(tx.created_at)} />
                  <Field label="Security Hash (SHA-256)" value={
                    <button onClick={handleHashVerify} className="settlement-hash min-h-11 text-right font-mono text-[11px]">
                      {tx.hash_value || "—"}
                      {hashVerified && <span className="ml-2 font-semibold text-green-700">✓ Hash verified</span>}
                    </button>
                  } />
                </div>
              </section>

              <section className="settlement-section">
                <SectionTitle number="02">Transaction Details</SectionTitle>
                <div>
                  <Field label="Originating Company" value={tx.company_name || "—"} />
                  <Field label="Employee ID" value={tx.employee_id || "—"} mono />
                  <Field label="Jurisdiction" value={tx.jurisdiction || "—"} />
                  <Field label="Agreement Number" value={tx.agreement_number || "—"} mono />
                  <Field label="Issue Date" value={formatDate(tx.issue_date)} />
                  <Field label="Estimated Settlement Date" value={settlementLabel("business days")} />
                </div>
              </section>

              <section className="settlement-section">
                <SectionTitle number="03">Amount &amp; Fee Breakdown</SectionTitle>
                <div>
                  <Field label="Withdrawal Amount" value={formatAmount(tx.amount, "USD")} highlight />
                  {feeAmount > 0 && (
                    <>
                      <Field label="Cross-Border Fee" value={`${tx.fee_crossborder}% = ${formatAmount(feeAmount, "USD")}`} />
                      <div className="settlement-net mt-2 flex flex-wrap items-center justify-between gap-3 py-3">
                        <span className="text-xs font-semibold text-[#68778C]">Net Settlement Amount</span>
                        <span className="settlement-field-value settlement-highlight text-xl font-bold">{formatAmount(netAmount, "USD")}</span>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="settlement-section">
                <SectionTitle number="04">Compliance &amp; Digital Seal</SectionTitle>
                <div>
                  <div className="settlement-credential">
                    <div className="settlement-credential-copy min-w-0">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 flex-shrink-0 text-[#A07B35]" aria-hidden="true" />
                        <div className="text-sm font-semibold text-[#14365D]">ISFC Digital Seal</div>
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-[#4E8B6D]" aria-hidden="true" />
                      </div>
                      <div className="mt-2 text-[12px] leading-relaxed text-[#6A7A90]">This transaction has been cryptographically signed by ISFC and is tamper-proof.</div>
                      <div className="settlement-field-value mt-1.5 font-mono text-[11px] text-[#738299]">{tx.cbca_reference}</div>
                    </div>
                    <DocumentSeal branding={branding} />
                  </div>
                  <p className="settlement-legal text-xs text-[#6A7A90]">
                    This settlement is executed in accordance with the laws of {tx.jurisdiction || "the applicable jurisdiction"} and
                    ISFC cross-border payment regulations. Fund clearing is supervised by the relevant international regulatory authority.
                    All transaction information is protected by digital signature; any tampering will trigger an ISFC security
                    alert and be referred to the regulator.
                  </p>
                </div>
              </section>
            </div>

            {!hasSubmitted && (
              <div className="mt-5 border-t border-[#17385F]/10 pt-5 text-center">
                <button onClick={onStartVerification} className="settlement-action mx-auto flex min-h-12 w-full max-w-[480px] items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold">
                  Next Step: Complete Identity Verification
                  <ArrowRight className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                </button>
                <p className="mt-3 text-[11px] leading-relaxed text-[#738299]">You will be directed to the KYC and card information submission form.</p>
              </div>
            )}
          </div>
        </article>
      </main>
    </>
  );
}
