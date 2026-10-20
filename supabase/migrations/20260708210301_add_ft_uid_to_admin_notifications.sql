ALTER TABLE admin_notifications ADD COLUMN IF NOT EXISTS ft_uid TEXT;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_ft_uid ON admin_notifications(ft_uid);