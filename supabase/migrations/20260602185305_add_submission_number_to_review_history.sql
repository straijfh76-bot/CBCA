/*
  # Add submission_number to review_history

  ## Summary
  Adds `submission_number` column to `review_history` so each confirm-code
  decision can be precisely linked to the submission it reviewed. This fixes
  the fragile array-index matching used in the admin Verification Code panel.

  ## Changes
  - `review_history`: new column `submission_number` (integer, nullable for
    legacy records created before this migration)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_history' AND column_name = 'submission_number'
  ) THEN
    ALTER TABLE review_history ADD COLUMN submission_number integer;
  END IF;
END $$;
