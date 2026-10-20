/*
# Prevent double-counting a failed verification attempt

1. Modified Tables
- `verification_attempts`
  - `counted_submission_id` (uuid, nullable): the submission whose failure was last counted.
    Used so a single submission is counted at most once, even if it both times out
    and is later rejected by the admin.

2. Security
- No policy changes. The table is only accessed by the server.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_attempts' AND column_name = 'counted_submission_id'
  ) THEN
    ALTER TABLE verification_attempts ADD COLUMN counted_submission_id uuid;
  END IF;
END $$;