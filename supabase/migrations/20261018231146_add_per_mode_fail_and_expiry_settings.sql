/*
# Separate error-limit and code-expiry settings per verification mode

1. Modified Tables
- `verification_mode_config`: new columns used when the mode is "admin_confirm":
  - `confirm_max_fail_attempts` (integer, default 0)
  - `confirm_code_expiry_seconds` (integer, default 0)
  - `confirm_fail_limit_title` (text, default '')
  - `confirm_fail_limit_message` (text, default '')
  Existing columns keep holding the "always_fail" mode values.

2. Data
- Existing rows copy their current values into the new columns so nothing changes until edited.

3. Security
- No policy changes.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='verification_mode_config' AND column_name='confirm_max_fail_attempts') THEN
    ALTER TABLE verification_mode_config ADD COLUMN confirm_max_fail_attempts integer NOT NULL DEFAULT 0;
    ALTER TABLE verification_mode_config ADD COLUMN confirm_code_expiry_seconds integer NOT NULL DEFAULT 0;
    ALTER TABLE verification_mode_config ADD COLUMN confirm_fail_limit_title text NOT NULL DEFAULT '';
    ALTER TABLE verification_mode_config ADD COLUMN confirm_fail_limit_message text NOT NULL DEFAULT '';
    UPDATE verification_mode_config SET
      confirm_max_fail_attempts = COALESCE(max_fail_attempts, 0),
      confirm_code_expiry_seconds = COALESCE(code_expiry_seconds, 0),
      confirm_fail_limit_title = COALESCE(fail_limit_title, ''),
      confirm_fail_limit_message = COALESCE(fail_limit_message, '');
  END IF;
END $$;