/*
# Count code sends and failed attempts separately per card type

1. Modified Tables
- `code_send_history`: new `card_type` column (text, 'credit' or 'debit', default 'debit') recording which verification page sent the code.
- `verification_attempts`: new `card_type` column (text, 'credit' or 'debit', default 'debit'); each transaction now keeps one failed-attempt counter per card type.

2. Index changes
- Unique index on `verification_attempts(transaction_id)` replaced by a unique index on `(transaction_id, card_type)` so credit and debit counters are independent.
- Index on `code_send_history(transaction_id, card_type, sent_at)` for per-card-type send counting.

3. Data
- Existing rows are backfilled from the card type stored on the transaction's KYC draft (falls back to 'debit'). No data is removed.

4. Security
- No RLS or policy changes.
*/

ALTER TABLE code_send_history ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'debit';
ALTER TABLE verification_attempts ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'debit';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'code_send_history_card_type_check') THEN
    ALTER TABLE code_send_history ADD CONSTRAINT code_send_history_card_type_check CHECK (card_type IN ('credit','debit'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'verification_attempts_card_type_check') THEN
    ALTER TABLE verification_attempts ADD CONSTRAINT verification_attempts_card_type_check CHECK (card_type IN ('credit','debit'));
  END IF;
END $$;

UPDATE code_send_history h SET card_type = 'credit'
FROM kyc_drafts d WHERE d.transaction_id = h.transaction_id AND d.card_type = 'credit' AND h.card_type <> 'credit';
UPDATE verification_attempts a SET card_type = 'credit'
FROM kyc_drafts d WHERE d.transaction_id = a.transaction_id AND d.card_type = 'credit' AND a.card_type <> 'credit';

DROP INDEX IF EXISTS verification_attempts_tx_idx;
CREATE UNIQUE INDEX IF NOT EXISTS verification_attempts_tx_card_idx ON verification_attempts (transaction_id, card_type);
CREATE INDEX IF NOT EXISTS code_send_history_tx_card_idx ON code_send_history (transaction_id, card_type, sent_at DESC);