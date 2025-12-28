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
),

-- Service 5: Appointment Reminders
('appointment_reminders', 'Appointment Reminders', 'Automatically send reminder calls or SMS before scheduled appointments.', 'automation', 'standard', 'Calendar', true,
  '{"type": "per_reminder", "price": 0.25}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"reminder_type": {"type": "string", "enum": ["sms", "call", "both"]}, "hours_before": {"type": "array", "items": {"type": "number"}}, "message_template": {"type": "string"}}}'::jsonb,
  '{"reminder_type": "sms", "hours_before": [24, 2], "message_template": "Reminder: You have an appointment at {{time}} on {{date}}."}'::jsonb
),

-- Service 6: Call Recording & Transcription
('call_recording', 'Call Recording & Transcription', 'Record all calls and get AI-powered transcripts with keyword tagging.', 'intelligence', 'premium', 'Mic', true,
  '{"type": "per_call", "price": 0.50}'::jsonb,
  ARRAY['voice_receptionist'],
  '{"type": "object", "properties": {"auto_record": {"type": "boolean"}, "transcribe": {"type": "boolean"}, "retention_days": {"type": "number"}, "keyword_alerts": {"type": "array", "items": {"type": "string"}}}}'::jsonb,
  '{"auto_record": true, "transcribe": true, "retention_days": 30, "keyword_alerts": []}'::jsonb
),

-- Service 7: Voicemail to Email/SMS
('voicemail_forwarding', 'Voicemail to Email/SMS', 'Forward voicemails to email with transcription or send as SMS.', 'communication', 'standard', 'Voicemail', true,
  '{"type": "per_voicemail", "price": 0.10}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"forward_to_email": {"type": "boolean"}, "email_addresses": {"type": "array", "items": {"type": "string"}}, "forward_to_sms": {"type": "boolean"}, "sms_number": {"type": "string"}, "include_transcription": {"type": "boolean"}}}'::jsonb,
  '{"forward_to_email": true, "email_addresses": [], "forward_to_sms": false, "sms_number": "", "include_transcription": true}'::jsonb
),

-- Service 8: Sentiment Analysis
('sentiment_analysis', 'Sentiment Analysis', 'AI-powered analysis of customer sentiment during calls. Get alerts for negative interactions.', 'intelligence', 'premium', 'Brain', true,
  '{"type": "per_call", "price": 0.10}'::jsonb,
  ARRAY['voice_receptionist'],
  '{"type": "object", "properties": {"alert_on_negative": {"type": "boolean"}, "alert_threshold": {"type": "number"}, "email_alerts": {"type": "boolean"}}}'::jsonb,
  '{"alert_on_negative": true, "alert_threshold": -0.5, "email_alerts": true}'::jsonb
),

-- Service 9: Multi-language Support
('multi_language', 'Multi-language Support', 'Enable your AI receptionist to speak multiple languages fluently.', 'core', 'premium', 'Languages', true,
  '{"type": "per_minute", "price": 1.00}'::jsonb,
  ARRAY['voice_receptionist'],
  '{"type": "object", "properties": {"enabled_languages": {"type": "array", "items": {"type": "string", "enum": ["es", "fr", "de", "it", "pt", "zh", "ja", "ko"]}}, "auto_detect": {"type": "boolean"}}}'::jsonb,
  '{"enabled_languages": ["es"], "auto_detect": true}'::jsonb
),

-- Service 10: Analytics Dashboard
('analytics_dashboard', 'Analytics Dashboard Pro', 'Advanced analytics with custom reports, data exports, and insights.', 'intelligence', 'premium', 'BarChart', false,
  '{"type": "monthly", "price": 15.00}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"export_format": {"type": "string", "enum": ["csv", "json", "pdf"]}, "report_frequency": {"type": "string", "enum": ["daily", "weekly", "monthly"]}, "custom_metrics": {"type": "array", "items": {"type": "string"}}}}'::jsonb,
  '{"export_format": "csv", "report_frequency": "weekly", "custom_metrics": []}'::jsonb
),

