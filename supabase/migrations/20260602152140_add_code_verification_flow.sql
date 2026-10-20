/*
  # Add Code Verification Flow

  ## Summary
  Adds a new intermediate status `awaiting_admin_confirmation` to the transaction review flow.
  When an employee submits their verification code, the transaction enters this status and 
  waits for admin to confirm or reject the code before final submission.

  ## Changes

  ### transactions table
  - Add `code_submitted_at` (timestamptz): When the employee submitted the form with the verification code
  - Extend `review_status` check constraint to include `awaiting_admin_confirmation`

  ## Notes
  - `awaiting_admin_confirmation` sits between employee code submission and final admin review
  - Admin can respond with "confirmed" (moves to pending) or "failed" (moves back, employee must resend)
  - If 5 minutes elapse without admin response, the employee frontend shows a timeout message
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'code_submitted_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN code_submitted_at timestamptz;
  END IF;
END $$;

-- Drop old check constraint and recreate with new status value
DO $$
BEGIN
  -- Try to drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'transactions' AND constraint_name = 'transactions_review_status_check'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_review_status_check;
  END IF;
  
  -- Find and drop any check constraint on review_status by looking at pg_constraint
  DECLARE
    rec record;
  BEGIN
    FOR rec IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'transactions'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%review_status%'
    LOOP
      EXECUTE format('ALTER TABLE transactions DROP CONSTRAINT %I', rec.conname);
    END LOOP;
  END;
END $$;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_review_status_check
  CHECK (review_status IN ('draft','pending','processing','approved','failed','awaiting_admin_confirmation'));
