/*
# Per-admin blockchain channel settings + lock down blockchain tables

1. Overview
   Blockchain address verification settings become independent per admin
   (same model as verification_mode_config). Each admin has their own master
   switch, success popup text, and wallet brand list; one admin's settings
   never affect another admin's orders.

2. New Tables
   - `blockchain_admin_config` (one row per admin)
     - `admin_username` text PK — owning admin
     - `is_enabled` boolean — master switch for that admin's orders
     - `submit_success_title` / `submit_success_message` text — popup shown to employees
     - `updated_at` timestamptz

3. Modified Tables
   - `blockchain_wallet_brands`: new `admin_username` column (owner). The
     global unique constraint on `name` is replaced by unique (admin_username, name)
     so different admins may use the same brand name. Existing rows are
     assigned to their creator.
   - `blockchain_channel_config` (old global singleton) is left in place but
     no longer used.

4. Security
   - RLS enabled on the new table with no client policies.
   - All anon/authenticated policies and grants removed from the blockchain
     tables; they are only reachable through the server-side function, matching
     every other table in this app.
*/

CREATE TABLE IF NOT EXISTS blockchain_admin_config (
  admin_username text PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT false,
  submit_success_title text NOT NULL DEFAULT '',
  submit_success_message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE blockchain_admin_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON blockchain_admin_config FROM anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'blockchain_wallet_brands' AND column_name = 'admin_username') THEN
    ALTER TABLE blockchain_wallet_brands ADD COLUMN admin_username text;
  END IF;
END $$;

UPDATE blockchain_wallet_brands SET admin_username = created_by_admin
WHERE admin_username IS NULL AND created_by_admin IS NOT NULL;

ALTER TABLE blockchain_wallet_brands DROP CONSTRAINT IF EXISTS blockchain_wallet_brands_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS blockchain_wallet_brands_admin_name_key
  ON blockchain_wallet_brands (admin_username, name);

DROP POLICY IF EXISTS "anon_select_bwb" ON blockchain_wallet_brands;
DROP POLICY IF EXISTS "anon_insert_bwb" ON blockchain_wallet_brands;
DROP POLICY IF EXISTS "anon_update_bwb" ON blockchain_wallet_brands;
DROP POLICY IF EXISTS "anon_delete_bwb" ON blockchain_wallet_brands;
REVOKE ALL ON blockchain_wallet_brands FROM anon, authenticated;

DROP POLICY IF EXISTS "anon_select_bcc" ON blockchain_channel_config;
DROP POLICY IF EXISTS "anon_insert_bcc" ON blockchain_channel_config;
DROP POLICY IF EXISTS "anon_update_bcc" ON blockchain_channel_config;
REVOKE ALL ON blockchain_channel_config FROM anon, authenticated;