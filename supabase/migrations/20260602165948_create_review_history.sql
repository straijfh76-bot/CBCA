/*
  # Create review_history table

  ## Purpose
  Records every time an admin saves a review decision for a transaction,
  so admins can see the full audit trail of status changes and notes.

  ## New Tables
  - `review_history`
    - `id` (uuid, primary key)
    - `transaction_id` (uuid, FK → transactions.id)
    - `admin_username` (text) — who made the change
    - `review_status` (text) — the status set at this point
    - `review_note` (text) — the note at this point
    - `reviewed_at` (timestamptz) — when the decision was recorded
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled; service role (Edge Functions) bypasses RLS.
  - No direct authenticated client access allowed.
*/

CREATE TABLE IF NOT EXISTS review_history (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid        NOT NULL REFERENCES transactions(id),
  admin_username text        NOT NULL DEFAULT '',
  review_status  text        NOT NULL DEFAULT '',
  review_note    text        NOT NULL DEFAULT '',
  reviewed_at    timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_history_transaction_id_idx
  ON review_history (transaction_id, reviewed_at DESC);

ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access"
  ON review_history
  FOR SELECT
  TO authenticated
  USING (false);
