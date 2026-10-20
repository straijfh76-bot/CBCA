/*
# Track when the current test round started

1. Modified Tables
- `verification_mode_config`: new column `round_started_at` (timestamptz, nullable).
  Set whenever a new test round begins (test mode switched on, or verification mode changed).
  The send-limit counter only counts codes sent since this moment, matching how the
  failed-attempt counter already restarts at the start of a round.

2. Data
- Existing rows that currently have test mode on are backfilled with their `updated_at`,
  the closest known start of their current round.

3. Security
- No policy changes.
*/

ALTER TABLE verification_mode_config ADD COLUMN IF NOT EXISTS round_started_at timestamptz;

UPDATE verification_mode_config
SET round_started_at = updated_at
WHERE round_started_at IS NULL AND is_enabled = true;