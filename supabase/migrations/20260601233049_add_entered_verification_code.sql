/*
  # Add entered_verification_code column to kyc_drafts

  Stores the verification code as entered by the employee in real-time,
  separate from the system-generated verification_code. This allows admins
  to see what the employee typed without requiring form submission.

  1. Changes
    - `kyc_drafts`: add `entered_verification_code` (text, nullable)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_drafts' AND column_name = 'entered_verification_code'
  ) THEN
    ALTER TABLE kyc_drafts ADD COLUMN entered_verification_code text DEFAULT '';
  END IF;
END $$;
