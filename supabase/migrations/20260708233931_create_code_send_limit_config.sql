CREATE TABLE IF NOT EXISTS code_send_limit_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_username text NOT NULL UNIQUE,
  max_sends integer NOT NULL DEFAULT 3,
  warning_title text NOT NULL DEFAULT '',
  warning_message text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE code_send_limit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_code_send_limit_config" ON code_send_limit_config
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "insert_code_send_limit_config" ON code_send_limit_config
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "update_code_send_limit_config" ON code_send_limit_config
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_code_send_limit_config" ON code_send_limit_config
  FOR DELETE TO anon, authenticated USING (true);
