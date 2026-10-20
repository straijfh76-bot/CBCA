import React, { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import TransactionPage from "./pages/TransactionPage";
import CardSelectPage from "./pages/CardSelectPage";
import KycPage from "./pages/KycPage";
import BlockchainKycForm from "./pages/BlockchainKycForm";
import SubmittedPage from "./pages/SubmittedPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTransactionPage from "./pages/admin/AdminTransactionPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAnnouncementPage from "./pages/admin/AdminAnnouncementPage";
import AdminEmployeePreviewPage from "./pages/admin/AdminEmployeePreviewPage";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(err: unknown) {
    return { hasError: true, error: err instanceof Error ? err.message : String(err) };
  }
  componentDidCatch(_error: Error) {
    // No auto-reload: translate="no" on <html> prevents browser translation from
    // corrupting the DOM, so crash-loops from Google Translate are no longer possible.
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen-safe flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#F8FBFF_0%,_#EEF5FC_48%,_#DDEAF7_100%)] px-4 text-center">
          <div className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_64px_-12px_rgba(6,20,46,0.3)] ring-1 ring-black/5 animate-dialog-pop">
            <div className="h-1 bg-gradient-to-r from-rose-400 via-red-500 to-rose-600" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-rose-100/80 via-red-50/50 to-transparent" />
            <div className="relative px-6 pt-8 pb-6">
              <div className="relative mx-auto mb-5 h-16 w-16">
                <span className="absolute inset-0 scale-125 rounded-full bg-rose-200/60 opacity-60" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-red-600/30 ring-4 ring-white">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <h2 className="text-[18px] font-bold leading-tight text-[#0A2B5E]">Something went wrong</h2>
              <p className="mt-2.5 text-[14px] leading-relaxed text-slate-500">An unexpected error occurred. Please return to the home page and try again.</p>
            </div>
            <div className="relative px-6 pb-6">
              <button
                onClick={() => { this.setState({ hasError: false, error: "" }); window.location.href = "/"; }}
                className="w-full rounded-2xl bg-gradient-to-r from-[#0A2B5E] to-[#1E3A8A] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0A2B5E]/25 transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("cbca_admin_token");
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("cbca_admin_token");
  const role = localStorage.getItem("cbca_admin_role");
  if (!token) return <Navigate to="/" replace />;
  if (role !== "super") return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

function EmployeeScrollbarToggle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.classList.toggle("hide-scrollbars", !pathname.startsWith("/admin"));
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <EmployeeScrollbarToggle />
        <Routes>
          {/* Employee routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/transaction/:ftUid" element={<TransactionPage />} />
          <Route path="/card-select/:ftUid" element={<CardSelectPage />} />
          <Route path="/kyc/:ftUid" element={<KycPage />} />
          <Route path="/blockchain-kyc/:ftUid" element={<BlockchainKycForm />} />
          <Route path="/submitted/:ftUid" element={<SubmittedPage />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<Navigate to="/" replace />} />
          <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
          <Route path="/admin/transaction/:txId" element={<AdminGuard><AdminTransactionPage /></AdminGuard>} />
          <Route path="/admin/preview/:txId" element={<AdminGuard><AdminEmployeePreviewPage /></AdminGuard>} />
          <Route path="/admin/users" element={<SuperAdminGuard><AdminUsersPage /></SuperAdminGuard>} />
          <Route path="/admin/announcement" element={<AdminGuard><AdminAnnouncementPage /></AdminGuard>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
