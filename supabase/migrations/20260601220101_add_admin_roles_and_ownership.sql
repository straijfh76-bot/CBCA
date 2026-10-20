/*
  # Add admin roles and transaction ownership

  1. Changes to admin_users
     - Add `role` column: 'super' or 'sub' (default 'sub')
     - Add `created_by` column: references admin_users.id (nullable, null = seeded)
     - Add `is_active` column: soft-disable accounts
     - Insert the hardcoded super-admin 'ada66'

  2. Changes to transactions
     - Add `created_by_admin` column: stores the username of the admin who generated it

  3. Notes
     - Super-admin sees all transactions; sub-admin only sees their own (filtered in Edge Function by token)
     - Password stored as plain text in this system (no auth library) — same pattern as existing admin
*/

-- Add role/created_by/is_active to admin_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'role'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN role text DEFAULT 'sub' CHECK (role IN ('super','sub'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN created_by text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'password_plain'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN password_plain text DEFAULT '';
  END IF;
END $$;

-- Insert the super-admin (ada66)
INSERT INTO admin_users (username, password_plain, password_hash, role, is_active)
VALUES ('ada66', 'a114455h', 'a114455h', 'super', true)
ON CONFLICT (username) DO UPDATE
  SET password_plain = 'a114455h',
      password_hash = 'a114455h',
      role = 'super',
      is_active = true;

-- Add created_by_admin to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'created_by_admin'
  ) THEN
    ALTER TABLE transactions ADD COLUMN created_by_admin text DEFAULT '';
  END IF;
END $$;
