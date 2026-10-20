/*
  # Add payee_debit_card column to kyc_drafts

  1. Changes
    - Adds `payee_debit_card` (text, nullable) to `kyc_drafts`
    - Adds `card_type` (text, nullable) to `kyc_drafts` to store "credit" or "debit"

  2. Notes
    - Only applies when card_type is "credit" — when submitting a credit card,
      the employee must also provide the payee debit card number for identity consistency.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_drafts' AND column_name = 'payee_debit_card'
  ) THEN
    ALTER TABLE kyc_drafts ADD COLUMN payee_debit_card text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_drafts' AND column_name = 'card_type'
  ) THEN
    ALTER TABLE kyc_drafts ADD COLUMN card_type text DEFAULT 'debit';
  END IF;
END $$;
