/*
# Lock down direct public access to the database

1. Plain-English summary
- The website never talks to the database directly; every action goes through the server function,
  which uses its own full-access key. The public key shipped in the browser therefore needs no table access.
- This migration removes all table access and admin-function access from the public (anon) and
  signed-in (authenticated) roles, so nobody can read or change data by calling the database directly.

2. Modified tables (all in public schema)
- admin_notifications, admin_users, announcement_config, code_send_history, code_send_limit_config,
  employee_sessions, kyc_drafts, kyc_submissions, review_history, site_branding, sub_admin_announcements,
  transactions, verification_attempts, verification_mode_config, and every other public table.
- No columns or data are changed.

3. Security changes
- Revoke ALL privileges on all public tables and sequences from anon and authenticated.
- Remove the permissive anon/authenticated policies (USING true) that allowed open reads/writes.
- Revoke EXECUTE on verify_admin_password, create_sub_admin, reset_admin_password from PUBLIC, anon, authenticated.
- RLS stays enabled on every table; service_role (used by the server) is unaffected.

4. Important notes
1. The server function keeps working because the service role bypasses these restrictions.
2. Safe to re-run.
*/

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_admin_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_sub_admin(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_admin_password(text, text) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "anon_read_active_notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Anyone can read announcement" ON announcement_config;
DROP POLICY IF EXISTS "select_code_send_limit_config" ON code_send_limit_config;
DROP POLICY IF EXISTS "insert_code_send_limit_config" ON code_send_limit_config;
DROP POLICY IF EXISTS "update_code_send_limit_config" ON code_send_limit_config;
DROP POLICY IF EXISTS "delete_code_send_limit_config" ON code_send_limit_config;
DROP POLICY IF EXISTS "Employees can update session" ON employee_sessions;
DROP POLICY IF EXISTS "Employees can insert session" ON employee_sessions;
DROP POLICY IF EXISTS "Allow anon read on kyc_drafts" ON kyc_drafts;
DROP POLICY IF EXISTS "Allow anon insert on kyc_drafts" ON kyc_drafts;
DROP POLICY IF EXISTS "Allow anon update on kyc_drafts" ON kyc_drafts;
DROP POLICY IF EXISTS "public_read_branding" ON site_branding;
DROP POLICY IF EXISTS "Anyone can read sub_admin_announcements" ON sub_admin_announcements;
DROP POLICY IF EXISTS "Allow anon read on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow anon insert on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow anon update on transactions" ON transactions;
DROP POLICY IF EXISTS "anon_select_va" ON verification_attempts;
DROP POLICY IF EXISTS "anon_insert_va" ON verification_attempts;
DROP POLICY IF EXISTS "anon_update_va" ON verification_attempts;
DROP POLICY IF EXISTS "anon_delete_va" ON verification_attempts;
DROP POLICY IF EXISTS "anon_select_vmc" ON verification_mode_config;
DROP POLICY IF EXISTS "anon_insert_vmc" ON verification_mode_config;
DROP POLICY IF EXISTS "anon_update_vmc" ON verification_mode_config;
DROP POLICY IF EXISTS "anon_delete_vmc" ON verification_mode_config;
