-- ============================================================================
-- AgentFlow Complete Database Setup
-- ============================================================================
-- This file contains all migrations needed to set up the AgentFlow database.
-- Run this in your Supabase SQL Editor to initialize the database.
--
-- Order of execution:
--   1. Extensions and functions
--   2. Core tables (users, agents, calls)
--   3. Wallet system
--   4. Advanced features
--   5. Service architecture
--   6. Admin roles
--   7. Row Level Security (RLS) policies
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS AND SETUP
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_cron for scheduled jobs
-- NOTE: pg_cron is only available on Supabase Pro plan and above (not free tier)
-- Uncomment the line below if you're on a paid plan and need scheduled jobs
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- PART 2: UTILITY FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
BEGIN
    RETURN (SELECT auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: CORE TABLES
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_customer_id TEXT,
  current_plan TEXT NOT NULL DEFAULT 'trial',
  monthly_call_limit INTEGER NOT NULL DEFAULT 50,
  
  -- Wallet fields
  wallet_balance_usd DECIMAL(10, 2) DEFAULT 0.00,
  low_balance_threshold_usd DECIMAL(10, 2) DEFAULT 10.00,
  auto_recharge_enabled BOOLEAN DEFAULT false,
  auto_recharge_amount_usd DECIMAL(10, 2) DEFAULT 50.00,
  auto_recharge_trigger_usd DECIMAL(10, 2) DEFAULT 10.00,
  
  -- Admin fields
  is_admin BOOLEAN DEFAULT false,
  admin_role TEXT CHECK (admin_role IN ('super_admin', 'admin', 'support')) DEFAULT NULL,
  admin_permissions JSONB DEFAULT '[]'::jsonb
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry_template TEXT,
  phone_number TEXT,
  system_prompt TEXT NOT NULL,
  voice_model TEXT NOT NULL DEFAULT 'Ara',
  language TEXT NOT NULL DEFAULT 'en-US',
  tools JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  twilio_call_sid TEXT NOT NULL UNIQUE,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'failed')),
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing cycles table
CREATE TABLE IF NOT EXISTS billing_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_minutes DECIMAL(10, 2) DEFAULT 0.00,
  platform_fee_usd DECIMAL(10, 2) DEFAULT 50.00,
  usage_charges_usd DECIMAL(10, 2) DEFAULT 0.00,
  total_amount_usd DECIMAL(10, 2) DEFAULT 50.00,
  stripe_invoice_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Tool integrations table
CREATE TABLE IF NOT EXISTS tool_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 4: WALLET SYSTEM TABLES
-- ============================================================================

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'charge', 'refund', 'adjustment')),
  amount_usd DECIMAL(10, 2) NOT NULL,
  balance_after_usd DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_account')),
  last4 TEXT NOT NULL,
  brand TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promo code usage table
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discount_amount_usd DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id)
);

-- ============================================================================
-- PART 5: SERVICE ARCHITECTURE TABLES
-- ============================================================================

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('communication', 'intelligence', 'operations', 'industry_specific', 'web_digital', 'growth_retention')),
  description TEXT NOT NULL,
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('per_minute', 'per_message', 'per_call', 'per_action', 'monthly', 'per_export', 'per_sync')),
  base_price_usd DECIMAL(10, 4) NOT NULL,
  bundle_discount_percent INTEGER DEFAULT 0,
  depends_on_service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User services table (tracks which services users have enabled)
CREATE TABLE IF NOT EXISTS user_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  UNIQUE(user_id, service_id)
);

-- Service usage table (tracks usage for billing)
CREATE TABLE IF NOT EXISTS service_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,
  quantity DECIMAL(10, 4) NOT NULL,
  unit_price_usd DECIMAL(10, 4) NOT NULL,
  total_cost_usd DECIMAL(10, 4) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 6: ADMIN AND MONITORING TABLES
