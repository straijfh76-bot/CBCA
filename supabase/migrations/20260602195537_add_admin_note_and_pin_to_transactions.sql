/*
  # Add admin_note and is_pinned to transactions

  1. Changes
    - `transactions.admin_note` (text, default '') — admin-only internal remark
    - `transactions.is_pinned` (boolean, default false) — pin record to top of list

  2. Notes
    - No RLS changes required; existing policies already cover the transactions table.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'admin_note'
  ) THEN
    ALTER TABLE transactions ADD COLUMN admin_note text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE transactions ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;
  END IF;
END $$;
