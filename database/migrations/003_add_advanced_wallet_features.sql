-- Advanced Wallet Features Migration
-- Adds: auto-reload, payment methods, promo codes, spending limits, and more

-- ========================================
-- 1. PAYMENT METHODS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe payment method details
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,

  -- Card details (last 4, brand, etc.)
  card_brand TEXT, -- visa, mastercard, amex, etc.
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Billing details
  billing_name TEXT,
  billing_email TEXT,
  billing_address JSONB,

  -- Status
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_pm_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(user_id, is_default) WHERE is_default = true;

-- ========================================
-- 2. AUTO-RELOAD CONFIGURATION
-- ========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auto_reload_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_reload_threshold_usd DECIMAL(10, 2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS auto_reload_amount_usd DECIMAL(10, 2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS auto_reload_payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL;

-- ========================================
-- 3. SPENDING LIMITS
-- ========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS daily_spending_limit_usd DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS weekly_spending_limit_usd DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS monthly_spending_limit_usd DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS spending_limit_enabled BOOLEAN NOT NULL DEFAULT false;

-- ========================================
-- 4. PROMOTIONAL CODES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Credit amount
  credit_amount_usd DECIMAL(10, 2) NOT NULL,

  -- Usage limits
  max_uses INTEGER, -- null = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,

  -- Validity
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;

-- ========================================
-- 5. PROMO CODE REDEMPTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  credit_amount_usd DECIMAL(10, 2) NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(promo_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_id ON promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_promo_code_id ON promo_code_redemptions(promo_code_id);

-- ========================================
-- 6. ENHANCE WALLET TRANSACTIONS
-- ========================================
ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_auto_reload BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- ========================================
-- 7. NOTIFICATION PREFERENCES
-- ========================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Email notifications
  email_on_deposit BOOLEAN NOT NULL DEFAULT true,
  email_on_withdrawal BOOLEAN NOT NULL DEFAULT true,
  email_on_low_balance BOOLEAN NOT NULL DEFAULT true,
  email_on_auto_reload BOOLEAN NOT NULL DEFAULT true,
  email_on_refund BOOLEAN NOT NULL DEFAULT true,

  -- Digest settings
  daily_digest_enabled BOOLEAN NOT NULL DEFAULT false,
  weekly_digest_enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 8. NOTIFICATION LOG TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- low_balance, deposit, withdrawal, etc.
  channel TEXT NOT NULL, -- email, sms, push
  sent_to TEXT NOT NULL, -- email address or phone number
  subject TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at DESC);

-- ========================================
-- 9. ROW LEVEL SECURITY
-- ========================================

-- Payment methods policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Notification preferences policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification log policies
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notification_log
  FOR SELECT USING (auth.uid() = user_id);

-- Promo code redemptions policies
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" ON promo_code_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- 10. FUNCTIONS
-- ========================================

-- Function to redeem promo code
CREATE OR REPLACE FUNCTION redeem_promo_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_promo_id UUID;
  v_credit_amount DECIMAL(10, 2);
  v_max_uses INTEGER;
  v_current_uses INTEGER;
  v_max_uses_per_user INTEGER;
  v_user_redemptions INTEGER;
  v_valid_from TIMESTAMPTZ;
  v_valid_until TIMESTAMPTZ;
  v_is_active BOOLEAN;
  v_transaction_result JSONB;
  v_transaction_id UUID;
BEGIN
  -- Get promo code details
  SELECT id, credit_amount_usd, max_uses, current_uses, max_uses_per_user,
         valid_from, valid_until, is_active
  INTO v_promo_id, v_credit_amount, v_max_uses, v_current_uses,
       v_max_uses_per_user, v_valid_from, v_valid_until, v_is_active
  FROM promo_codes
  WHERE UPPER(code) = UPPER(p_code)
  FOR UPDATE;

  -- Validate promo code exists
  IF v_promo_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid promo code');
  END IF;

  -- Check if active
  IF NOT v_is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code is no longer active');
  END IF;

  -- Check validity dates
  IF v_valid_from > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code is not yet valid');
  END IF;

  IF v_valid_until IS NOT NULL AND v_valid_until < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has expired');
  END IF;

  -- Check max uses
  IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Promo code has reached maximum redemptions');
  END IF;

  -- Check user-specific redemptions
  SELECT COUNT(*) INTO v_user_redemptions
  FROM promo_code_redemptions
  WHERE promo_code_id = v_promo_id AND user_id = p_user_id;

  IF v_user_redemptions >= v_max_uses_per_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used this promo code');
  END IF;

  -- Add credit to wallet
  v_transaction_result := add_to_wallet(
    p_user_id,
    v_credit_amount,
    'Promo code: ' || p_code,
    NULL,
    NULL
  );

  IF NOT (v_transaction_result->>'success')::BOOLEAN THEN
    RETURN v_transaction_result;
  END IF;

  v_transaction_id := (v_transaction_result->>'transaction_id')::UUID;

  -- Update transaction with promo code reference
  UPDATE wallet_transactions
  SET promo_code_id = v_promo_id
  WHERE id = v_transaction_id;

  -- Record redemption
  INSERT INTO promo_code_redemptions (promo_code_id, user_id, transaction_id, credit_amount_usd)
  VALUES (v_promo_id, p_user_id, v_transaction_id, v_credit_amount);

  -- Increment usage counter
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo_id;

  RETURN jsonb_build_object(
    'success', true,
    'credit_amount', v_credit_amount,
    'new_balance', (v_transaction_result->>'balance_after')::DECIMAL,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check spending limit
CREATE OR REPLACE FUNCTION check_spending_limit(
  p_user_id UUID,
  p_amount DECIMAL(10, 2)
)
RETURNS JSONB AS $$
DECLARE
  v_limit_enabled BOOLEAN;
  v_daily_limit DECIMAL(10, 2);
  v_weekly_limit DECIMAL(10, 2);
  v_monthly_limit DECIMAL(10, 2);
  v_daily_spent DECIMAL(10, 2);
  v_weekly_spent DECIMAL(10, 2);
  v_monthly_spent DECIMAL(10, 2);
BEGIN
  -- Get user's spending limits
  SELECT spending_limit_enabled, daily_spending_limit_usd,
         weekly_spending_limit_usd, monthly_spending_limit_usd
  INTO v_limit_enabled, v_daily_limit, v_weekly_limit, v_monthly_limit
  FROM users
  WHERE id = p_user_id;

  -- If limits not enabled, allow
  IF NOT v_limit_enabled THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Calculate daily spending
  IF v_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(amount_usd), 0) INTO v_daily_spent
    FROM wallet_transactions
    WHERE user_id = p_user_id
      AND transaction_type = 'withdrawal'
      AND created_at >= CURRENT_DATE;

    IF v_daily_spent + p_amount > v_daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'limit_type', 'daily',
        'limit', v_daily_limit,
        'spent', v_daily_spent,
        'remaining', v_daily_limit - v_daily_spent
      );
    END IF;
  END IF;

  -- Calculate weekly spending
  IF v_weekly_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(amount_usd), 0) INTO v_weekly_spent
    FROM wallet_transactions
    WHERE user_id = p_user_id
      AND transaction_type = 'withdrawal'
      AND created_at >= DATE_TRUNC('week', CURRENT_DATE);

    IF v_weekly_spent + p_amount > v_weekly_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'limit_type', 'weekly',
        'limit', v_weekly_limit,
        'spent', v_weekly_spent,
        'remaining', v_weekly_limit - v_weekly_spent
      );
    END IF;
  END IF;

  -- Calculate monthly spending
  IF v_monthly_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(amount_usd), 0) INTO v_monthly_spent
    FROM wallet_transactions
    WHERE user_id = p_user_id
      AND transaction_type = 'withdrawal'
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

    IF v_monthly_spent + p_amount > v_monthly_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'limit_type', 'monthly',
        'limit', v_monthly_limit,
        'spent', v_monthly_spent,
        'remaining', v_monthly_limit - v_monthly_spent
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql;

