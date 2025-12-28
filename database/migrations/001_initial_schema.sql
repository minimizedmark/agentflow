-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
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
  monthly_call_limit INTEGER NOT NULL DEFAULT 50
);

-- Create agents table
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

-- Create calls table
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

-- Create billing_cycles table
CREATE TABLE IF NOT EXISTS billing_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_minutes DECIMAL(10, 2) NOT NULL DEFAULT 0,
  platform_fee_usd DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  usage_charges_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stripe_invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tool_integrations table
CREATE TABLE IF NOT EXISTS tool_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_call_sid ON calls(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_user_id ON billing_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_cycles_period ON billing_cycles(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_tool_integrations_agent_id ON tool_integrations(agent_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_integrations_updated_at BEFORE UPDATE ON tool_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Agents policies
CREATE POLICY "Users can view own agents" ON agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agents" ON agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents" ON agents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents" ON agents
  FOR DELETE USING (auth.uid() = user_id);

-- Calls policies
CREATE POLICY "Users can view own calls" ON calls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create calls" ON calls
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own calls" ON calls
  FOR UPDATE USING (auth.uid() = user_id);

-- Billing cycles policies
CREATE POLICY "Users can view own billing cycles" ON billing_cycles
  FOR SELECT USING (auth.uid() = user_id);

-- Tool integrations policies
CREATE POLICY "Users can view own tool integrations" ON tool_integrations
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id)
  );

CREATE POLICY "Users can create own tool integrations" ON tool_integrations
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id)
  );

CREATE POLICY "Users can update own tool integrations" ON tool_integrations
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id)
  );

CREATE POLICY "Users can delete own tool integrations" ON tool_integrations
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM agents WHERE id = agent_id)
  );
