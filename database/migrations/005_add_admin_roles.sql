-- Add admin role and permissions
-- Migration: 005_add_admin_roles.sql

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer'
  CHECK (role IN ('customer', 'admin', 'super_admin'));

-- Add role index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create admin activity logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_resource_type TEXT, -- e.g., 'user', 'promo_code', 'wallet', 'call'
  target_resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for admin activity queries
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_user ON admin_activity_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_activity_logs(action);

-- Create promo codes table (if not exists)
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  credit_amount DECIMAL(10, 2) NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_credit CHECK (credit_amount > 0),
  CONSTRAINT valid_usage_limit CHECK (usage_limit IS NULL OR usage_limit > 0)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active);

-- Create promo code redemptions table
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_amount DECIMAL(10, 2) NOT NULL,
  transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_code_redemptions(promo_code_id);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_admin_user_id UUID,
  p_action TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_target_resource_type TEXT DEFAULT NULL,
  p_target_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Verify user is admin
  IF NOT is_admin(p_admin_user_id) THEN
    RAISE EXCEPTION 'User % is not an admin', p_admin_user_id;
  END IF;

  INSERT INTO admin_activity_logs (
    admin_user_id,
    action,
    target_user_id,
    target_resource_type,
    target_resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_user_id,
    p_action,
    p_target_user_id,
    p_target_resource_type,
    p_target_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create promo code
CREATE OR REPLACE FUNCTION create_promo_code(
  p_admin_user_id UUID,
  p_code TEXT,
  p_credit_amount DECIMAL,
  p_usage_limit INTEGER DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_promo_id UUID;
BEGIN
  -- Verify user is admin
  IF NOT is_admin(p_admin_user_id) THEN
    RAISE EXCEPTION 'User % is not an admin', p_admin_user_id;
  END IF;

  -- Create promo code
  INSERT INTO promo_codes (
    code,
    credit_amount,
    usage_limit,
    expires_at,
    created_by
  ) VALUES (
    UPPER(TRIM(p_code)),
    p_credit_amount,
    p_usage_limit,
    p_expires_at,
    p_admin_user_id
  )
  RETURNING id INTO v_promo_id;

  -- Log activity
  PERFORM log_admin_activity(
    p_admin_user_id,
    'promo_code_created',
    NULL,
    'promo_code',
    v_promo_id,
    jsonb_build_object(
      'code', p_code,
      'credit_amount', p_credit_amount,
      'usage_limit', p_usage_limit
    )
  );

  RETURN v_promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem promo code (updated)
CREATE OR REPLACE FUNCTION redeem_promo_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  credit_amount DECIMAL,
  new_balance DECIMAL,
  transaction_id UUID,
  error TEXT
) AS $$
DECLARE
  v_promo promo_codes;
  v_transaction_id UUID;
  v_new_balance DECIMAL;
BEGIN
  -- Find promo code
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = UPPER(TRIM(p_code))
  AND is_active = true;

  -- Check if promo exists
  IF v_promo.id IS NULL THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL, NULL::UUID, 'Invalid promo code';
    RETURN;
  END IF;

  -- Check if already redeemed by this user
  IF EXISTS (
    SELECT 1 FROM promo_code_redemptions
    WHERE promo_code_id = v_promo.id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL, NULL::UUID, 'Promo code already redeemed';
    RETURN;
  END IF;

  -- Check expiration
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL, NULL::UUID, 'Promo code expired';
    RETURN;
  END IF;

  -- Check usage limit
  IF v_promo.usage_limit IS NOT NULL AND v_promo.usage_count >= v_promo.usage_limit THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 0::DECIMAL, NULL::UUID, 'Promo code usage limit reached';
    RETURN;
  END IF;

  -- Add credit to wallet
  INSERT INTO wallet_transactions (
    user_id,
    amount_usd,
    transaction_type,
    description,
    status
  ) VALUES (
    p_user_id,
    v_promo.credit_amount,
    'promo_credit',
    'Promo code: ' || v_promo.code,
    'completed'
  )
  RETURNING id INTO v_transaction_id;

  -- Update wallet balance
  UPDATE users
  SET wallet_balance_usd = COALESCE(wallet_balance_usd, 0) + v_promo.credit_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING wallet_balance_usd INTO v_new_balance;

  -- Record redemption
  INSERT INTO promo_code_redemptions (
    promo_code_id,
    user_id,
    credit_amount,
    transaction_id
  ) VALUES (
    v_promo.id,
    p_user_id,
    v_promo.credit_amount,
    v_transaction_id
  );

  -- Update usage count
  UPDATE promo_codes
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = v_promo.id;

  RETURN QUERY SELECT true, v_promo.credit_amount, v_new_balance, v_transaction_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get platform statistics
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_agents BIGINT,
  active_agents BIGINT,
  total_calls BIGINT,
  calls_today BIGINT,
  total_revenue DECIMAL,
  revenue_today DECIMAL,
  total_minutes BIGINT,
  avg_call_duration DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM users)::BIGINT,
    (SELECT COUNT(*) FROM users WHERE is_active = true)::BIGINT,
    (SELECT COUNT(*) FROM agents)::BIGINT,
    (SELECT COUNT(*) FROM agents WHERE is_active = true)::BIGINT,
    (SELECT COUNT(*) FROM calls)::BIGINT,
    (SELECT COUNT(*) FROM calls WHERE started_at >= CURRENT_DATE)::BIGINT,
    (SELECT COALESCE(SUM(amount_usd), 0) FROM wallet_transactions WHERE transaction_type = 'deposit' AND status = 'completed'),
    (SELECT COALESCE(SUM(amount_usd), 0) FROM wallet_transactions WHERE transaction_type = 'deposit' AND status = 'completed' AND created_at >= CURRENT_DATE),
    (SELECT COALESCE(SUM(duration_seconds), 0) FROM calls WHERE status = 'completed')::BIGINT,
    (SELECT COALESCE(AVG(duration_seconds), 0) FROM calls WHERE status = 'completed');
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for admin functions
-- Note: In production, ensure RLS policies are properly configured

COMMENT ON TABLE admin_activity_logs IS 'Logs all admin actions for audit trail';
COMMENT ON TABLE promo_codes IS 'Promotional codes for wallet credits';
COMMENT ON TABLE promo_code_redemptions IS 'Tracks promo code usage by users';
COMMENT ON FUNCTION is_admin IS 'Check if a user has admin privileges';
COMMENT ON FUNCTION log_admin_activity IS 'Log admin actions for audit trail';
COMMENT ON FUNCTION create_promo_code IS 'Admin function to create new promo codes';
COMMENT ON FUNCTION redeem_promo_code IS 'User function to redeem promo codes';
COMMENT ON FUNCTION get_platform_stats IS 'Get platform-wide statistics for admin dashboard';