-- Function to process auto-reload
CREATE OR REPLACE FUNCTION process_auto_reload(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_auto_reload_enabled BOOLEAN;
  v_threshold DECIMAL(10, 2);
  v_reload_amount DECIMAL(10, 2);
  v_current_balance DECIMAL(10, 2);
  v_payment_method_id UUID;
BEGIN
  -- Get auto-reload settings
  SELECT auto_reload_enabled, auto_reload_threshold_usd,
         auto_reload_amount_usd, wallet_balance_usd, auto_reload_payment_method_id
  INTO v_auto_reload_enabled, v_threshold, v_reload_amount,
       v_current_balance, v_payment_method_id
  FROM users
  WHERE id = p_user_id;

  -- Check if auto-reload should trigger
  IF NOT v_auto_reload_enabled THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'Auto-reload not enabled');
  END IF;

  IF v_current_balance >= v_threshold THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'Balance above threshold');
  END IF;

  IF v_payment_method_id IS NULL THEN
    RETURN jsonb_build_object('triggered', false, 'reason', 'No payment method configured');
  END IF;

  -- Return trigger signal for application to process payment
  RETURN jsonb_build_object(
    'triggered', true,
    'amount', v_reload_amount,
    'payment_method_id', v_payment_method_id,
    'current_balance', v_current_balance
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to check spending limits before withdrawal
CREATE OR REPLACE FUNCTION check_spending_limit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_limit_check JSONB;
BEGIN
  IF NEW.transaction_type = 'withdrawal' THEN
    v_limit_check := check_spending_limit(NEW.user_id, NEW.amount_usd);

    IF NOT (v_limit_check->>'allowed')::BOOLEAN THEN
      RAISE EXCEPTION 'Spending limit exceeded: % limit of $ % (spent: $ %, remaining: $ %)',
        v_limit_check->>'limit_type',
        v_limit_check->>'limit',
        v_limit_check->>'spent',
        v_limit_check->>'remaining'
        USING HINT = 'Adjust your spending limits in wallet settings';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_spending_limit_before_withdrawal
  BEFORE INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_spending_limit_trigger();

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'RCP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('receipt_sequence')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipt_sequence START 1;

-- Trigger to auto-generate receipt numbers
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type IN ('deposit', 'refund') AND NEW.receipt_number IS NULL THEN
    NEW.receipt_number := generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_receipt_number_trigger
  BEFORE INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_receipt_number();

-- ========================================
-- 11. TRIGGER FOR UPDATED_AT
-- ========================================

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 12. COMMENTS
-- ========================================

COMMENT ON TABLE payment_methods IS 'Stores user payment methods (credit cards) for wallet top-ups';
COMMENT ON TABLE promo_codes IS 'Promotional codes for wallet credits';
COMMENT ON TABLE promo_code_redemptions IS 'Tracks which users have redeemed which promo codes';
COMMENT ON TABLE notification_preferences IS 'User notification preferences for wallet events';
COMMENT ON TABLE notification_log IS 'Log of all notifications sent to users';
COMMENT ON FUNCTION redeem_promo_code IS 'Validates and redeems a promotional code for wallet credit';
COMMENT ON FUNCTION check_spending_limit IS 'Checks if a withdrawal would exceed daily/weekly/monthly spending limits';
COMMENT ON FUNCTION process_auto_reload IS 'Checks if auto-reload should be triggered and returns reload parameters';
