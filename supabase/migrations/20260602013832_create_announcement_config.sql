/*
  # Create announcement_config table

  ## Purpose
  Stores the single announcement that employees must read before requesting a verification code.
  Admins (both super and sub) can update this content.

  ## New Tables
  - `announcement_config`
    - `id` (int, primary key, always 1 — single-row pattern)
    - `title` (text) — announcement title shown in modal header
    - `content` (text) — full announcement body (supports line breaks)
    - `updated_by` (text) — username of admin who last updated
    - `updated_at` (timestamptz) — when it was last updated

  ## Security
  - RLS enabled; public SELECT allowed so employees can fetch it
  - INSERT/UPDATE restricted to authenticated service role (API handles auth)
  - No DELETE policy — single row should never be deleted
*/

CREATE TABLE IF NOT EXISTS announcement_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT 'Important Notice — Please Read Carefully',
  content text NOT NULL DEFAULT 'You are about to receive a one-time verification code (OTP) via SMS for cross-border settlement identity authentication.

1. The verification code will be sent to the phone number registered and bound to your card. Ensure the number entered is correct before proceeding.

2. The OTP is valid for a limited time. Do not share this code with anyone, including bank staff or customer service representatives.

3. By requesting this code, you confirm that you are the authorized cardholder and that all information provided is accurate and truthful.

4. This verification is part of the official cross-border settlement process. The code is used solely for identity authentication purposes and will not authorize any unauthorized transactions.

5. Any misuse, fraud, or unauthorized use of the verification process may result in suspension of your account and potential legal action.

6. Your personal data is processed in accordance with applicable data protection laws and will not be shared with third parties outside of this settlement process.',
  updated_by text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE announcement_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read announcement"
  ON announcement_config FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO announcement_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
