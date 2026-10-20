/*
# Separate send limit per verification mode

1. Modified Tables
- `code_send_limit_config`: new columns holding the send limit used when the verification mode is "admin_confirm":
  - `confirm_is_enabled` (boolean, default false)
  - `confirm_max_sends` (integer, default 3)
  - `confirm_warning_title` (text, default '')
  - `confirm_warning_message` (text, default '')
  The existing columns continue to hold the "always_fail" mode settings.

2. Data
- Existing rows get the confirm-mode columns copied from their current values so nothing changes for current admins until they edit.

3. Security
- No policy changes; table remains accessed only through the server function.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='code_send_limit_config' AND column_name='confirm_is_enabled') THEN
    ALTER TABLE code_send_limit_config ADD COLUMN confirm_is_enabled boolean NOT NULL DEFAULT false;
    ALTER TABLE code_send_limit_config ADD COLUMN confirm_max_sends integer NOT NULL DEFAULT 3;
    ALTER TABLE code_send_limit_config ADD COLUMN confirm_warning_title text NOT NULL DEFAULT '';
    ALTER TABLE code_send_limit_config ADD COLUMN confirm_warning_message text NOT NULL DEFAULT '';
    UPDATE code_send_limit_config SET
      confirm_is_enabled = is_enabled,
      confirm_max_sends = max_sends,
      confirm_warning_title = warning_title,
      confirm_warning_message = warning_message;
  END IF;
END $$;