/*
# Add admin password helper functions (SECURITY DEFINER)

1. Why
- Edge function needs server-side helpers for bcrypt password verify/set.
- Drops existing `verify_admin_password` first because its return type changed.

2. Functions
- verify_admin_password(p_username, p_password) → TABLE(username, role) on success.
- set_admin_password(p_username, p_password) → void, writes salted hash, nulls plaintext.

3. Security
- SECURITY DEFINER, owned by postgres, search_path=public.
- GRANT EXECUTE to anon + authenticated.
*/

DROP FUNCTION IF EXISTS verify_admin_password(text, text);
DROP FUNCTION IF EXISTS set_admin_password(text, text);

CREATE FUNCTION verify_admin_password(p_username text, p_password text)
RETURNS TABLE (username text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE FUNCTION set_admin_password(p_username text, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_users
  SET password_hash = crypt(p_password, gen_salt('bf')),
      password_plain = NULL
  WHERE username = p_username;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_admin_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_admin_password(text, text) TO anon, authenticated;
