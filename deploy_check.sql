-- =============================================================================
-- CBCA 新数据库健康检测（只读，不会修改任何数据）
-- 在 Supabase 的 SQL Editor 里整段粘贴后点 Run，结果是一张表：
--   结果列全部为 PASS 表示数据库正常；INFO 只是数量信息。
-- =============================================================================
WITH
expected_tables(t) AS (
  VALUES
    ('admin_notifications'), ('admin_users'), ('announcement_config'),
    ('blockchain_admin_config'), ('blockchain_channel_config'), ('blockchain_wallet_brands'),
    ('code_send_history'), ('code_send_limit_config'), ('employee_sessions'),
    ('kyc_drafts'), ('kyc_submissions'), ('rate_limit_attempts'),
    ('review_history'), ('site_branding'), ('sub_admin_announcements'),
    ('transactions'), ('verification_attempts'), ('verification_mode_config')
),
expected_indexes(i) AS (
  VALUES
    ('blockchain_wallet_brands_admin_name_key'), ('code_send_history_transaction_id_idx'),
    ('code_send_history_tx_card_idx'), ('idx_admin_notifications_ft_uid'),
    ('idx_employee_sessions_ft_uid'), ('idx_employee_sessions_last_seen'),
    ('idx_employee_sessions_transaction_id'), ('kyc_submissions_submitted_at_idx'),
    ('kyc_submissions_transaction_id_idx'), ('rate_limit_attempts_ip_endpoint_idx'),
    ('rate_limit_attempts_locked_until_idx'), ('review_history_transaction_id_idx'),
    ('verification_attempts_tx_card_idx')
),
tbl AS (
  SELECT e.t, c.oid IS NOT NULL AS present, coalesce(c.relrowsecurity, false) AS rls
  FROM expected_tables e
  LEFT JOIN pg_class c ON c.relname = e.t AND c.relkind = 'r'
    AND c.relnamespace = 'public'::regnamespace
),
idx AS (
  SELECT e.i, EXISTS (SELECT 1 FROM pg_indexes p WHERE p.schemaname = 'public' AND p.indexname = e.i) AS present
  FROM expected_indexes e
),
fn AS (
  SELECT
    to_regprocedure('public.verify_admin_password(text,text)') AS verify_fn,
    to_regprocedure('public.set_admin_password(text,text)')    AS set_fn
),
-- 安全计数：表不存在时返回 NULL，而不是让整段检测报错
cnt AS (
  SELECT
    CASE WHEN to_regclass('public.admin_users') IS NULL THEN NULL ELSE
      (xpath('/row/c/text()', query_to_xml(
        'SELECT count(*) AS c FROM public.admin_users WHERE role = ''super'' AND is_active AND password_hash IS NOT NULL',
        false, true, '')))[1]::text::int END AS super_admins,
    CASE WHEN to_regclass('public.admin_users') IS NULL THEN NULL ELSE
      (xpath('/row/c/text()', query_to_xml(
        'SELECT count(*) AS c FROM public.admin_users WHERE password_plain IS NOT NULL',
        false, true, '')))[1]::text::int END AS plain_passwords,
    CASE WHEN to_regclass('public.admin_users') IS NULL THEN NULL ELSE
      (xpath('/row/c/text()', query_to_xml(
        'SELECT count(*) AS c FROM public.admin_users', false, true, '')))[1]::text::int END AS admin_total,
    CASE WHEN to_regclass('public.announcement_config') IS NULL THEN NULL ELSE
      (xpath('/row/c/text()', query_to_xml(
        'SELECT count(*) AS c FROM public.announcement_config WHERE id = 1', false, true, '')))[1]::text::int END AS announcement_row,
    CASE WHEN to_regclass('public.site_branding') IS NULL THEN NULL ELSE
      (xpath('/row/c/text()', query_to_xml(
        'SELECT count(*) AS c FROM public.site_branding WHERE id = 1', false, true, '')))[1]::text::int END AS branding_row,
    CASE WHEN to_regclass('public.blockchain_channel_config') IS NULL THEN NULL ELSE
      (xpath('/row/c/text()', query_to_xml(
        'SELECT count(*) AS c FROM public.blockchain_channel_config WHERE id = 1', false, true, '')))[1]::text::int END AS blockchain_row,
    CASE WHEN to_regclass('public.transactions') IS NULL THEN NULL ELSE
      (xpath('/row/c/text()', query_to_xml(
        'SELECT count(*) AS c FROM public.transactions', false, true, '')))[1]::text::int END AS tx_total,
    CASE WHEN to_regclass('public.kyc_submissions') IS NULL THEN NULL ELSE
      (xpath('/row/c/text()', query_to_xml(
        'SELECT count(*) AS c FROM public.kyc_submissions', false, true, '')))[1]::text::int END AS submission_total
),
checks(no, item, result, detail) AS (
  SELECT 1, '数据表是否齐全',
    CASE WHEN bool_and(present) THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE present) || ' / 18 张'
      || coalesce('，缺少：' || string_agg(t, '、') FILTER (WHERE NOT present), '')
  FROM tbl
  UNION ALL
  SELECT 2, '所有表都已加锁（RLS）',
    CASE WHEN bool_and(rls) THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE rls) || ' / 18 张'
      || coalesce('，未加锁：' || string_agg(t, '、') FILTER (WHERE present AND NOT rls), '')
  FROM tbl
  UNION ALL
  SELECT 3, '密码加密功能（pgcrypto）已安装',
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN 'PASS' ELSE 'FAIL' END,
    coalesce((SELECT '安装在 ' || n.nspname || ' 区' FROM pg_extension x
              JOIN pg_namespace n ON n.oid = x.extnamespace WHERE x.extname = 'pgcrypto'), '未安装')
  UNION ALL
  SELECT 4, '管理员登录用的加密函数可用',
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'crypt' AND n.nspname IN ('public', 'extensions')
    ) THEN 'PASS' ELSE 'FAIL' END,
    '必须在 public 或 extensions 区，否则管理员无法登录'
  UNION ALL
  SELECT 5, '管理员密码校验/设置函数存在',
    CASE WHEN verify_fn IS NOT NULL AND set_fn IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN verify_fn IS NULL THEN '缺少 verify_admin_password ' ELSE '' END
      || CASE WHEN set_fn IS NULL THEN '缺少 set_admin_password' ELSE '' END
  FROM fn
  UNION ALL
  SELECT 6, '密码函数只允许后台程序调用',
    CASE WHEN verify_fn IS NULL OR set_fn IS NULL THEN 'FAIL'
         WHEN has_function_privilege('service_role', verify_fn::oid, 'EXECUTE')
          AND has_function_privilege('service_role', set_fn::oid, 'EXECUTE')
          AND NOT has_function_privilege('anon', verify_fn::oid, 'EXECUTE')
          AND NOT has_function_privilege('anon', set_fn::oid, 'EXECUTE')
          AND NOT has_function_privilege('authenticated', set_fn::oid, 'EXECUTE')
         THEN 'PASS' ELSE 'FAIL' END,
    '外部访客不能直接调用，防止改密码或暴力破解'
  FROM fn
  UNION ALL
  SELECT 7, '有可用的超级管理员账号',
    CASE WHEN coalesce(super_admins, 0) >= 1 THEN 'PASS' ELSE 'FAIL' END,
    coalesce(super_admins, 0) || ' 个（已启用且已设置密码）'
  FROM cnt
  UNION ALL
  SELECT 8, '没有明文保存的密码',
    CASE WHEN plain_passwords = 0 THEN 'PASS' ELSE 'FAIL' END,
    coalesce(plain_passwords::text, '?') || ' 个明文密码'
  FROM cnt
  UNION ALL
  SELECT 9, '默认设置数据已写入',
    CASE WHEN announcement_row = 1 AND branding_row = 1 AND blockchain_row = 1 THEN 'PASS' ELSE 'FAIL' END,
    '公告=' || coalesce(announcement_row, 0) || '，品牌=' || coalesce(branding_row, 0)
      || '，区块链通道=' || coalesce(blockchain_row, 0) || '（每项应为 1）'
  FROM cnt
  UNION ALL
  SELECT 10, '索引是否齐全',
    CASE WHEN bool_and(present) THEN 'PASS' ELSE 'FAIL' END,
    count(*) FILTER (WHERE present) || ' / 13 个'
      || coalesce('，缺少：' || string_agg(i, '、') FILTER (WHERE NOT present), '')
  FROM idx
  UNION ALL
  SELECT 11, '自动更新时间的触发器',
    CASE WHEN to_regprocedure('public.update_updated_at()') IS NOT NULL
          AND EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal
                      AND tgfoid = to_regprocedure('public.update_updated_at()')::oid)
         THEN 'PASS' ELSE 'FAIL' END,
    (SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal
       AND tgfoid = to_regprocedure('public.update_updated_at()')::oid) || ' 个触发器'
  UNION ALL
  SELECT 12, '数据数量（和旧数据库对比）', 'INFO',
    '管理员 ' || coalesce(admin_total::text, '?') || ' 个，交易 ' || coalesce(tx_total::text, '?')
      || ' 条，提交记录 ' || coalesce(submission_total::text, '?') || ' 条'
  FROM cnt
)
SELECT no AS "编号", item AS "检测项目", result AS "结果", detail AS "说明"
FROM checks
ORDER BY no;
