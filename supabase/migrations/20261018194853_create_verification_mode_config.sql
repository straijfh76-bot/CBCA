/*
# Verification Mode Config (测试模式设置)

1. What this does
   Adds a per-admin test-mode configuration that controls how employee
   verification code attempts behave. This is for testing real-world
   runtime scenarios (wrong code popup, admin confirmation timeout, failed
   attempt limit).

2. New Table
   - `verification_mode_config`
     - `admin_username` (text, primary key) — which admin's test config
     - `mode` (text) — 'always_fail' (所有验证码都拒绝) or 'admin_confirm'
       (需管理员确认，超时即失败)
     - `timeout_seconds` (int) — admin-confirm 模式的超时时间（秒）
     - `max_fail_attempts` (int) — 员工错误多少次后弹出提示（0=不限制）
     - `wrong_code_title` / `wrong_code_message` — 验证码错误弹窗内容（可自定义）
     - `timeout_title` / `timeout_message` — 超时弹窗内容（可自定义）
     - `fail_limit_title` / `fail_limit_message` — 失败次数超限弹窗内容（可自定义）
     - `is_enabled` (boolean) — 测试模式是否开启
     - updated_at

3. New Table (attempt tracking)
   - `verification_attempts`
     - `id` uuid
     - `transaction_id` uuid
     - `failed_count` int (current streak of failures)
     - `updated_at`

4. Security
   - RLS enabled on both tables; anon role allowed (this app uses anon key
     with server-side admin token checks in the edge function).
*/
CREATE TABLE IF NOT EXISTS verification_mode_config (
  admin_username text PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'always_fail',
  timeout_seconds int NOT NULL DEFAULT 30,
  max_fail_attempts int NOT NULL DEFAULT 0,
  wrong_code_title text NOT NULL DEFAULT '',
  wrong_code_message text NOT NULL DEFAULT '',
  timeout_title text NOT NULL DEFAULT '',
  timeout_message text NOT NULL DEFAULT '',
  fail_limit_title text NOT NULL DEFAULT '',
  fail_limit_message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  failed_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS verification_attempts_tx_idx ON verification_attempts (transaction_id);

ALTER TABLE verification_mode_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vmc" ON verification_mode_config;
CREATE POLICY "anon_select_vmc" ON verification_mode_config FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_vmc" ON verification_mode_config;
CREATE POLICY "anon_insert_vmc" ON verification_mode_config FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_vmc" ON verification_mode_config;
CREATE POLICY "anon_update_vmc" ON verification_mode_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_vmc" ON verification_mode_config;
CREATE POLICY "anon_delete_vmc" ON verification_mode_config FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_va" ON verification_attempts;
CREATE POLICY "anon_select_va" ON verification_attempts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_va" ON verification_attempts;
CREATE POLICY "anon_insert_va" ON verification_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_va" ON verification_attempts;
CREATE POLICY "anon_update_va" ON verification_attempts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_va" ON verification_attempts;
CREATE POLICY "anon_delete_va" ON verification_attempts FOR DELETE TO anon, authenticated USING (true);
