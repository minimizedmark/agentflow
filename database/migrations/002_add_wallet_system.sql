-- Add wallet balance to users table
ALTER TABLE users
ADD COLUMN wallet_balance_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN low_balance_threshold_usd DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
ADD COLUMN low_balance_notified_at TIMESTAMPTZ;

-- Create wallet_transactions table to track all deposits and withdrawals
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'refund', 'adjustment')),
  amount_usd DECIMAL(10, 2) NOT NULL,
  balance_before_usd DECIMAL(10, 2) NOT NULL,
  balance_after_usd DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- For deposits via Stripe
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,

  -- For withdrawals (call costs)
  related_call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for wallet transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_stripe_payment_intent ON wallet_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_related_call ON wallet_transactions(related_call_id);

-- Row Level Security for wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view own wallet transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can create transactions (via service role)
CREATE POLICY "Service can create wallet transactions" ON wallet_transactions
  FOR INSERT WITH CHECK (true);

-- Function to deduct from wallet (ensures atomic balance update)
CREATE OR REPLACE FUNCTION deduct_from_wallet(
  p_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_description TEXT,
  p_call_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance DECIMAL(10, 2);
  v_new_balance DECIMAL(10, 2);
  v_transaction_id UUID;
BEGIN
  -- Lock the user row for update
  SELECT wallet_balance_usd INTO v_current_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'current_balance', v_current_balance,
      'required_amount', p_amount
    );
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- Update user balance
  UPDATE users
  SET wallet_balance_usd = v_new_balance
  WHERE id = p_user_id;

  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    transaction_type,
    amount_usd,
    balance_before_usd,
    balance_after_usd,
    description,
    related_call_id,
    status
  ) VALUES (
    p_user_id,
    'withdrawal',
    p_amount,
    v_current_balance,
    v_new_balance,
    p_description,
    p_call_id,
    'completed'
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- Function to add to wallet (for deposits)
CREATE OR REPLACE FUNCTION add_to_wallet(
  p_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_description TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_charge_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance DECIMAL(10, 2);
  v_new_balance DECIMAL(10, 2);
  v_transaction_id UUID;
BEGIN
  -- Lock the user row for update
  SELECT wallet_balance_usd INTO v_current_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;

  -- Update user balance
  UPDATE users
  SET wallet_balance_usd = v_new_balance
  WHERE id = p_user_id;

  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    transaction_type,
    amount_usd,
    balance_before_usd,
    balance_after_usd,
    description,
    stripe_payment_intent_id,
    stripe_charge_id,
    status
  ) VALUES (
    p_user_id,
    'deposit',
    p_amount,
    v_current_balance,
    v_new_balance,
    p_description,
    p_stripe_payment_intent_id,
    p_stripe_charge_id,
    'completed'
  ) RETURNING id INTO v_transaction_id;

  -- Reset low balance notification flag
  UPDATE users
  SET low_balance_notified_at = NULL
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has sufficient balance
CREATE OR REPLACE FUNCTION has_sufficient_balance(
  p_user_id UUID,
  p_required_amount DECIMAL(10, 2) DEFAULT 5.00
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL(10, 2);
BEGIN
  SELECT wallet_balance_usd INTO v_balance
  FROM users
  WHERE id = p_user_id;

  RETURN v_balance >= p_required_amount;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check balance before allowing calls
CREATE OR REPLACE FUNCTION check_balance_before_call()
RETURNS TRIGGER AS $$
DECLARE
  v_user_balance DECIMAL(10, 2);
  v_threshold DECIMAL(10, 2) := 2.00; -- Minimum $2 for a call
BEGIN
  -- Get user's current balance
  SELECT wallet_balance_usd INTO v_user_balance
  FROM users
  WHERE id = NEW.user_id;

  -- If balance is too low, prevent the call
  IF v_user_balance < v_threshold THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Please add funds to continue.'
      USING HINT = 'Current balance: $' || v_user_balance || ', Required: $' || v_threshold;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply balance check trigger to calls table
CREATE TRIGGER check_balance_before_call_trigger
  BEFORE INSERT ON calls
  FOR EACH ROW
  EXECUTE FUNCTION check_balance_before_call();

-- Comment documentation
COMMENT ON COLUMN users.wallet_balance_usd IS 'Prepaid wallet balance in USD';
COMMENT ON COLUMN users.low_balance_threshold_usd IS 'Threshold for low balance notifications';
COMMENT ON COLUMN users.low_balance_notified_at IS 'Last time user was notified about low balance';
COMMENT ON TABLE wallet_transactions IS 'Tracks all wallet deposits, withdrawals, and adjustments';
COMMENT ON FUNCTION deduct_from_wallet IS 'Atomically deducts amount from user wallet and creates transaction record';
COMMENT ON FUNCTION add_to_wallet IS 'Atomically adds amount to user wallet and creates transaction record';
COMMENT ON FUNCTION has_sufficient_balance IS 'Checks if user has sufficient wallet balance for operations';
