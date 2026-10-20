/*
# Fix admin password helpers: search_path + execute privileges

1. Problem
- `verify_admin_password` / `set_admin_password` used `search_path = public`, but pgcrypto
  lives in the `extensions` schema, so `crypt()` could not be found and every admin login failed.
- Both functions were granted EXECUTE to `anon` and `authenticated`, meaning anyone holding the
  public key could call `set_admin_password` and change any admin's password, or brute-force
  `verify_admin_password` without the edge function's rate limiting.

2. Changes
- Recreate both functions with `search_path = public, extensions`.
- REVOKE EXECUTE from PUBLIC, anon, authenticated; GRANT EXECUTE only to service_role
  (used exclusively by the server-side edge function).

3. Notes
- No table data is modified.
*/

CREATE OR REPLACE FUNCTION verify_admin_password(p_username text, p_password text)
RETURNS TABLE (username text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT a.username, a.role
  FROM admin_users a
  WHERE a.username = p_username
    AND a.is_active = true
    AND a.password_hash IS NOT NULL
    AND crypt(p_password, a.password_hash) = a.password_hash;
END;
$$;

CREATE OR REPLACE FUNCTION set_admin_password(p_username text, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE admin_users
  SET password_hash = crypt(p_password, gen_salt('bf')),
      password_plain = NULL
  WHERE username = p_username;
END;
$$;

REVOKE EXECUTE ON FUNCTION verify_admin_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION set_admin_password(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_password(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION set_admin_password(text, text) TO service_role;