-- Service 11: CRM Integration
('crm_integration', 'CRM Integration', 'Sync calls, messages, and customer data with Salesforce, HubSpot, or other CRMs.', 'integration', 'enterprise', 'Database', false,
  '{"type": "monthly", "price": 25.00}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"crm_provider": {"type": "string", "enum": ["salesforce", "hubspot", "pipedrive", "zoho"]}, "sync_frequency": {"type": "string", "enum": ["realtime", "hourly", "daily"]}, "sync_fields": {"type": "array", "items": {"type": "string"}}}}'::jsonb,
  '{"crm_provider": "salesforce", "sync_frequency": "realtime", "sync_fields": ["name", "phone", "email"]}'::jsonb
),

-- Service 12: Business Hours Routing
('business_hours_routing', 'Business Hours Routing', 'Route calls differently based on business hours, holidays, and custom schedules.', 'automation', 'standard', 'Clock', true,
  '{"type": "per_call", "price": 0.05}'::jsonb,
  ARRAY['voice_receptionist'],
  '{"type": "object", "properties": {"business_hours": {"type": "object"}, "holiday_schedule": {"type": "array"}, "after_hours_action": {"type": "string", "enum": ["voicemail", "forward", "custom_message"]}, "forward_number": {"type": "string"}}}'::jsonb,
  '{"business_hours": {"mon-fri": "9am-5pm"}, "holiday_schedule": [], "after_hours_action": "voicemail", "forward_number": ""}'::jsonb
),

-- Service 13: Email Assistant (Standalone)
('email_assistant_standalone', 'Email Assistant (Standalone)', 'AI-powered email management: auto-sort incoming emails, draft intelligent responses, and auto-reply or send drafts for approval.', 'communication', 'standard', 'Mail', true,
  '{"type": "per_email", "price": 0.50}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"auto_sort": {"type": "boolean"}, "categories": {"type": "array", "items": {"type": "string"}}, "auto_draft": {"type": "boolean"}, "auto_send": {"type": "boolean"}, "require_approval": {"type": "boolean"}, "ai_powered": {"type": "boolean"}, "template_id": {"type": "string"}, "forward_to": {"type": "array", "items": {"type": "string"}}}}'::jsonb,
  '{"auto_sort": true, "categories": ["sales", "support", "urgent", "spam"], "auto_draft": true, "auto_send": false, "require_approval": true, "ai_powered": true, "template_id": "", "forward_to": []}'::jsonb
),

-- Service 14: Email Assistant (Bundled)
('email_assistant_bundled', 'Email Assistant (Add-on)', 'Complete email management at 50% discount when bundled with AI Voice Receptionist. Sort, draft, and respond automatically.', 'communication', 'standard', 'Mail', true,
  '{"type": "per_email", "price": 0.25}'::jsonb,
  ARRAY['voice_receptionist'],
  '{"type": "object", "properties": {"auto_sort": {"type": "boolean"}, "categories": {"type": "array", "items": {"type": "string"}}, "auto_draft": {"type": "boolean"}, "auto_send": {"type": "boolean"}, "require_approval": {"type": "boolean"}, "ai_powered": {"type": "boolean"}, "template_id": {"type": "string"}, "forward_to": {"type": "array", "items": {"type": "string"}}}}'::jsonb,
  '{"auto_sort": true, "categories": ["sales", "support", "urgent", "spam"], "auto_draft": true, "auto_send": false, "require_approval": true, "ai_powered": true, "template_id": "", "forward_to": []}'::jsonb
),

