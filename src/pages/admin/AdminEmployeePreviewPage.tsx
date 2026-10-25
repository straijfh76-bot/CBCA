import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import TransactionView, { type Banner } from "../../components/TransactionView";
import { adminGetTransaction, getNotifications } from "../../lib/api";
import type { Transaction, KycDraft } from "../../lib/types";

const noop = () => {};

export default function AdminEmployeePreviewPage() {
  const { txId } = useParams<{ txId: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [kyc, setKyc] = useState<KycDraft | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!txId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await adminGetTransaction(txId);
        if (cancelled || !res?.transaction) return;
        setTx(res.transaction);
        setKyc(res.kyc || null);
        setError(false);
        const notifs = await getNotifications(res.transaction.ft_uid);
        if (cancelled) return;
        setBanners(notifs.filter(n => n.mode === "banner" && n.is_fixed).map(n => ({ id: n.id, title: n.title, content: n.content })));
      } catch {
        if (!cancelled) setError(true);
      }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [txId]);

  if (!tx) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center text-sm text-gray-500">
        {error ? "Unable to load preview." : <span className="w-8 h-8 border-2 border-[#1E3A8A]/20 border-t-[#1E3A8A] rounded-full animate-spin" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe flex flex-col">
      <Header ftUid={tx.ft_uid} />
      <TransactionView
        tx={tx}
        kycSubmitted={!!kyc?.is_submitted}
        banners={banners}
        onBack={noop}
        onStartVerification={noop}
        onResubmit={noop}
      />
      <Footer />
    </div>
  );
}
