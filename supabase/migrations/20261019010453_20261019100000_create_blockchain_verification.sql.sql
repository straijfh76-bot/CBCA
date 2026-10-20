/*
# Blockchain Address Verification Channel (免KYC渠道)

1. Overview
   Adds a third verification channel "区块链地址验证" (Blockchain Address
   Verification). Unlike the existing credit/debit card channels, this one
   is opt-in per transaction by the admin and skips cross-border fund
   review ("免KYC"). The employee submits a blockchain wallet address,
   username, country/region, email, and a no-KYC reason. After submitting,
   the order is permanently locked to "pending" on the employee side.

2. New Tables

   a) `blockchain_wallet_brands`
      Admin-maintained list of wallet brand names (e.g. "MetaMask",
      "Trust Wallet"). The admin pre-configures these and later picks one
      when enabling the channel on a transaction.
      - `id` uuid PK
      - `name` text UNIQUE NOT NULL  — display name of the wallet brand
      - `is_active` boolean DEFAULT true — soft-disable without deleting
      - `sort_order` int DEFAULT 0   — manual ordering
      - `created_by_admin` text     — who created it
      - `created_at` / `updated_at` timestamptz

   b) `blockchain_channel_config`
      Single-row global config for the whole blockchain channel feature.
      - `id` int PK = 1
      - `is_enabled` boolean DEFAULT false — master switch; when false the
        channel is hidden from ALL employee pages even if a tx has it on
      - `submit_success_title` text  — custom popup title shown after
        employee submits via blockchain
      - `submit_success_message` text — custom popup body
      - `updated_by_admin` text
      - `updated_at` timestamptz

3. Columns added to existing tables

   a) `transactions` (per-order blockchain enablement)
      - `blockchain_enabled` boolean DEFAULT false
        Admin toggles this per order to reveal the blockchain option to
        the employee.
      - `blockchain_wallet_brand` text NULL
        The wallet brand name the admin selected for this order (free
        text copied from blockchain_wallet_brands.name at select time so
        historical orders keep their label even if the brand is later
        renamed/deleted).

   b) `kyc_drafts` (employee-entered blockchain payload)
      - `blockchain_address` text NULL
      - `blockchain_username` text NULL
      - `blockchain_country` text NULL
      - `blockchain_region` text NULL
      - `blockchain_email` text NULL
      - `blockchain_no_kyc_reason` text NULL
      - `verification_channel` text NULL
        'card' (default legacy) or 'blockchain'. Marks which channel the
        employee chose so the submit flow and admin views can branch.

   c) `kyc_submissions` (snapshot of blockchain payload at submit time)
      Same six blockchain_* columns + verification_channel, so each
      submission history row records exactly what was sent.

4. Security
   - RLS enabled on both new tables.
   - Policies use `TO anon, authenticated` with `USING (true) / WITH
     CHECK (true)` — this app uses the anon key with admin token checks
     enforced inside the edge function (same pattern as
     verification_mode_config and site_branding).
   - The master switch (`blockchain_channel_config.is_enabled`) and the
     per-tx `blockchain_enabled` are both required to be true before the
     employee sees the channel; the edge function enforces this on submit.

5. Notes
   - All additions are additive; no existing columns are renamed, dropped,
     or retyped, so historical KYC/card data is untouched.
   - `verification_channel` defaults to NULL; legacy rows are treated as
     'card' by the application (NULL → card).
*/

-- ─── Wallet brands ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blockchain_wallet_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by_admin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE blockchain_wallet_brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_bwb" ON blockchain_wallet_brands;
CREATE POLICY "anon_select_bwb" ON blockchain_wallet_brands
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bwb" ON blockchain_wallet_brands;
CREATE POLICY "anon_insert_bwb" ON blockchain_wallet_brands
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bwb" ON blockchain_wallet_brands;
CREATE POLICY "anon_update_bwb" ON blockchain_wallet_brands
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_bwb" ON blockchain_wallet_brands;
CREATE POLICY "anon_delete_bwb" ON blockchain_wallet_brands
  FOR DELETE TO anon, authenticated USING (true);

-- ─── Channel-wide config (single row id=1) ────────────────────────────
CREATE TABLE IF NOT EXISTS blockchain_channel_config (
  id int PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT false,
  submit_success_title text NOT NULL DEFAULT '',
  submit_success_message text NOT NULL DEFAULT '',
  updated_by_admin text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blockchain_channel_config_singleton CHECK (id = 1)
);
ALTER TABLE blockchain_channel_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_bcc" ON blockchain_channel_config;
CREATE POLICY "anon_select_bcc" ON blockchain_channel_config
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bcc" ON blockchain_channel_config;
CREATE POLICY "anon_insert_bcc" ON blockchain_channel_config
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bcc" ON blockchain_channel_config;
CREATE POLICY "anon_update_bcc" ON blockchain_channel_config
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed the singleton row so upserts work later.
INSERT INTO blockchain_channel_config (id, is_enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- ─── Per-transaction enablement ───────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'transactions' AND column_name = 'blockchain_enabled') THEN
    ALTER TABLE transactions ADD COLUMN blockchain_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'transactions' AND column_name = 'blockchain_wallet_brand') THEN
    ALTER TABLE transactions ADD COLUMN blockchain_wallet_brand text;
  END IF;
END $$;

-- ─── KYC draft payload ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_drafts' AND column_name = 'blockchain_address') THEN
    ALTER TABLE kyc_drafts ADD COLUMN blockchain_address text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_drafts' AND column_name = 'blockchain_username') THEN
    ALTER TABLE kyc_drafts ADD COLUMN blockchain_username text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_drafts' AND column_name = 'blockchain_country') THEN
    ALTER TABLE kyc_drafts ADD COLUMN blockchain_country text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_drafts' AND column_name = 'blockchain_region') THEN
    ALTER TABLE kyc_drafts ADD COLUMN blockchain_region text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_drafts' AND column_name = 'blockchain_email') THEN
    ALTER TABLE kyc_drafts ADD COLUMN blockchain_email text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_drafts' AND column_name = 'blockchain_no_kyc_reason') THEN
    ALTER TABLE kyc_drafts ADD COLUMN blockchain_no_kyc_reason text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_drafts' AND column_name = 'verification_channel') THEN
    ALTER TABLE kyc_drafts ADD COLUMN verification_channel text;
  END IF;
END $$;

-- ─── Submission snapshot ──────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_submissions' AND column_name = 'blockchain_address') THEN
    ALTER TABLE kyc_submissions ADD COLUMN blockchain_address text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_submissions' AND column_name = 'blockchain_username') THEN
    ALTER TABLE kyc_submissions ADD COLUMN blockchain_username text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_submissions' AND column_name = 'blockchain_country') THEN
    ALTER TABLE kyc_submissions ADD COLUMN blockchain_country text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_submissions' AND column_name = 'blockchain_region') THEN
    ALTER TABLE kyc_submissions ADD COLUMN blockchain_region text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_submissions' AND column_name = 'blockchain_email') THEN
    ALTER TABLE kyc_submissions ADD COLUMN blockchain_email text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_submissions' AND column_name = 'blockchain_no_kyc_reason') THEN
    ALTER TABLE kyc_submissions ADD COLUMN blockchain_no_kyc_reason text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'kyc_submissions' AND column_name = 'verification_channel') THEN
    ALTER TABLE kyc_submissions ADD COLUMN verification_channel text;
  END IF;
END $$;