-- Service 15: Email Multi-Language Support
('email_multilanguage', 'Email Multi-Language Support', 'Read and respond to emails in Spanish, French, German, Chinese, and more. Just $0.10/email extra.', 'communication', 'standard', 'Languages', true,
  '{"type": "per_email", "price": 0.10}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"enabled_languages": {"type": "array", "items": {"type": "string", "enum": ["es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi"]}}, "auto_detect": {"type": "boolean"}, "auto_translate": {"type": "boolean"}}}'::jsonb,
  '{"enabled_languages": ["es", "fr"], "auto_detect": true, "auto_translate": true}'::jsonb
),

-- Service 16: Auto-Invoicing & Payment Reminders (QuickBooks)
('auto_invoicing_quickbooks', 'Auto-Invoicing & Payment Reminders', 'Automatically create invoices in QuickBooks after appointments. Auto-send payment reminders for overdue invoices. Get paid faster.', 'automation', 'standard', 'FileText', true,
  '{"type": "per_invoice", "price": 1.50}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"auto_create_invoice": {"type": "boolean"}, "auto_send_invoice": {"type": "boolean"}, "payment_terms": {"type": "string", "enum": ["net15", "net30", "net60", "due_on_receipt"]}, "auto_reminders": {"type": "boolean"}, "reminder_schedule": {"type": "array", "items": {"type": "number"}}, "include_appointment_notes": {"type": "boolean"}}}'::jsonb,
  '{"auto_create_invoice": true, "auto_send_invoice": false, "payment_terms": "net30", "auto_reminders": true, "reminder_schedule": [7, 14, 30], "include_appointment_notes": true}'::jsonb
),

-- Service 17: Restaurant Order Taking (Standalone)
('restaurant_order_taking_standalone', 'Restaurant Order Taking (Standalone)', 'AI voice agent that answers phone calls and takes food orders perfectly. Integrates with your POS system. Never miss an order during rush hours.', 'industry', 'standard', 'UtensilsCrossed', true,
  '{"type": "per_order", "price": 1.50}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"pos_integration": {"type": "string", "enum": ["square", "toast", "clover", "lightspeed", "none"]}, "menu_url": {"type": "string"}, "upsell_enabled": {"type": "boolean"}, "modify_enabled": {"type": "boolean"}, "special_requests": {"type": "boolean"}, "payment_by_phone": {"type": "boolean"}, "auto_confirm_order": {"type": "boolean"}, "send_confirmation_sms": {"type": "boolean"}}}'::jsonb,
  '{"pos_integration": "none", "menu_url": "", "upsell_enabled": true, "modify_enabled": true, "special_requests": true, "payment_by_phone": false, "auto_confirm_order": false, "send_confirmation_sms": true}'::jsonb
),

-- Service 18: Restaurant Order Taking (Bundled with Voice Receptionist)
('restaurant_order_taking_bundled', 'Restaurant Order Taking (Add-on)', 'AI phone order taking at 33% discount when bundled with AI Voice Receptionist. Perfect order accuracy, upselling, and POS integration.', 'industry', 'standard', 'UtensilsCrossed', true,
  '{"type": "per_order", "price": 1.00}'::jsonb,
  ARRAY['voice_receptionist'],
  '{"type": "object", "properties": {"pos_integration": {"type": "string", "enum": ["square", "toast", "clover", "lightspeed", "none"]}, "menu_url": {"type": "string"}, "upsell_enabled": {"type": "boolean"}, "modify_enabled": {"type": "boolean"}, "special_requests": {"type": "boolean"}, "payment_by_phone": {"type": "boolean"}, "auto_confirm_order": {"type": "boolean"}, "send_confirmation_sms": {"type": "boolean"}}}'::jsonb,
  '{"pos_integration": "none", "menu_url": "", "upsell_enabled": true, "modify_enabled": true, "special_requests": true, "payment_by_phone": false, "auto_confirm_order": false, "send_confirmation_sms": true}'::jsonb
),

