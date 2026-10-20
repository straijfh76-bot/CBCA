/*
  # Announcement read_seconds + sub-admin announcement overrides

  ## Purpose
  1. Allow admins to configure how long employees must read the announcement (read_seconds).
  2. Allow sub-admins to set their own announcement that overrides the global one for their own transactions.

  ## Changes

  ### Modified Tables
  - `announcement_config`
    - New column `read_seconds` (integer, default 60) — how long the employee must wait before proceeding

  ### New Tables
  - `sub_admin_announcements`
    - `id` (uuid, primary key)
    - `admin_username` (text, unique) — the sub-admin who owns this config
    - `title` (text) — announcement title
    - `content` (text) — announcement body
    - `read_seconds` (integer, default 60)
    - `use_custom` (boolean, default false) — if false, fallback to global config
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on sub_admin_announcements; only service role can write (API enforces auth)
  - Public SELECT allowed so employees can fetch via the edge function
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcement_config' AND column_name = 'read_seconds'
  ) THEN
    ALTER TABLE announcement_config ADD COLUMN read_seconds integer NOT NULL DEFAULT 60;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sub_admin_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_username text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  read_seconds integer NOT NULL DEFAULT 60,
  use_custom boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sub_admin_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sub_admin_announcements"
  ON sub_admin_announcements FOR SELECT
  TO anon, authenticated
  USING (true);
