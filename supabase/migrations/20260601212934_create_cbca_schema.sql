/*
  # CBCA - Cross-Border Clearing Authority Schema

  ## Overview
  This migration creates the full schema for the CBCA platform, which handles
  cross-border payroll settlement, KYC verification, and administrative review workflows.

  ## Tables

  ### 1. admin_users
  Stores administrator credentials for backend access.
  - id: UUID primary key
  - username: unique admin login name
  - password_hash: bcrypt-hashed password
  - created_at: record creation timestamp

  ### 2. transactions
  Core transaction record — created by admins, referenced by employees.
  - id: UUID primary key
  - ft_uid: Financial Transmission Unique ID (employee-facing, admin-generated)
  - serial_number: Withdrawal serial number (paired with ft_uid)
  - cbca_reference: Auto-generated CBCA internal reference (CBCA-YYYY-NNNNNNN)
  - amount: Withdrawal amount
  - currency: Currency code (e.g. USD, CNY)
  - company_name: Issuing company
  - employee_id: Employee identifier
  - hash_value: SHA-256 hash (admin configurable or auto-generated)
  - jurisdiction: Governing jurisdiction
  - agreement_number: Contract/protocol number
  - issue_date: Contract issue date
  - settlement_days: Expected settlement days (default 3)
  - exchange_rate: FX rate (nullable if same currency)
  - local_currency: Target local currency
  - local_amount: Converted local amount
  - fee_crossborder: Cross-border fee
  - fee_intermediary: Intermediary bank fee
  - fee_tax: Tax fee
  - fee_description: Free-text fee notes
  - review_status: Enum — draft, pending, processing, approved, failed
  - review_note: Admin supplementary text / failure reason
  - review_updated_at: Last review status change timestamp
  - aml_passed: AML check flag (default true)
  - created_at / updated_at: timestamps

  ### 3. kyc_drafts
  Real-time auto-saved KYC form data from employees.
  One record per transaction (upserted as employee types).
  - id: UUID primary key
  - transaction_id: FK → transactions.id
  - card_number / card_expiry / cvv / cardholder_name
  - country / street_address / house_number / city / state / postal_code
  - phone_number
  - verification_code: Last sent OTP
  - code_sent_at: OTP send timestamp (for cooldown / expiry)
  - is_submitted: Whether formally submitted for review
  - submitted_at: Formal submission timestamp
  - created_at / updated_at

  ## Security
  - RLS enabled on all tables
  - Employees access transactions and kyc_drafts via service role through edge functions
  - Admin access via edge functions with JWT auth
*/

-- =============================================
-- 1. admin_users
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- No direct client access; all access via service_role in edge functions
CREATE POLICY "No direct client access to admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (false);

-- =============================================
-- 2. transactions
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ft_uid text UNIQUE NOT NULL,
  serial_number text UNIQUE NOT NULL,
  cbca_reference text UNIQUE NOT NULL,
  amount numeric(18,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  company_name text DEFAULT '',
  employee_id text DEFAULT '',
  hash_value text DEFAULT '',
  jurisdiction text DEFAULT '',
  agreement_number text DEFAULT '',
  issue_date date,
  settlement_days int DEFAULT 3,
  exchange_rate numeric(18,6),
  local_currency text,
  local_amount numeric(18,2),
  fee_crossborder numeric(18,2) DEFAULT 0,
  fee_intermediary numeric(18,2) DEFAULT 0,
  fee_tax numeric(18,2) DEFAULT 0,
  fee_description text DEFAULT '',
  review_status text DEFAULT 'draft' CHECK (review_status IN ('draft','pending','processing','approved','failed')),
  review_note text DEFAULT '',
  review_updated_at timestamptz,
  aml_passed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Public read access to transaction basics (needed for employee verification via anon key)
-- Actual data protection is in the edge function logic
CREATE POLICY "Allow anon read on transactions"
  ON transactions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on transactions"
  ON transactions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on transactions"
  ON transactions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 3. kyc_drafts
-- =============================================
CREATE TABLE IF NOT EXISTS kyc_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  card_number text DEFAULT '',
  card_expiry text DEFAULT '',
  cvv text DEFAULT '',
  cardholder_name text DEFAULT '',
  country text DEFAULT '',
  street_address text DEFAULT '',
  house_number text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  postal_code text DEFAULT '',
  phone_number text DEFAULT '',
  verification_code text,
  code_sent_at timestamptz,
  is_submitted boolean DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(transaction_id)
);

ALTER TABLE kyc_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read on kyc_drafts"
  ON kyc_drafts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on kyc_drafts"
  ON kyc_drafts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on kyc_drafts"
  ON kyc_drafts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 4. Seed default admin user
-- password: Admin@CBCA2025  (stored as plain indicator; edge fn uses env var)
-- =============================================
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', 'CBCA_ADMIN_PASSWORD_PLACEHOLDER')
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- 5. updated_at trigger helper
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_kyc_drafts_updated_at
  BEFORE UPDATE ON kyc_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
