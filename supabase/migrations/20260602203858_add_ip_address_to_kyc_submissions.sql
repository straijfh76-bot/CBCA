/*
  # Add ip_address to kyc_submissions

  Stores the employee's IP address at the time of form submission,
  so admins can see where each submission originated.

  1. Changes
    - `kyc_submissions` — new nullable column `ip_address text`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_submissions' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE kyc_submissions ADD COLUMN ip_address text;
  END IF;
END $$;
