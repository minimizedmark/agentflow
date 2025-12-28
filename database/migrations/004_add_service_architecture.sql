-- Service Architecture Framework
-- Enables modular, toggleable services for the Agent12 platform

-- ========================================
-- 1. SERVICES REGISTRY
-- ========================================
-- Master registry of all available services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Service identification
  service_key TEXT NOT NULL UNIQUE, -- 'voice_receptionist', 'sms_autoresponder', 'missed_call_responder'
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name (lucide-react icon)

  -- Service classification
  category TEXT NOT NULL, -- 'core', 'communication', 'intelligence', 'automation', 'integration', 'enterprise'
  tier TEXT NOT NULL DEFAULT 'standard', -- 'free', 'standard', 'premium', 'enterprise'

  -- Pricing
  base_price_usd DECIMAL(10, 2) DEFAULT 0.00, -- Monthly base fee
  usage_based BOOLEAN DEFAULT false,
  usage_price_model JSONB, -- { type: 'per_call', price: 0.10 } or { type: 'per_sms', price: 0.05 }

  -- Service metadata
  version TEXT DEFAULT '1.0.0',
  is_available BOOLEAN DEFAULT true,
  is_beta BOOLEAN DEFAULT false,
  requires_services TEXT[], -- Array of service_keys this depends on
  conflicts_with TEXT[], -- Array of service_keys that conflict with this

  -- Configuration
  config_schema JSONB, -- JSON schema for service configuration
  default_config JSONB, -- Default configuration values

  -- Documentation
  setup_instructions TEXT,
  documentation_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_key ON services(service_key);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_available ON services(is_available) WHERE is_available = true;

-- ========================================
-- 2. USER SERVICE SUBSCRIPTIONS
-- ========================================
-- Tracks which services each user has enabled
CREATE TABLE IF NOT EXISTS user_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

  -- Status
  enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,

  -- Configuration
  config JSONB DEFAULT '{}'::jsonb, -- User's custom configuration for this service

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_user_services_user_id ON user_services(user_id);
CREATE INDEX IF NOT EXISTS idx_user_services_service_id ON user_services(service_id);
CREATE INDEX IF NOT EXISTS idx_user_services_enabled ON user_services(user_id, enabled) WHERE enabled = true;

-- ========================================
-- 3. SERVICE USAGE LOGS
-- ========================================
-- Tracks usage for billing and analytics
CREATE TABLE IF NOT EXISTS service_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_service_id UUID NOT NULL REFERENCES user_services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

  -- Usage details
  usage_type TEXT NOT NULL, -- 'call', 'sms', 'api_call', etc.
  quantity INTEGER DEFAULT 1,
  cost_usd DECIMAL(10, 4) DEFAULT 0.0000,

  -- Context
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (call_id, sms_id, etc.)

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_usage_user_id ON service_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_service_id ON service_usage_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_created_at ON service_usage_logs(created_at DESC);

-- ========================================
-- 4. SMS MESSAGES TABLE (for Service 2 & 3)
-- ========================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Twilio details
  twilio_message_sid TEXT UNIQUE,

  -- Message details
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
  error_message TEXT,

  -- Service tracking
  service_key TEXT, -- Which service sent this (sms_autoresponder, missed_call_responder)
  related_call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Response tracking (for conversations)
  in_reply_to UUID REFERENCES sms_messages(id) ON DELETE SET NULL,
  conversation_id UUID, -- Group related messages

  -- AI/automation
  is_automated BOOLEAN DEFAULT false,
  template_used TEXT,

  -- Cost
  cost_usd DECIMAL(10, 4) DEFAULT 0.0000,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_user_id ON sms_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_agent_id ON sms_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_sms_conversation ON sms_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sms_created_at ON sms_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_service_key ON sms_messages(service_key);

-- ========================================
-- 5. SMS TEMPLATES
-- ========================================
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Template details
  name TEXT NOT NULL,
  service_key TEXT NOT NULL, -- Which service this template is for
  message_template TEXT NOT NULL, -- Template with {{variables}}

  -- Settings
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Variables available
  available_variables JSONB, -- ["business_name", "caller_name", "phone_number", etc.]

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_user_id ON sms_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_service ON sms_templates(service_key);

-- ========================================
-- 6. ROW LEVEL SECURITY
-- ========================================

ALTER TABLE user_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- Users can view/manage their own services
CREATE POLICY "Users can view own services" ON user_services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can enable services" ON user_services
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services" ON user_services
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their usage logs
CREATE POLICY "Users can view own usage logs" ON service_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view/manage their SMS messages
CREATE POLICY "Users can view own sms" ON sms_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can send sms" ON sms_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their SMS templates
CREATE POLICY "Users can view own templates" ON sms_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates" ON sms_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON sms_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON sms_templates
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 7. FUNCTIONS
-- ========================================

-- Function to enable a service for a user
CREATE OR REPLACE FUNCTION enable_service(
  p_user_id UUID,
  p_service_key TEXT,
  p_config JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_service_id UUID;
  v_requires_services TEXT[];
  v_user_service_id UUID;
BEGIN
  -- Get service details
  SELECT id, requires_services INTO v_service_id, v_requires_services
  FROM services
  WHERE service_key = p_service_key AND is_available = true;

  IF v_service_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found or not available');
  END IF;

  -- Check if required services are enabled
  IF v_requires_services IS NOT NULL AND array_length(v_requires_services, 1) > 0 THEN
    PERFORM 1
    FROM user_services us
    JOIN services s ON us.service_id = s.id
    WHERE us.user_id = p_user_id
      AND us.enabled = true
      AND s.service_key = ANY(v_requires_services);

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Required services not enabled',
        'requires', v_requires_services
      );
    END IF;
  END IF;

  -- Enable or update service
  INSERT INTO user_services (user_id, service_id, enabled, enabled_at, config)
  VALUES (p_user_id, v_service_id, true, NOW(), p_config)
  ON CONFLICT (user_id, service_id)
  DO UPDATE SET
    enabled = true,
    enabled_at = NOW(),
    config = p_config,
    updated_at = NOW()
  RETURNING id INTO v_user_service_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_service_id', v_user_service_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to disable a service
