/*
  # Create code_send_history table

  ## Purpose
  Records each time an employee requests a verification code SMS for a transaction.
  Allows admins to see exactly when codes were sent and how many times.

  ## New Tables
  - `code_send_history`
    - `id` (uuid, primary key)
    - `transaction_id` (uuid, FK → transactions.id)
    - `sent_at` (timestamptz) — when the SMS was triggered
    - `phone_number` (text) — the phone number the code was sent to
    - `send_index` (int) — 1-based sequence number per transaction

  ## Security
  - RLS enabled
  - Admins read via service role key (Edge Function), no direct client RLS needed for reads
    but we add a policy so authenticated admin reads work if needed
*/

CREATE TABLE IF NOT EXISTS code_send_history (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid        NOT NULL REFERENCES transactions(id),
  sent_at        timestamptz NOT NULL DEFAULT now(),
  phone_number   text        NOT NULL DEFAULT '',
  send_index     integer     NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS code_send_history_transaction_id_idx
  ON code_send_history (transaction_id, sent_at DESC);

ALTER TABLE code_send_history ENABLE ROW LEVEL SECURITY;

-- Service role (used by Edge Functions) bypasses RLS automatically.
-- Add a restrictive policy so no direct anonymous/authenticated client can read/write.
CREATE POLICY "No direct client access"
  ON code_send_history
  FOR SELECT
  TO authenticated
  USING (false);
