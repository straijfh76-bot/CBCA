/*
# Add code expiry (超时模式) to test-mode settings

1. Modified Tables
   - `verification_mode_config`
     - `code_expiry_seconds` (int, default 0) — seconds after sending a code
       before it expires if not submitted. 0 = off. Applies to both modes.
   - `verification_attempts`
     - `expired_code_sent_at` (timestamptz, nullable) — the send time of the
       last code already counted as expired, so one code is never counted twice.

2. Security
   - No policy changes; both tables keep their existing RLS.
*/
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_mode_config' AND column_name = 'code_expiry_seconds') THEN
    ALTER TABLE verification_mode_config ADD COLUMN code_expiry_seconds int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_attempts' AND column_name = 'expired_code_sent_at') THEN
    ALTER TABLE verification_attempts ADD COLUMN expired_code_sent_at timestamptz;
  END IF;
END $$;