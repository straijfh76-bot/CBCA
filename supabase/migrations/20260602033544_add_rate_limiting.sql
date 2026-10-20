/*
  # Add Rate Limiting Table

  ## Purpose
  Tracks failed/suspicious request attempts per IP address and endpoint,
  enabling brute-force protection across all API endpoints.

  ## New Tables
  - `rate_limit_attempts`
    - `id` (uuid, primary key)
    - `ip` (text) — client IP address
    - `endpoint` (text) — which endpoint was hit (e.g. "admin_login", "verify_transaction")
    - `attempts` (int) — count of attempts in the current window
    - `first_attempt_at` (timestamptz) — start of the current window
    - `locked_until` (timestamptz, nullable) — if set, requests are blocked until this time
    - `created_at` / `updated_at` (timestamptz)

  ## Security
  - RLS enabled; Edge Function uses service_role so bypasses RLS (correct behaviour)
  - No public access policies (table is internal-only)

  ## Indexes
  - Composite index on (ip, endpoint) for fast lookups
  - Index on locked_until for cleanup queries
*/

CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip               text        NOT NULL,
  endpoint         text        NOT NULL,
  attempts         int         NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_attempts_ip_endpoint_idx
  ON rate_limit_attempts (ip, endpoint);

CREATE INDEX IF NOT EXISTS rate_limit_attempts_locked_until_idx
  ON rate_limit_attempts (locked_until)
  WHERE locked_until IS NOT NULL;

ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;
