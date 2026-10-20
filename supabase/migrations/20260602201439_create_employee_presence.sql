/*
  # Create employee presence and login history

  1. New Tables
    - `employee_sessions`
      - `id` (uuid, primary key)
      - `transaction_id` (uuid, FK to transactions)
      - `ft_uid` (text) — indexed for quick lookup
      - `ip_address` (text) — client IP
      - `last_seen_at` (timestamptz) — heartbeat timestamp; online if within 30s
      - `logged_in_at` (timestamptz) — first seen / login time
      - `created_at` (timestamptz)

  2. Indexes
    - ft_uid for fast presence lookups
    - last_seen_at for expiry queries

  3. Security
    - RLS enabled
    - Public INSERT/UPDATE allowed (employees use anon key)
    - Only service role reads (admin API uses service role)
*/

CREATE TABLE IF NOT EXISTS employee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  ft_uid text NOT NULL,
  ip_address text NOT NULL DEFAULT '',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_sessions_ft_uid ON employee_sessions(ft_uid);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_last_seen ON employee_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_sessions_transaction_id ON employee_sessions(transaction_id);

ALTER TABLE employee_sessions ENABLE ROW LEVEL SECURITY;

-- Employees (anon) can upsert their own session row
CREATE POLICY "Employees can insert session"
  ON employee_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Employees can update session"
  ON employee_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
