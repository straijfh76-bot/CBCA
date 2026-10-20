/*
  # Add submission_number to code_send_history

  ## Summary
  Links each SMS send record to the submission attempt it belongs to,
  so the admin UI can filter history per submission round.

  ## Changes
  - `code_send_history`: add nullable `submission_number` integer column
    (nullable to preserve existing rows without data loss)

  ## Notes
  - Existing rows will have NULL; new rows will always have a value set by the Edge Function
  - No RLS changes needed; existing policies remain
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'code_send_history' AND column_name = 'submission_number'
  ) THEN
    ALTER TABLE code_send_history ADD COLUMN submission_number integer;
  END IF;
END $$;
