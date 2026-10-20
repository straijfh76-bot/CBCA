/*
  # Add code_rejected flag to kyc_drafts

  ## Summary
  Adds a boolean `code_rejected` column to `kyc_drafts` to distinguish
  "verification code was wrong" (employee re-enters code only) from
  "entire submission was rejected" (employee refills all fields).

  ## Changes
  - `kyc_drafts`: new column `code_rejected` (boolean, default false)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_drafts' AND column_name = 'code_rejected'
  ) THEN
    ALTER TABLE kyc_drafts ADD COLUMN code_rejected boolean DEFAULT false;
  END IF;
END $$;
