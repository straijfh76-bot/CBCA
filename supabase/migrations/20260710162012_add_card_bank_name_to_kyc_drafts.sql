DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_drafts' AND column_name = 'card_bank_name'
  ) THEN
    ALTER TABLE kyc_drafts ADD COLUMN card_bank_name text DEFAULT '';
  END IF;
END $$;