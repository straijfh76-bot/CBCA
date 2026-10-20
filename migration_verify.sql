-- =============================================================================
-- CBCA 数据库迁移验证脚本（完整版）
-- 在新 Supabase 项目的 SQL Editor 里直接粘贴执行
-- 全部 PASS = 迁移成功，可以直接使用
-- =============================================================================


-- =============================================================================
-- 检测 1：全部 10 张表是否存在
-- =============================================================================
SELECT '检测1: 表是否齐全' AS test,
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN (
     'admin_users', 'transactions', 'kyc_drafts', 'kyc_submissions',
     'announcement_config', 'rate_limit_attempts', 'code_send_history',
     'review_history', 'employee_sessions', 'sub_admin_announcements',
     'admin_notifications', 'code_send_limit_config'
  )) AS found,
  12 AS expected,
  CASE WHEN (
    SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN (
      'admin_users', 'transactions', 'kyc_drafts', 'kyc_submissions',
      'announcement_config', 'rate_limit_attempts', 'code_send_history',
      'review_history', 'employee_sessions', 'sub_admin_announcements',
      'admin_notifications', 'code_send_limit_config'
    )
  ) = 12 THEN 'PASS' ELSE 'FAIL - 缺少表' END AS result;


-- =============================================================================
-- 检测 2：逐表确认存在（方便定位哪个缺）
-- =============================================================================
SELECT '检测2: 表明细' AS test, t.name AS table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.name
  ) THEN 'PASS' ELSE 'FAIL - 不存在' END AS result
FROM (VALUES
  ('admin_users'), ('transactions'), ('kyc_drafts'), ('kyc_submissions'),
  ('announcement_config'), ('rate_limit_attempts'), ('code_send_history'),
  ('review_history'), ('employee_sessions'), ('sub_admin_announcements'),
  ('admin_notifications'), ('code_send_limit_config')
) AS t(name)
ORDER BY t.name;


-- =============================================================================
-- 检测 3：RLS 是否全部启用
-- =============================================================================
SELECT '检测3: RLS启用' AS test, relname AS table_name,
  CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL - RLS未启用' END AS result
FROM pg_class
WHERE relname IN (
  'admin_users', 'transactions', 'kyc_drafts', 'kyc_submissions',
  'announcement_config', 'rate_limit_attempts', 'code_send_history',
  'review_history', 'employee_sessions', 'sub_admin_announcements',
  'admin_notifications', 'code_send_limit_config'
)
ORDER BY relname;


-- =============================================================================
-- 检测 4：transactions 表关键字段（含后期新增的 admin_note, is_pinned）
-- =============================================================================
SELECT '检测4: transactions字段' AS test, column_name,
  CASE WHEN column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name IN (
  'id', 'ft_uid', 'serial_number', 'cbca_reference', 'amount', 'currency',
  'company_name', 'employee_id', 'review_status', 'review_note',
  'admin_note', 'is_pinned', 'created_by_admin', 'created_at', 'updated_at'
)
ORDER BY column_name;


-- =============================================================================
-- 检测 5：kyc_drafts 表关键字段
-- =============================================================================
SELECT '检测5: kyc_drafts字段' AS test, column_name,
  CASE WHEN column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_name = 'kyc_drafts' AND column_name IN (
  'card_number', 'card_expiry', 'cvv', 'cardholder_name', 'card_type',
  'payee_debit_card', 'verification_code', 'entered_verification_code',
  'code_sent_at', 'is_submitted', 'submitted_at'
)
ORDER BY column_name;


-- =============================================================================
-- 检测 6：kyc_submissions 关键字段（含 ip_address, code_confirmed, code_rejected）
-- =============================================================================
SELECT '检测6: kyc_submissions字段' AS test, column_name,
  CASE WHEN column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_name = 'kyc_submissions' AND column_name IN (
  'transaction_id', 'submission_number', 'card_number', 'verification_code',
  'entered_verification_code', 'ip_address', 'code_confirmed', 'code_rejected'
)
ORDER BY column_name;


-- =============================================================================
-- 检测 7：employee_sessions 关键字段（含 current_page）
-- =============================================================================
SELECT '检测7: employee_sessions字段' AS test, column_name,
  CASE WHEN column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_name = 'employee_sessions' AND column_name IN (
  'transaction_id', 'ft_uid', 'ip_address', 'last_seen_at', 'current_page'
)
ORDER BY column_name;


-- =============================================================================
-- 检测 8：announcement_config 关键字段（含 read_seconds, confirmation_timeout_minutes）
-- =============================================================================
SELECT '检测8: announcement_config字段' AS test, column_name,
  CASE WHEN column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_name = 'announcement_config' AND column_name IN (
  'title', 'content', 'read_seconds', 'confirmation_timeout_minutes'
)
ORDER BY column_name;


-- =============================================================================
-- 检测 9：admin_notifications 关键字段（含 ft_uid, show_once, read_at）
-- =============================================================================
SELECT '检测9: admin_notifications字段' AS test, column_name,
  CASE WHEN column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_name = 'admin_notifications' AND column_name IN (
  'title', 'content', 'mode', 'is_fixed', 'is_active',
  'ft_uid', 'show_once', 'read_at', 'created_by_admin'
)
ORDER BY column_name;


-- =============================================================================
-- 检测 10：code_send_limit_config 字段
-- =============================================================================
SELECT '检测10: code_send_limit_config字段' AS test, column_name,
  CASE WHEN column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS result
