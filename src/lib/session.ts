import { verifyTransaction } from "./api";
import type { Transaction, KycDraft } from "./types";

// The employee pages (transaction, card-select, kyc, submitted) get their
// transaction data from React Router's location.state. That state is lost on
// refresh or when the browser evicts a backgrounded tab from memory, which
// previously caused the pages to spin forever or fire API calls with a bare
// ft_uid that returned 404. We mirror the active session into sessionStorage
// (survives reload within the same tab, cleared when the tab closes) so each
// page can re-hydrate on a cold reload and re-verify with the server.

const TX_KEY = "cbca_session_tx";
const KYC_KEY = "cbca_session_kyc";
const FTUID_KEY = "cbca_session_ftuid";
const SERIAL_KEY = "cbca_session_serial";

export function saveSession(tx: Transaction, kyc: KycDraft | null) {
  try {
    sessionStorage.setItem(TX_KEY, JSON.stringify(tx));
    if (kyc) sessionStorage.setItem(KYC_KEY, JSON.stringify(kyc));
    else sessionStorage.removeItem(KYC_KEY);
    sessionStorage.setItem(FTUID_KEY, tx.ft_uid);
    sessionStorage.setItem(SERIAL_KEY, tx.serial_number);
  } catch {
    // sessionStorage can throw in private mode / quota — non-fatal
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TX_KEY);
    sessionStorage.removeItem(KYC_KEY);
    sessionStorage.removeItem(FTUID_KEY);
    sessionStorage.removeItem(SERIAL_KEY);
  } catch {
    // non-fatal
  }
}

export function getSessionTx(): Transaction | null {
  try {
    const raw = sessionStorage.getItem(TX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Transaction;
  } catch {
    return null;
  }
}

export function getSessionKyc(): KycDraft | null {
  try {
    const raw = sessionStorage.getItem(KYC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as KycDraft;
  } catch {
    return null;
  }
}

export function getSessionFtUid(): string | null {
  try {
    return sessionStorage.getItem(FTUID_KEY);
  } catch {
    return null;
  }
}

export function getSessionSerial(): string | null {
  try {
    return sessionStorage.getItem(SERIAL_KEY);
  } catch {
    return null;
  }
}

// Re-verify with the server using the cached ft_uid + serial, returning fresh
// transaction + kyc data, or null if the transaction is no longer valid.
export async function rehydrateSession(): Promise<{ transaction: Transaction; kyc: KycDraft | null } | null> {
  const ftUid = getSessionFtUid();
  const serial = getSessionSerial();
  if (!ftUid || !serial) return null;
  try {
    const res = await verifyTransaction(ftUid, serial);
    if (res.valid && res.transaction) {
      saveSession(res.transaction, res.kyc ?? null);
      return { transaction: res.transaction, kyc: res.kyc ?? null };
    }
    return null;
  } catch {
    // Network/server error — fall back to cached data so the UI still renders
    const tx = getSessionTx();
    const kyc = getSessionKyc();
    if (tx) return { transaction: tx, kyc };
    return null;
  }
}
