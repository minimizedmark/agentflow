# Service Architecture Guide

## Overview

Agent12 uses a **modular service architecture** where services are independent, toggleable features that users can enable/disable based on their needs. This architecture is designed to be **infinitely extensible** - you can add new services without modifying core infrastructure.

## Core Principles

1. **Service Independence**: Each service operates independently
2. **Pay-per-Use**: Users only pay for services they enable and use
3. **Dynamic Configuration**: Services have flexible configuration schemas
4. **Dependency Management**: Services can require other services
5. **Automatic Billing**: Usage is tracked and billed automatically
6. **Value-Based Pricing**: Price reflects customer value, not cost

## Database Schema

### Services Table

The master registry of all available services:

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  service_key TEXT UNIQUE NOT NULL,        -- Unique identifier
  name TEXT NOT NULL,                       -- Display name
  description TEXT,                         -- User-facing description
  category TEXT NOT NULL,                   -- Service category
  tier TEXT DEFAULT 'standard',             -- Pricing tier
  base_price_usd DECIMAL(10, 2),           -- Monthly base fee (if any)
  usage_based BOOLEAN DEFAULT false,        -- Is usage-based?
  usage_price_model JSONB,                  -- Pricing structure
  requires_services TEXT[],                 -- Dependencies
  conflicts_with TEXT[],                    -- Mutual exclusions
  config_schema JSONB,                      -- Configuration schema
  default_config JSONB,                     -- Default settings
  is_available BOOLEAN DEFAULT true,        -- Publicly available?
  is_beta BOOLEAN DEFAULT false             -- Beta flag
);
```

### User Services Table

Tracks which services users have enabled:

```sql
CREATE TABLE user_services (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  service_id UUID NOT NULL,
  enabled BOOLEAN DEFAULT false,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',                -- User's custom config
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  UNIQUE(user_id, service_id)
);
```

### Service Usage Logs

Tracks usage for billing:

```sql
CREATE TABLE service_usage_logs (
  id UUID PRIMARY KEY,
  user_service_id UUID NOT NULL,
  user_id UUID NOT NULL,
  service_id UUID NOT NULL,
  usage_type TEXT NOT NULL,                 -- 'call', 'sms', 'minute', etc.
  quantity INTEGER DEFAULT 1,
  cost_usd DECIMAL(10, 4),                  -- Calculated cost
  metadata JSONB,                           -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Service Categories

- **core**: Essential platform services (e.g., AI Voice Receptionist)
- **communication**: Communication services (e.g., SMS, Email)
- **intelligence**: Analytics and AI features
- **automation**: Workflow automation
- **integration**: Third-party integrations
- **enterprise**: Enterprise-only features

## Pricing Models

Services support flexible pricing:

```jsonb
// Usage-based pricing
{
  "type": "per_minute",  // or per_call, per_sms, per_email, etc.
  "price": 2.00
}

// Tiered pricing (future)
{
  "type": "tiered",
  "tiers": [
    {"from": 0, "to": 100, "price": 2.00},
    {"from": 101, "to": 500, "price": 1.50}
  ]
}

// Monthly subscription (future)
{
  "type": "monthly",
  "price": 25.00
}
```

## Adding a New Service

### Step 1: Define the Service

```sql
INSERT INTO services (
  service_key,
  name,
  description,
  category,
  tier,
  icon,
  usage_based,
  usage_price_model,
  requires_services,
  config_schema,
  default_config
) VALUES (
  'call_recording',
  'Call Recording & Transcription',
  'Record all calls and get AI-powered transcripts',
  'intelligence',
  'premium',
  'Mic',
  true,
  '{"type": "per_call", "price": 0.50}'::jsonb,
  ARRAY['voice_receptionist'],  -- Requires voice service
  '{
    "type": "object",
    "properties": {
      "auto_record": {"type": "boolean"},
      "transcribe": {"type": "boolean"},
      "retention_days": {"type": "number"}
    }
  }'::jsonb,
  '{
    "auto_record": true,
    "transcribe": true,
    "retention_days": 30
  }'::jsonb
);
```

### Step 2: Implement Service Logic

Create `websocket-server/src/services/call-recording.ts`:

```typescript
export class CallRecordingService {
  async recordCall(callId: string, userId: string) {
    // Check if user has service enabled
    const { data: userService } = await supabase
      .from('user_services')
      .select('config, services(usage_price_model)')
      .eq('user_id', userId)
      .eq('services.service_key', 'call_recording')
      .eq('enabled', true)
      .single();

    if (!userService) return;

    // Start recording...

    // Log usage
    await supabase.rpc('log_service_usage', {
      p_user_id: userId,
      p_service_key: 'call_recording',
      p_usage_type: 'call',
      p_quantity: 1,
      p_metadata: { call_id: callId }
    });
  }
}
```

### Step 3: Wire Up Endpoints (if needed)

```typescript
// In websocket-server/src/index.ts
app.post('/api/recording/start', async (req, res) => {
  const recordingService = new CallRecordingService();
  await recordingService.recordCall(req.body.callId, req.body.userId);
  res.json({ success: true });
});
```

### Step 4: Done!

Users can now:
1. See the service in their dashboard
2. Enable it with one click
3. Configure settings
4. Get billed automatically

## Service Dependencies

Use `requires_services` to enforce dependencies:

```sql
-- Bundled SMS requires voice receptionist
requires_services = ARRAY['voice_receptionist']
```

The `enable_service()` function automatically checks dependencies before enabling.

## Service Conflicts

Use `conflicts_with` for mutually exclusive services:

```sql
-- Can't have both standalone and bundled SMS
conflicts_with = ARRAY['sms_autoresponder_standalone']
```

## Configuration Schemas

Use JSON Schema for flexible, validated configuration:

```jsonb
{
  "type": "object",
  "properties": {
    "setting_name": {
      "type": "string",
      "enum": ["option1", "option2"],
      "description": "User-facing description"
    },
    "numeric_setting": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    }
  },
  "required": ["setting_name"]
}
```

## Example: Current Services

### Service 1: AI Voice Receptionist
```sql
service_key: 'voice_receptionist'
pricing: {"type": "per_minute", "price": 2.00}
requires_services: NULL
category: 'core'
```

### Service 2: SMS Autoresponder (Standalone)
```sql
service_key: 'sms_autoresponder_standalone'
pricing: {"type": "per_sms", "price": 1.00}
requires_services: NULL
category: 'communication'
```

### Service 3: SMS Autoresponder (Bundled)
```sql
service_key: 'sms_autoresponder_bundled'
pricing: {"type": "per_sms", "price": 0.50}
requires_services: ['voice_receptionist']
category: 'communication'
```

### Service 4: Missed Call Responder
```sql
service_key: 'missed_call_responder'
pricing: {"type": "per_call", "price": 1.50}
requires_services: NULL
category: 'communication'
```

## Best Practices

1. **Service Keys**: Use descriptive, snake_case keys (e.g., `call_recording`)
2. **Naming**: Clear, user-facing names
3. **Pricing**: Think value, not cost
4. **Dependencies**: Only use when truly required
5. **Configuration**: Keep it simple - users don't want complexity
6. **Testing**: Test enable/disable flows
7. **Billing**: Always log usage with metadata

## Future Expansion Ideas

- **Appointment Reminders**: Automated reminder calls/SMS
- **Call Analytics**: Sentiment analysis, keyword tracking
- **Multi-language**: Support for multiple languages
- **Voicemail**: Voicemail to email/SMS
- **CRM Integration**: Sync with Salesforce, HubSpot, etc.
- **Team Features**: Multi-user accounts, permissions
- **White Label**: Reseller program
- **API Access**: Developer API for custom integrations

The architecture supports all of these without core changes!
