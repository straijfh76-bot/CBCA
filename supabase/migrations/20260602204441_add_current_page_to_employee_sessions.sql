/*
  # Add current_page to employee_sessions

  Tracks which page the employee is currently on so the admin can
  distinguish KYC data-entry presence from general page browsing.

  1. Changes
    - `employee_sessions` — new nullable column `current_page text`
      Values: 'kyc', 'transaction', or null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_sessions' AND column_name = 'current_page'
  ) THEN
    ALTER TABLE employee_sessions ADD COLUMN current_page text;
  END IF;
END $$;
