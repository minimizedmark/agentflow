# Database Migrations

This directory contains SQL migration files for the Agent12 platform.

## Running Migrations

### Using Supabase CLI

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link to your Supabase project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```

3. Run the migrations:
   ```bash
   supabase db push
   ```

### Manual Migration

You can also run the SQL files directly in the Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `001_initial_schema.sql`
4. Execute the query

## Schema Overview

### Tables

- **users**: User accounts and profile information
- **agents**: AI voice agent configurations
- **calls**: Call logs and metadata
- **billing_cycles**: Monthly billing information
- **tool_integrations**: External tool integrations (Calendar, webhooks, etc.)

### Security

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Environment Variables

Make sure to set these environment variables in your `.env` files:

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### WebSocket Server (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
GROK_API_KEY=your_grok_api_key
GROK_VOICE_API_URL=wss://api.x.ai/v1/voice
WEBSOCKET_SERVER_PORT=8080
BASE_URL=https://your-domain.com
```
