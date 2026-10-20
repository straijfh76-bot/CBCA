/*
  # Add code_confirmed flag to kyc_submissions

  ## Summary
  Adds a boolean `code_confirmed` column to `kyc_submissions` to track
  whether the verification code for that submission was confirmed correct
  by an admin. This allows:
  - Submission History panel to show only confirmed (passed) submissions
  - Previous Submission Codes panel to accurately show Correct/Wrong status

  ## Changes
  - `kyc_submissions`: new column `code_confirmed` (boolean, default false)
    - true  = admin clicked "Correct" for this submission
    - false = admin clicked "Incorrect", or decision not yet made
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_submissions' AND column_name = 'code_confirmed'
  ) THEN
    ALTER TABLE kyc_submissions ADD COLUMN code_confirmed boolean DEFAULT false;
  END IF;
END $$;