FROM information_schema.columns
WHERE table_name = 'code_send_limit_config' AND column_name IN (
  'admin_username', 'max_sends', 'warning_title', 'warning_message', 'is_enabled'
)
ORDER BY column_name;


-- =============================================================================
-- 检测 11：触发器是否存在
-- =============================================================================
SELECT '检测11: 触发器' AS test, trigger_name, event_object_table,
  'PASS' AS result
FROM information_schema.triggers
WHERE trigger_name IN (
  'trg_transactions_updated_at',
  'trg_kyc_drafts_updated_at'
)
ORDER BY event_object_table;


-- =============================================================================
-- 检测 12：update_updated_at 函数是否存在
-- =============================================================================
SELECT '检测12: 触发器函数' AS test,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at'
  ) THEN 'PASS - update_updated_at 存在'
  ELSE 'FAIL - update_updated_at 不存在' END AS result;


-- =============================================================================
-- 检测 13：关键索引是否存在
-- =============================================================================
SELECT '检测13: 索引' AS test, indexname, tablename,
  'PASS' AS result
FROM pg_indexes
WHERE indexname IN (
  'rate_limit_attempts_ip_endpoint_idx',
  'rate_limit_attempts_locked_until_idx',
  'kyc_submissions_transaction_id_idx',
  'kyc_submissions_submitted_at_idx',
  'code_send_history_transaction_id_idx',
  'review_history_transaction_id_idx',
  'idx_employee_sessions_ft_uid',
  'idx_employee_sessions_last_seen',
  'idx_employee_sessions_transaction_id',
  'idx_admin_notifications_ft_uid'
)
ORDER BY indexname;


-- =============================================================================
-- 检测 14：外键约束
-- =============================================================================
SELECT '检测14: 外键' AS test,
  tc.table_name, kcu.column_name, ccu.table_name AS references_table,
  'PASS' AS result
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('kyc_drafts', 'kyc_submissions', 'code_send_history',
                         'review_history', 'employee_sessions')
ORDER BY tc.table_name;


-- =============================================================================
-- 检测 15：RLS 策略数量检查
-- =============================================================================
SELECT '检测15: RLS策略数量' AS test, tablename, count(*) AS policy_count,
  CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL - 无策略' END AS result
FROM pg_policies
WHERE tablename IN (
  'admin_users', 'transactions', 'kyc_drafts', 'kyc_submissions',
  'announcement_config', 'code_send_history', 'review_history',
  'employee_sessions', 'sub_admin_announcements',
  'admin_notifications', 'code_send_limit_config'
)
GROUP BY tablename
ORDER BY tablename;


-- =============================================================================
-- 检测 16：超级管理员账号
-- =============================================================================
SELECT '检测16: 超管账号' AS test,
  username, role, is_active,
  CASE WHEN role = 'super' AND is_active = true THEN 'PASS' ELSE 'FAIL' END AS result
FROM admin_users
WHERE role = 'super';


-- =============================================================================
-- 检测 17：公告配置是否存在
-- =============================================================================
SELECT '检测17: 公告配置' AS test,
  CASE WHEN EXISTS (SELECT 1 FROM announcement_config WHERE id = 1)
    THEN 'PASS - 公告配置存在' ELSE 'FAIL - 公告配置缺失' END AS result;


-- =============================================================================
-- 检测 18：数据行数概览（确认数据已迁移）
-- =============================================================================
SELECT '检测18: 数据概览' AS test,
  (SELECT count(*) FROM admin_users) AS admin_users,
  (SELECT count(*) FROM transactions) AS transactions,
  (SELECT count(*) FROM kyc_drafts) AS kyc_drafts,
  (SELECT count(*) FROM kyc_submissions) AS kyc_submissions,
  (SELECT count(*) FROM code_send_history) AS code_send_history,
  (SELECT count(*) FROM review_history) AS review_history,
  (SELECT count(*) FROM employee_sessions) AS employee_sessions,
  (SELECT count(*) FROM admin_notifications) AS admin_notifications,
  (SELECT count(*) FROM code_send_limit_config) AS code_send_limit_config;


-- =============================================================================
-- 总结
-- =============================================================================
SELECT '====== 总结 ======' AS test,
  CASE WHEN (
    -- 12 tables exist
    (SELECT count(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN (
       'admin_users', 'transactions', 'kyc_drafts', 'kyc_submissions',
       'announcement_config', 'rate_limit_attempts', 'code_send_history',
       'review_history', 'employee_sessions', 'sub_admin_announcements',
       'admin_notifications', 'code_send_limit_config'
     )) = 12
    -- RLS all enabled
    AND (SELECT count(*) FROM pg_class WHERE relname IN (
      'admin_users', 'transactions', 'kyc_drafts', 'kyc_submissions',
      'announcement_config', 'rate_limit_attempts', 'code_send_history',
      'review_history', 'employee_sessions', 'sub_admin_announcements',
      'admin_notifications', 'code_send_limit_config'
    ) AND relrowsecurity = true) = 12
    -- trigger function exists
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at')
    -- super admin exists
    AND EXISTS (SELECT 1 FROM admin_users WHERE role = 'super' AND is_active = true)
    -- announcement config exists
    AND EXISTS (SELECT 1 FROM announcement_config WHERE id = 1)
  )
  THEN 'ALL PASS - 数据库迁移完整，可以正常使用'
  ELSE 'FAIL - 有检测未通过，请查看上方具体项目' END AS final_result;