-- ============================================================================

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 7: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_phone_number ON agents(phone_number);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_call_sid ON calls(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

CREATE INDEX IF NOT EXISTS idx_billing_cycles_user_id ON billing_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_period ON billing_cycles(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default ON payment_methods(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_is_active ON promo_codes(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_services_user_id ON user_services(user_id);
CREATE INDEX IF NOT EXISTS idx_user_services_service_id ON user_services(service_id);

CREATE INDEX IF NOT EXISTS idx_service_usage_user_id ON service_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_service_id ON service_usage(service_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_recorded_at ON service_usage(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin_id ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- ============================================================================
-- PART 8: TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on agents
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on tool_integrations
CREATE TRIGGER update_tool_integrations_updated_at
    BEFORE UPDATE ON tool_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 9: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Agents table policies
CREATE POLICY "Users can view own agents" ON agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agents" ON agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents" ON agents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents" ON agents
    FOR DELETE USING (auth.uid() = user_id);

-- Calls table policies
CREATE POLICY "Users can view own calls" ON calls
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calls" ON calls
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Billing cycles table policies
CREATE POLICY "Users can view own billing cycles" ON billing_cycles
    FOR SELECT USING (auth.uid() = user_id);

-- Tool integrations table policies
CREATE POLICY "Users can manage own tool integrations" ON tool_integrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM agents WHERE agents.id = tool_integrations.agent_id AND agents.user_id = auth.uid()
        )
    );

-- Wallet transactions table policies
CREATE POLICY "Users can view own wallet transactions" ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Payment methods table policies
CREATE POLICY "Users can manage own payment methods" ON payment_methods
    FOR ALL USING (auth.uid() = user_id);

-- Promo codes table policies (read-only for users)
CREATE POLICY "Everyone can view active promo codes" ON promo_codes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage promo codes" ON promo_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Services table policies (read-only for users)
CREATE POLICY "Everyone can view active services" ON services
    FOR SELECT USING (is_active = true);

-- User services table policies
CREATE POLICY "Users can manage own services" ON user_services
    FOR ALL USING (auth.uid() = user_id);

-- Service usage table policies
CREATE POLICY "Users can view own service usage" ON service_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Activity logs table policies
CREATE POLICY "Users can view own activity logs" ON activity_logs
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = admin_id);

CREATE POLICY "Admins can view all activity logs" ON activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- System settings table policies (admin only)
CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================================================
-- PART 10: SEED DATA (OPTIONAL)
-- ============================================================================
-- NOTE: These are example/default pricing values for development and testing.
-- Update these values for your production environment based on your actual costs.

-- Insert default services
INSERT INTO services (slug, name, category, description, pricing_model, base_price_usd) VALUES
  ('voice_receptionist', 'AI Voice Receptionist', 'communication', 'AI-powered voice receptionist for handling calls 24/7', 'per_minute', 2.00),
  ('sms_autoresponder', 'SMS Autoresponder', 'communication', 'Automated SMS responses to customer inquiries', 'per_message', 1.00),
  ('email_assistant', 'Email Assistant', 'communication', 'AI-powered email response assistant', 'per_message', 0.50),
  ('call_recording', 'Call Recording & Transcription', 'intelligence', 'Record and transcribe all calls', 'per_call', 0.50),
  ('sentiment_analysis', 'Sentiment Analysis', 'intelligence', 'Analyze customer sentiment from interactions', 'per_call', 0.10),
  ('analytics_dashboard', 'Analytics Dashboard', 'operations', 'Real-time analytics and reporting', 'per_export', 2.00),
  ('website_hosting', 'Website Hosting', 'web_digital', 'AI-built website with hosting', 'monthly', 5.00),
  ('review_management', 'Review Management', 'growth_retention', 'Automated review requests and responses', 'per_action', 0.50),
  ('text_to_pay', 'Text-to-Pay', 'growth_retention', 'Send payment links via SMS', 'per_action', 0.50)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- 
-- Your database is now ready to use. Next steps:
-- 
-- 1. Set up your environment variables:
--    - NEXT_PUBLIC_SUPABASE_URL
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY
--    - SUPABASE_SERVICE_ROLE_KEY
-- 
-- 2. Test the signup flow at /signup
-- 
-- 3. Configure additional services as needed
-- 
-- ============================================================================