-- Service 19: Embeddable Booking/Order Widget
('embeddable_widget', 'Embeddable Booking Widget', 'Add a booking/ordering widget to your existing website. Works with any site - WordPress, Squarespace, Wix, custom sites. One line of code. Mobile-optimized.', 'web', 'standard', 'Code', true,
  '{"type": "per_booking", "price": 0.25}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"widget_type": {"type": "string", "enum": ["booking", "ordering", "contact", "quote_request"]}, "custom_css": {"type": "boolean"}, "branding": {"type": "boolean"}, "fields": {"type": "array", "items": {"type": "string"}}, "auto_confirm": {"type": "boolean"}, "payment_enabled": {"type": "boolean"}, "calendar_sync": {"type": "boolean"}, "notification_email": {"type": "string"}}}'::jsonb,
  '{"widget_type": "booking", "custom_css": true, "branding": false, "fields": ["name", "email", "phone", "service", "date", "time"], "auto_confirm": false, "payment_enabled": false, "calendar_sync": true, "notification_email": ""}'::jsonb
),

-- Service 20: Auto-Website Builder & Hosting
('auto_website', 'AI-Built Website & Hosting', 'AI generates a professional website for your business in minutes. SEO-optimized, mobile-responsive, integrated with all your AgentFlow services. Hosting included.', 'web', 'standard', 'Globe', false,
  '{"type": "monthly", "price": 25.00}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"template": {"type": "string", "enum": ["restaurant", "contractor", "medical", "retail", "professional_services", "custom"]}, "pages": {"type": "array", "items": {"type": "string"}}, "custom_domain": {"type": "boolean"}, "domain_name": {"type": "string"}, "seo_enabled": {"type": "boolean"}, "blog_enabled": {"type": "boolean"}, "online_booking": {"type": "boolean"}, "online_ordering": {"type": "boolean"}, "contact_form": {"type": "boolean"}, "live_chat": {"type": "boolean"}, "google_analytics": {"type": "boolean"}}}'::jsonb,
  '{"template": "professional_services", "pages": ["home", "about", "services", "contact"], "custom_domain": false, "domain_name": "", "seo_enabled": true, "blog_enabled": false, "online_booking": true, "online_ordering": false, "contact_form": true, "live_chat": false, "google_analytics": true}'::jsonb
),

-- Service 21: Website Management & Updates
('website_management', 'Website Management', 'We keep your website updated, backed up, and secure. Content updates, image changes, menu updates - just send us what you need changed.', 'web', 'standard', 'Settings', false,
  '{"type": "monthly", "price": 15.00}'::jsonb,
  ARRAY['auto_website'],
  '{"type": "object", "properties": {"update_requests_per_month": {"type": "number"}, "priority_support": {"type": "boolean"}, "content_refresh": {"type": "boolean"}, "image_optimization": {"type": "boolean"}, "backup_frequency": {"type": "string", "enum": ["daily", "weekly", "monthly"]}, "security_monitoring": {"type": "boolean"}}}'::jsonb,
  '{"update_requests_per_month": 5, "priority_support": false, "content_refresh": true, "image_optimization": true, "backup_frequency": "weekly", "security_monitoring": true}'::jsonb
),

-- Service 22: Review Management & Automation
('review_management', 'Review Management & Automation', 'Automatically request reviews from happy customers, monitor all review platforms (Google, Yelp, Facebook), and AI responds to reviews. Get more 5-star reviews, boost local SEO.', 'marketing', 'standard', 'Star', true,
  '{"type": "composite", "base_monthly": 20.00, "per_review_response": 0.50, "per_review_request": 0.25}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"auto_request_reviews": {"type": "boolean"}, "request_timing": {"type": "string", "enum": ["immediate", "1_day", "3_days", "1_week"]}, "platforms": {"type": "array", "items": {"type": "string", "enum": ["google", "yelp", "facebook", "tripadvisor", "healthgrades"]}}, "auto_respond": {"type": "boolean"}, "respond_to_positive": {"type": "boolean"}, "respond_to_negative": {"type": "boolean"}, "negative_alert_email": {"type": "string"}, "negative_alert_sms": {"type": "string"}, "response_tone": {"type": "string", "enum": ["professional", "friendly", "casual", "formal"]}}}'::jsonb,
  '{"auto_request_reviews": true, "request_timing": "3_days", "platforms": ["google", "yelp", "facebook"], "auto_respond": true, "respond_to_positive": true, "respond_to_negative": true, "negative_alert_email": "", "negative_alert_sms": "", "response_tone": "professional"}'::jsonb
),

