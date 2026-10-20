-- =============================================================================
-- CBCA 数据库健康检测脚本
-- 执行后检查每一项结果，全部 PASS 表示数据库配置正确
-- =============================================================================


-- =============================================================================
-- 检测 1：表是否全部存在
-- 期望：6 张表全部显示
-- =============================================================================
SELECT '检测1: 表结构' AS test, table_name, '存在' AS result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'admin_users', 'transactions', 'kyc_drafts',
    'kyc_submissions', 'announcement_config', 'rate_limit_attempts'
  )
ORDER BY table_name;


-- =============================================================================
-- 检测 2：transactions 表关键字段是否完整
-- 期望：列出所有字段名，缺失表示 migration 不完整
-- =============================================================================
SELECT '检测2: transactions字段' AS test, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN (
    'id','ft_uid','serial_number','cbca_reference','amount','currency',
    'company_name','employee_id','review_status','created_by_admin',
    'created_at','updated_at'
  )
ORDER BY column_name;


-- =============================================================================
-- 检测 3：kyc_drafts 表关键字段是否完整（包含后期新增字段）
-- 期望：所有字段都显示
-- =============================================================================
SELECT '检测3: kyc_drafts字段' AS test, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'kyc_drafts'
  AND column_name IN (
    'card_number','card_expiry','cvv','cardholder_name',
    'card_type','payee_debit_card',
    'verification_code','entered_verification_code','code_sent_at',
    'is_submitted','submitted_at'
  )
ORDER BY column_name;


-- =============================================================================
-- 检测 4：RLS 是否在所有表上已启用
-- 期望：6 张表全部显示 rowsecurity = true
-- =============================================================================
SELECT '检测4: RLS启用' AS test, relname AS table_name,
  CASE WHEN relrowsecurity THEN 'PASS - RLS已启用' ELSE 'FAIL - RLS未启用' END AS result
FROM pg_class
WHERE relname IN (
  'admin_users', 'transactions', 'kyc_drafts',
  'kyc_submissions', 'announcement_config', 'rate_limit_attempts'
)
ORDER BY relname;


-- =============================================================================
-- 检测 5：关键 RLS 策略是否存在
-- 期望：显示所有策略名称
-- =============================================================================
SELECT '检测5: RLS策略' AS test, tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'admin_users', 'transactions', 'kyc_drafts',
  'kyc_submissions', 'announcement_config'
)
ORDER BY tablename, policyname;


-- =============================================================================
-- 检测 6：updated_at 触发器是否存在
-- 期望：transactions 和 kyc_drafts 各有一个触发器
-- =============================================================================
SELECT '检测6: 触发器' AS test, trigger_name, event_object_table AS table_name,
  'PASS - 触发器存在' AS result
FROM information_schema.triggers
WHERE trigger_name IN (
  'trg_transactions_updated_at',
  'trg_kyc_drafts_updated_at'
)
ORDER BY event_object_table;


-- =============================================================================
-- 检测 7：超级管理员账号是否存在且有效
-- 期望：ada66 显示 role=super, is_active=true
-- =============================================================================
SELECT '检测7: 超管账号' AS test,
  username,
  role,
  is_active,
  CASE
    WHEN username = 'ada66' AND role = 'super' AND is_active = true
    THEN 'PASS - 超管账号正常'
    ELSE 'FAIL - 账号异常'
  END AS result
FROM admin_users
WHERE role = 'super';


-- =============================================================================
-- 检测 8：公告默认内容是否已写入
-- 期望：显示公告标题
-- =============================================================================
SELECT '检测8: 公告内容' AS test,
  id,
  title,
  CASE WHEN length(content) > 10 THEN 'PASS - 公告内容存在' ELSE 'FAIL - 公告内容为空' END AS result
FROM announcement_config
WHERE id = 1;


-- =============================================================================
-- 检测 9：索引是否存在
-- 期望：显示 rate_limit 的两个索引
-- =============================================================================
SELECT '检测9: 索引' AS test, indexname,
  'PASS - 索引存在' AS result
FROM pg_indexes
WHERE indexname IN (
  'rate_limit_attempts_ip_endpoint_idx',
  'rate_limit_attempts_locked_until_idx',
  'kyc_submissions_transaction_id_idx',
  'kyc_submissions_submitted_at_idx'
)
ORDER BY indexname;


-- =============================================================================
-- 检测 10：外键约束是否正确
-- 期望：kyc_drafts 和 kyc_submissions 都有指向 transactions 的外键
-- =============================================================================
SELECT '检测10: 外键约束' AS test,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  'PASS - 外键存在' AS result
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('kyc_drafts', 'kyc_submissions')
ORDER BY tc.table_name;


-- =============================================================================
-- 汇总：一眼看全部结果
-- =============================================================================
SELECT
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public'
     AND table_name IN ('admin_users','transactions','kyc_drafts',
                        'kyc_submissions','announcement_config','rate_limit_attempts')
  ) AS tables_found,
  6 AS tables_expected,
  CASE WHEN (
    SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN ('admin_users','transactions','kyc_drafts',
                         'kyc_submissions','announcement_config','rate_limit_attempts')
  ) = 6 THEN 'PASS' ELSE 'FAIL' END AS tables_ok,

  (SELECT count(*) FROM admin_users WHERE role='super' AND is_active=true) AS super_admins,
  CASE WHEN (SELECT count(*) FROM admin_users WHERE role='super' AND is_active=true) >= 1
    THEN 'PASS' ELSE 'FAIL' END AS admin_ok,

  (SELECT count(*) FROM announcement_config WHERE id=1) AS announcement_row,
  CASE WHEN (SELECT count(*) FROM announcement_config WHERE id=1) = 1
    THEN 'PASS' ELSE 'FAIL' END AS announcement_ok,

  (SELECT count(*) FROM pg_class WHERE relname IN (
    'admin_users','transactions','kyc_drafts',
    'kyc_submissions','announcement_config','rate_limit_attempts'
  ) AND relrowsecurity = true) AS rls_enabled_count,
  6 AS rls_expected,
  CASE WHEN (SELECT count(*) FROM pg_class WHERE relname IN (
    'admin_users','transactions','kyc_drafts',
    'kyc_submissions','announcement_config','rate_limit_attempts'
  ) AND relrowsecurity = true) = 6 THEN 'PASS' ELSE 'FAIL' END AS rls_ok;
