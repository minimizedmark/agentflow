-- Agent12 Database Schema
-- This creates all tables needed for the AI voice agent platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (customers who use the platform)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    stripe_customer_id VARCHAR(255) UNIQUE,
    current_plan VARCHAR(50) DEFAULT 'starter',
    monthly_call_limit INTEGER DEFAULT 50
);

-- Agents table (voice agents configured by users)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry_template VARCHAR(100), -- 'dental', 'hvac', 'restaurant', 'salon', 'custom'
    phone_number VARCHAR(20) UNIQUE, -- Twilio number assigned to this agent
    system_prompt TEXT NOT NULL,
    voice_model VARCHAR(50) DEFAULT 'Ara', -- Grok voice options: Ara, Eve, Leo
    language VARCHAR(10) DEFAULT 'en',
    tools JSONB DEFAULT '[]'::jsonb, -- Array of enabled tools (calendar, crm, etc)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table (logs every call made through the system)
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twilio_call_sid VARCHAR(255) UNIQUE NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    direction VARCHAR(20) NOT NULL, -- 'inbound' or 'outbound'
    status VARCHAR(50) NOT NULL, -- 'initiated', 'ringing', 'in-progress', 'completed', 'failed'
    duration_seconds INTEGER DEFAULT 0,
    recording_url TEXT,
    transcript TEXT,
    cost_usd DECIMAL(10, 4) DEFAULT 0.00, -- Actual cost (Grok + Twilio)
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing cycles table (monthly usage summaries)
CREATE TABLE billing_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    total_minutes DECIMAL(10, 2) DEFAULT 0.00,
    platform_fee_usd DECIMAL(10, 2) DEFAULT 50.00,
    usage_charges_usd DECIMAL(10, 2) DEFAULT 0.00,
    total_amount_usd DECIMAL(10, 2) DEFAULT 50.00,
    stripe_invoice_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, period_start)
);

-- Tool integrations table (calendar, CRM connections per agent)
CREATE TABLE tool_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_type VARCHAR(50) NOT NULL, -- 'google_calendar', 'webhook', 'stripe', etc
    config JSONB NOT NULL, -- Stores API keys, webhook URLs, etc
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_calls_agent_id ON calls(agent_id);
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_started_at ON calls(started_at);
CREATE INDEX idx_billing_cycles_user_id ON billing_cycles(user_id);
CREATE INDEX idx_billing_cycles_period ON billing_cycles(period_start, period_end);
CREATE INDEX idx_tool_integrations_agent_id ON tool_integrations(agent_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_integrations_updated_at BEFORE UPDATE ON tool_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