CREATE OR REPLACE FUNCTION disable_service(
  p_user_id UUID,
  p_service_key TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_service_id UUID;
BEGIN
  -- Get service ID
  SELECT id INTO v_service_id
  FROM services
  WHERE service_key = p_service_key;

  IF v_service_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- Disable service
  UPDATE user_services
  SET enabled = false,
      disabled_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id AND service_id = v_service_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Function to log service usage
CREATE OR REPLACE FUNCTION log_service_usage(
  p_user_id UUID,
  p_service_key TEXT,
  p_usage_type TEXT,
  p_quantity INTEGER DEFAULT 1,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_service_id UUID;
  v_user_service_id UUID;
  v_cost DECIMAL(10, 4);
  v_usage_price_model JSONB;
BEGIN
  -- Get service details
  SELECT s.id, s.usage_price_model, us.id
  INTO v_service_id, v_usage_price_model, v_user_service_id
  FROM services s
  JOIN user_services us ON us.service_id = s.id
  WHERE s.service_key = p_service_key
    AND us.user_id = p_user_id
    AND us.enabled = true;

  IF v_service_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not enabled');
  END IF;

  -- Calculate cost based on usage model
  IF v_usage_price_model IS NOT NULL THEN
    v_cost := (v_usage_price_model->>'price')::DECIMAL * p_quantity;
  ELSE
    v_cost := 0;
  END IF;

  -- Log usage
  INSERT INTO service_usage_logs (user_service_id, user_id, service_id, usage_type, quantity, cost_usd, metadata)
  VALUES (v_user_service_id, p_user_id, v_service_id, p_usage_type, p_quantity, v_cost, p_metadata);

  -- Update last used timestamp and count
  UPDATE user_services
  SET last_used_at = NOW(),
      usage_count = usage_count + p_quantity,
      updated_at = NOW()
  WHERE id = v_user_service_id;

  RETURN jsonb_build_object('success', true, 'cost', v_cost);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. SEED DATA - Initial Services
-- ========================================

INSERT INTO services (service_key, name, description, category, tier, icon, usage_based, usage_price_model, requires_services, config_schema, default_config) VALUES

-- Service 1: AI Voice Receptionist
('voice_receptionist', 'AI Voice Receptionist', 'AI-powered voice agent that answers calls 24/7, books appointments, and handles customer inquiries.', 'core', 'standard', 'Phone', true,
  '{"type": "per_minute", "price": 2.00}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"voice_model": {"type": "string", "enum": ["Ara", "Eve", "Leo"]}, "system_prompt": {"type": "string"}}}'::jsonb,
  '{"voice_model": "Ara", "system_prompt": "You are a helpful voice assistant."}'::jsonb
),

-- Service 2: SMS Autoresponder (Standalone)
('sms_autoresponder_standalone', 'SMS Autoresponder (Standalone)', 'Automatically respond to incoming text messages with AI or custom templates. Full price standalone service.', 'communication', 'standard', 'MessageSquare', true,
  '{"type": "per_sms", "price": 1.00}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"auto_reply": {"type": "boolean"}, "template_id": {"type": "string"}, "ai_powered": {"type": "boolean"}}}'::jsonb,
  '{"auto_reply": true, "ai_powered": false}'::jsonb
),

-- Service 3: SMS Autoresponder (Bundled with Voice Receptionist) - REQUIRES voice_receptionist
('sms_autoresponder_bundled', 'SMS Autoresponder (Add-on)', 'Automatically respond to incoming text messages. Discounted 50% rate when bundled with AI Voice Receptionist.', 'communication', 'standard', 'MessageSquare', true,
  '{"type": "per_sms", "price": 0.50}'::jsonb,
  ARRAY['voice_receptionist'],
  '{"type": "object", "properties": {"auto_reply": {"type": "boolean"}, "template_id": {"type": "string"}, "ai_powered": {"type": "boolean"}}}'::jsonb,
  '{"auto_reply": true, "ai_powered": false}'::jsonb
),

-- Service 4: Missed Call Responder
('missed_call_responder', 'Missed Call Responder', 'Automatically send SMS to callers when their call goes unanswered.', 'communication', 'standard', 'PhoneMissed', true,
  '{"type": "per_call", "price": 1.50}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"enabled_hours": {"type": "string"}, "template_id": {"type": "string"}, "delay_seconds": {"type": "number"}}}'::jsonb,
  '{"enabled_hours": "24/7", "delay_seconds": 30}'::jsonb
);

-- ========================================
-- 9. TRIGGERS
-- ========================================

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_services_updated_at BEFORE UPDATE ON user_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 10. COMMENTS
-- ========================================

COMMENT ON TABLE services IS 'Master registry of all available services on the platform';
COMMENT ON TABLE user_services IS 'Tracks which services each user has enabled and their configuration';
COMMENT ON TABLE service_usage_logs IS 'Logs service usage for billing and analytics';
COMMENT ON TABLE sms_messages IS 'All SMS messages sent and received by the platform';
COMMENT ON TABLE sms_templates IS 'User-defined SMS message templates';
COMMENT ON FUNCTION enable_service IS 'Enable a service for a user with optional configuration';
COMMENT ON FUNCTION disable_service IS 'Disable a service for a user';
COMMENT ON FUNCTION log_service_usage IS 'Log usage of a service for billing purposes';
