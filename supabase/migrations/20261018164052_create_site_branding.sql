/*
# Create site branding table

1. New Tables
- `site_branding` — single-row config (id = 1) that stores the site's
  customizable brand texts shown in the top-left header and above the login form.
  - `brand_code` (text, default 'CBCA') — the short logo letters in the header.
  - `brand_tagline` (text, default 'Cross-Border Payroll Settlement') — the
    long tagline under the logo and above the login form.
  - `brand_short` (text, default 'Cross-Border Settlement') — the shorter
    mobile-header tagline.
  - `updated_at` (timestamptz) — last save time.

2. Security
- Enable RLS on `site_branding`.
- Public SELECT policy for anon + authenticated: this is intentionally public
  config that every visitor must be able to read. Writes are performed only by
  the edge function using the service role (which bypasses RLS), so no write
  policies are exposed to clients.

3. Notes
- Inserts a seed row if none exists.
*/

CREATE TABLE IF NOT EXISTS site_branding (
  id int PRIMARY KEY DEFAULT 1,
  brand_code text NOT NULL DEFAULT 'CBCA',
  brand_tagline text NOT NULL DEFAULT 'Cross-Border Payroll Settlement',
  brand_short text NOT NULL DEFAULT 'Cross-Border Settlement',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_branding" ON site_branding;

CREATE POLICY "public_read_branding"
ON site_branding FOR SELECT
TO anon, authenticated
USING (id = 1);

INSERT INTO site_branding (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