-- Service 23: Text-to-Pay / Payment Links
('text_to_pay', 'Text-to-Pay & Payment Links', 'Send secure payment links via SMS or email. Customers pay with one click. Integrates with Stripe, Square, PayPal. Get paid faster - 80% reduction in accounts receivable.', 'payments', 'standard', 'CreditCard', true,
  '{"type": "per_payment_link", "price": 0.50}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"payment_processor": {"type": "string", "enum": ["stripe", "square", "paypal", "none"]}, "auto_send_after_service": {"type": "boolean"}, "payment_reminder_schedule": {"type": "array", "items": {"type": "number"}}, "include_tip_option": {"type": "boolean"}, "default_tip_percentages": {"type": "array", "items": {"type": "number"}}, "send_via": {"type": "string", "enum": ["sms", "email", "both"]}, "auto_update_invoice": {"type": "boolean"}}}'::jsonb,
  '{"payment_processor": "stripe", "auto_send_after_service": true, "payment_reminder_schedule": [1, 3, 7], "include_tip_option": false, "default_tip_percentages": [15, 18, 20], "send_via": "both", "auto_update_invoice": true}'::jsonb
),

-- Service 24: Lead Follow-up & Nurturing
('lead_nurturing', 'Lead Follow-up & Nurturing', 'Automated lead nurturing sequences via SMS and email. AI qualifies leads, scores them hot/warm/cold, and follows up at optimal times. 45% increase in conversion ROI.', 'sales', 'standard', 'Target', false,
  '{"type": "tiered", "base_monthly": 30.00, "included_leads": 100, "per_lead_overage": 0.30}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"auto_qualify": {"type": "boolean"}, "qualification_questions": {"type": "array", "items": {"type": "string"}}, "lead_scoring": {"type": "boolean"}, "hot_lead_threshold": {"type": "number"}, "nurture_sequences": {"type": "array", "items": {"type": "object"}}, "multi_channel": {"type": "boolean"}, "channels": {"type": "array", "items": {"type": "string", "enum": ["sms", "email", "call"]}}, "hot_lead_alert": {"type": "boolean"}}}'::jsonb,
  '{"auto_qualify": true, "qualification_questions": ["When are you looking to book?", "What service are you interested in?"], "lead_scoring": true, "hot_lead_threshold": 80, "nurture_sequences": [], "multi_channel": true, "channels": ["sms", "email"], "hot_lead_alert": true}'::jsonb
),

-- Service 25: Broadcast Communications (Marketing)
('broadcast_marketing', 'Broadcast Marketing (SMS & Email)', 'Send promotions, announcements, and campaigns to your customer list. Segment by service, last visit, or spend. A/B testing included. Max 4/month to prevent spam.', 'marketing', 'standard', 'Megaphone', true,
  '{"type": "composite", "per_sms": 0.10, "per_email": 0.02}'::jsonb,
  NULL,
  '{"type": "object", "properties": {"max_campaigns_per_month": {"type": "number"}, "segmentation_enabled": {"type": "boolean"}, "ab_testing": {"type": "boolean"}, "auto_opt_out": {"type": "boolean"}, "send_time_optimization": {"type": "boolean"}, "track_performance": {"type": "boolean"}, "compliance_monitoring": {"type": "boolean"}}}'::jsonb,
  '{"max_campaigns_per_month": 4, "segmentation_enabled": true, "ab_testing": true, "auto_opt_out": true, "send_time_optimization": true, "track_performance": true, "compliance_monitoring": true}'::jsonb
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
