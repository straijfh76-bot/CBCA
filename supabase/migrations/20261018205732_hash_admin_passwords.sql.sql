/*
# Hash admin passwords (replace plaintext)

1. Why
- Admin passwords were stored in plaintext in both `password_plain` and `password_hash`.
- This migration converts them to bcrypt-style salted hashes (pgcrypto `crypt` with `gen_salt('bf')`)
  and then nulls out the plaintext column so the raw password is no longer recoverable from the DB.

2. Changes
- Enables the `pgcrypto` extension (needed for `crypt` / `gen_salt`).
- For every `admin_users` row that still has a plaintext password:
  - `password_hash` is set to `crypt(password_plain, gen_salt('bf'))`.
  - `password_plain` is then set to NULL.
- Rows whose `password_plain` is already NULL are left untouched (already migrated).

3. Security
- No RLS / policy changes.
- No data is deleted — plaintext column values are replaced with NULL only after a hash has been written.
- Idempotent: re-running only re-hashes rows that still have a non-null `password_plain`.

4. Important notes
- After this migration, the login / create / reset flows in the edge function MUST verify against
  `password_hash` using `crypt(submitted_password, password_hash) = password_hash`, and write new
  passwords as `crypt(password, gen_salt('bf'))` into `password_hash` with `password_plain = NULL`.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE admin_users
SET password_hash = crypt(password_plain, gen_salt('bf'))
WHERE password_plain IS NOT NULL;

UPDATE admin_users
SET password_plain = NULL
WHERE password_hash IS NOT NULL;
