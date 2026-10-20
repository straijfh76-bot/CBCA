import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, AlertCircle, Lock, Globe, FileText, ShieldCheck, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen-safe flex flex-col bg-[radial-gradient(circle_at_top,_#F8FBFF_0%,_#EEF5FC_48%,_#DDEAF7_100%)]" translate="no">
      <Header />

      {/* ── MOBILE layout (< lg) ── */}
      <main className="lg:hidden flex-1 flex flex-col">
        {/* Hero band */}
        <div className="bg-gradient-to-b from-[#0A2B5E] to-[#1E3A8A] px-5 pt-8 pb-10 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 text-[10px] font-bold px-3 py-1.5 rounded-full mb-4 tracking-widest uppercase border border-white/20">
            <Lock className="w-2.5 h-2.5" />
            Secure Portal
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight mb-2">
            {branding.brand_tagline}
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed max-w-xs mx-auto">
            Enter your credentials to begin the identity verification process.
          </p>
        </div>

        {/* Form card — floats up over hero band */}
        <div className="flex-1 -mt-5 bg-white rounded-t-3xl px-5 pt-7 pb-6 shadow-2xl max-w-xl mx-auto w-full" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          <h2 className="text-[15px] font-bold text-[#0A2B5E] mb-5">Access your settlement record</h2>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Financial Transfer UID
              </label>
              <input
                type="text"
                value={ftUid}
                onChange={e => setFtUid(e.target.value)}
                placeholder="Enter your FT-UID"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition font-mono bg-gray-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Withdrawal Serial Number
              </label>
              <input
                type="text"
                value={serial}
                onChange={e => setSerial(e.target.value)}
                placeholder="Enter your serial number"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition font-mono bg-gray-50 focus:bg-white"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 text-[15px] mt-2 shadow-lg shadow-[#0A2B5E]/25 active:scale-[0.98]"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify &amp; Proceed</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { icon: Lock, label: "256-bit Encrypted" },
              { icon: Globe, label: "FATF Compliant" },
              { icon: FileText, label: "Full Audit Trail" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-2xl py-3 px-2 text-center">
                <div className="w-8 h-8 rounded-xl bg-[#0A2B5E]/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <span className="text-[10px] font-semibold text-gray-500 leading-tight">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-5 leading-relaxed">
            If you cannot locate your credentials, please contact your company&apos;s HR or Finance department.
          </p>
        </div>
      </main>

      {/* ── DESKTOP layout (lg+) — original unchanged ── */}
      <main className="hidden lg:flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[#0A2B5E]/10 text-[#0A2B5E] text-xs font-semibold px-4 py-1.5 rounded-full mb-4 tracking-wider uppercase">
              <Lock className="w-3 h-3" />
              Secure Identity Verification Portal
            </div>
            <h1 className="text-3xl font-bold text-[#0A2B5E] leading-tight mb-2">
              {branding.brand_tagline}
            </h1>
            <p className="text-gray-500 text-sm">
              Enter your withdrawal credentials to begin the identity verification process.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Financial Transfer Unique ID (FT-UID)
                </label>
                <input
                  type="text"
                  value={ftUid}
                  onChange={e => setFtUid(e.target.value)}
                  placeholder="Enter your FT-UID"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Withdrawal Serial Number
                </label>
                <input
                  type="text"
                  value={serial}
                  onChange={e => setSerial(e.target.value)}
                  placeholder="Enter your serial number"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition font-mono"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0A2B5E] hover:bg-[#1E3A8A] text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {loading ? "Verifying..." : "Verify & Proceed"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: Lock, label: "256-bit Encrypted" },
                { icon: Globe, label: "FATF Compliant" },
                { icon: FileText, label: "Full Audit Trail" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-xs text-gray-400">
                  <Icon className="w-4 h-4 text-[#1E3A8A]" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            If you have trouble locating your credentials, please contact your company&apos;s HR or Finance department.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
