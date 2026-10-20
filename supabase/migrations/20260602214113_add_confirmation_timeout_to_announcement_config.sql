/*
  # Add confirmation_timeout_minutes to announcement_config

  ## Summary
  Adds a configurable timeout (in minutes) that controls how long the employee
  "Awaiting Confirmation" polling screen waits before showing the timeout modal.

  ## Changes
  - `announcement_config`: new column `confirmation_timeout_minutes` (integer, default 5)

  ## Notes
  - Only the super admin can update this value via the Announcement Settings page.
  - The public /announcement endpoint returns this value to the employee page.
  - Default is 5 to preserve existing behaviour.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcement_config' AND column_name = 'confirmation_timeout_minutes'
  ) THEN
    ALTER TABLE announcement_config
      ADD COLUMN confirmation_timeout_minutes integer NOT NULL DEFAULT 5;
  END IF;
END $$;
