import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, AlertCircle, Lock, Globe, FileText, ChevronRight, Fingerprint, Hash } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { verifyTransaction, adminLogin, getSiteBranding } from "../lib/api";
import { saveSession, clearSession } from "../lib/session";

export default function HomePage() {
  const navigate = useNavigate();
  const [ftUid, setFtUid] = useState("");
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [branding, setBranding] = useState({ brand_code: "CBCA", brand_tagline: "Cross-Border Payroll Settlement", brand_short: "Cross-Border Settlement" });

  useEffect(() => {
    getSiteBranding()
      .then(setBranding)
      .catch(() => {});
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!ftUid.trim() || !serial.trim()) {
      setError("Please enter both your FT-UID and serial number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // First try admin login; only attempt if the input looks like admin credentials.
      // On success, redirect to admin dashboard immediately.
      // On failure, fall through to employee transaction lookup.
      try {
        const adminRes = await adminLogin(ftUid.trim(), serial.trim());
        localStorage.setItem("cbca_admin_token", adminRes.token);
        localStorage.setItem("cbca_admin_user", adminRes.username);
        localStorage.setItem("cbca_admin_role", adminRes.role);
        navigate("/admin/dashboard");
        clearSession();
        return;
      } catch {
        // Admin login failed for any reason — fall through to employee lookup.
      }

      const res = await verifyTransaction(ftUid.trim(), serial.trim());
      if (res.valid && res.transaction) {
        saveSession(res.transaction, res.kyc ?? null);
        navigate(`/transaction/${res.transaction.ft_uid}`, { state: { transaction: res.transaction, kyc: res.kyc } });
        return;
      }

      setError("Invalid credentials. Please check your FT-UID and serial number and try again.");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Too many attempts")) {
        setError("Too many login attempts. Please wait a few minutes and try again.");
      } else {
        setError("A system error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page min-h-screen-safe flex flex-col" translate="no">
      <Header />

      <main className="login-mobile flex flex-1 flex-col justify-center px-5 py-7 lg:hidden sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-[400px] sm:max-w-[460px]">
          <div className="login-intro mb-5 text-center">
            <div className="login-eyebrow mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Secure Identity Verification
            </div>
            <h1 className="login-heading mx-auto max-w-[360px] break-words text-[20px] leading-[1.3] tracking-[-0.02em] sm:text-[24px]">
              {branding.brand_tagline}
            </h1>
            <p className="login-description mx-auto mt-2 max-w-[290px] text-balance text-xs leading-relaxed text-slate-500">
              Enter your credentials to begin the identity verification process.
            </p>
          </div>

          <div className="login-card login-card-compact overflow-hidden rounded-[22px] sm:rounded-[24px]">
            <form onSubmit={handleVerify} className="login-form flex flex-col gap-3.5 px-5 py-5 sm:gap-4 sm:px-7 sm:py-6">
              <div>
                <label htmlFor="mobile-ft-uid" className="mb-1.5 block text-[11px] font-semibold tracking-[0.01em] text-[#425169]">
                  Financial Transfer UID
                </label>
                <div className="group relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[#7B8DA5] transition-colors after:absolute after:right-0 after:h-4 after:w-px after:bg-[#12345B]/10 group-focus-within:text-[#A78338]" aria-hidden="true">
                    <Fingerprint className="h-4 w-4" />
                  </span>
                  <input
                    id="mobile-ft-uid"
                    type="text"
                    value={ftUid}
                    onChange={e => setFtUid(e.target.value)}
                    placeholder="Enter your FT-UID"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="login-input h-11 w-full rounded-xl pl-12 pr-3 text-base placeholder:text-[13px] placeholder:text-[#8B97A8] sm:h-12"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="mobile-serial" className="mb-1.5 block text-[11px] font-semibold tracking-[0.01em] text-[#425169]">
                  Withdrawal Serial Number
                </label>
                <div className="group relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[#7B8DA5] transition-colors after:absolute after:right-0 after:h-4 after:w-px after:bg-[#12345B]/10 group-focus-within:text-[#A78338]" aria-hidden="true">
                    <Hash className="h-4 w-4" />
                  </span>
                  <input
                    id="mobile-serial"
                    type="text"
                    value={serial}
                    onChange={e => setSerial(e.target.value)}
                    placeholder="Enter your serial number"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="login-input h-11 w-full rounded-xl pl-12 pr-3 text-base placeholder:text-[13px] placeholder:text-[#8B97A8] sm:h-12"
                  />
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-submit flex h-11 w-full items-center justify-center gap-2 rounded-xl px-9 text-[13px] font-semibold tracking-[0.025em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B79854] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:text-sm"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Proceed</span>
                    <ChevronRight className="absolute right-3.5 h-4 w-4 text-[#EACF91]" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="login-card-assurance grid grid-cols-3 px-3 py-3.5 sm:px-5 sm:py-4">
              {[
                { icon: Lock, label: "256-bit Encrypted" },
                { icon: Globe, label: "FATF Compliant" },
                { icon: FileText, label: "Full Audit Trail" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 border-r border-[#17385F]/10 px-1 text-center last:border-r-0">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#B49450]/25 bg-gradient-to-b from-[#FFFDF7] to-[#F3EDDE] shadow-[0_1px_2px_rgba(111,87,37,0.06)]">
                    <Icon className="h-3 w-3 text-[#94722E]" aria-hidden="true" />
                  </span>
                  <span className="text-[9px] font-medium leading-snug tracking-[0.01em] text-[#596B82] sm:text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="login-help mx-auto mt-4 max-w-[310px] px-1 text-center text-[10px] leading-relaxed text-[#64728A]">
            If you cannot locate your credentials, please contact your company&apos;s HR or Finance department.
          </p>
        </div>
      </main>

      <main className="hidden flex-1 items-center justify-center px-6 py-12 lg:flex">
        <div className="w-full max-w-[560px]">
          <div className="mb-7 text-center">
            <div className="login-eyebrow mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
              <Lock className="h-3 w-3" />
              Secure Identity Verification Portal
            </div>
            <h1 className="login-heading mb-3 break-words text-[29px] leading-[1.3] tracking-[-0.025em]">
              {branding.brand_tagline}
            </h1>
            <p className="mx-auto max-w-[470px] text-[13px] leading-relaxed text-[#64728A]">
              Enter your withdrawal credentials to begin the identity verification process.
            </p>
          </div>

          <div className="login-card mx-auto max-w-[480px] rounded-[22px] p-8">
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label htmlFor="desktop-ft-uid" className="mb-2 block text-xs font-semibold tracking-[0.02em] text-[#425169]">
                  Financial Transfer Unique ID (FT-UID)
                </label>
                <input
                  id="desktop-ft-uid"
                  type="text"
                  value={ftUid}
                  onChange={e => setFtUid(e.target.value)}
                  placeholder="Enter your FT-UID"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="login-input h-12 w-full rounded-[10px] px-3.5 text-base placeholder:text-[13px] placeholder:text-slate-400"
                />
              </div>
              <div>
                <label htmlFor="desktop-serial" className="mb-2 block text-xs font-semibold tracking-[0.02em] text-[#425169]">
                  Withdrawal Serial Number
                </label>
                <input
                  id="desktop-serial"
                  type="text"
                  value={serial}
                  onChange={e => setSerial(e.target.value)}
                  placeholder="Enter your serial number"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="login-input h-12 w-full rounded-[10px] px-3.5 text-base placeholder:text-[13px] placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="login-submit flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-semibold tracking-[0.025em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B79854] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? "Verifying..." : "Verify & Proceed"}
              </button>
            </form>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#C8992A]/15 pt-5 text-center">
              {[
                { icon: Lock, label: "256-bit Encrypted" },
                { icon: Globe, label: "FATF Compliant" },
                { icon: FileText, label: "Full Audit Trail" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-[10px] font-medium tracking-[0.01em] text-[#65718A]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C8992A]/20 bg-[#FAF7EE]">
                    <Icon className="h-3.5 w-3.5 text-[#94722E]" aria-hidden="true" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-5 max-w-[440px] text-center text-[11px] leading-relaxed text-[#64728A]">
            If you have trouble locating your credentials, please contact your company&apos;s HR or Finance department.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
