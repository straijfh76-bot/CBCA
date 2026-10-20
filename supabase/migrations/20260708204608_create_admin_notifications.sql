CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('popup', 'banner')),
  is_fixed boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by_admin text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_manage_notifications" ON admin_notifications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_active_notifications" ON admin_notifications
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
