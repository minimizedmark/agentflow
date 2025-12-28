# Agent12 - AI Voice Agent Platform

## Build Your Stack. Pay for What You Use. Nothing More.

**We don't believe in gouging small businesses with forced bundles and features you'll never use.**

Agent12 is a modular platform built FOR small businesses, BY people who understand your needs. Pick the services that help YOUR business. Leave the rest. Add more when you're ready.

**No contracts. No monthly minimums. No features you don't need.**

Just honest, transparent automation that saves you money and helps you grow.

## How It Works (Ridiculously Simple)

**1. Pick** - Click a service. Read what it does in plain English.
**2. Enable** - Flip the switch. It works immediately.
**3. Done** - See your usage and costs in real-time.

**No complicated setup. No technical jargon. No 45-minute onboarding calls.**

Services come with smart defaults. They just work. Advanced settings are there if you want them, hidden if you don't.

Your grandma could set this up. (But she probably doesn't need an AI receptionist.)

### Real Examples

**🦷 Dental Office** might use:
- AI Voice Receptionist with Industry Templates ($2.75/min)
- Missed Call Responder ($1.50/call)
- **Monthly cost**: ~$200-300 for 100 minutes of calls

**🍕 Pizza Restaurant** might only need:
- SMS Autoresponder Standalone ($1/message)
- **Monthly cost**: ~$50-100 for 50-100 messages

**🏠 Real Estate Agent** builds full stack:
- AI Voice Receptionist ($2/min)
- SMS Autoresponder Bundled ($0.50/message - 50% off!)
- Email Assistant Bundled ($0.25/email - 50% off!)
- **Saves 50%** on SMS and Email by bundling

**No two businesses pay the same. Because no two businesses are the same.**

---

## Core Services

Agent12 offers 5 core services. Pick what you need:

### Service 1: AI Voice Receptionist ✅
- **Description**: AI-powered voice agent that answers calls 24/7, books appointments, and handles customer inquiries
- **Pricing**:
  - Base: $2.00 per minute
  - With Industry Templates: $2.75 per minute
- **Value Proposition**:
  - 💰 Hiring a receptionist costs ~$25/hour ($15-20/hr wage + taxes/benefits)
  - ⏰ That receptionist works 8 hours/day, 5 days/week
  - 🤖 Our AI works 24/7/365 - never calls in sick, takes vacation, or needs breaks
  - 📊 At $2/min, even 30 minutes of calls per day ($60/day) is cheaper than a part-time employee
  - 🎯 **Never miss a customer call again** - every missed call is a lost opportunity
- **Features**:
  - 🤖 Intelligent conversations powered by Grok AI
  - 📞 Twilio phone integration
  - 📅 Automatic appointment booking
  - 🏢 Industry-specific templates (dental, HVAC, restaurants, salons, etc.)
  - 📊 Call analytics and transcripts

### Service 2: SMS Autoresponder (Standalone) ✅
- **Description**: Automatically respond to incoming text messages with AI or custom templates
- **Pricing**: $1.00 per response
- **Value Proposition**:
  - 👀 Someone has to monitor incoming messages constantly
  - ✍️ Someone has to draft and send responses
  - ⏱️ Average response time: 15-30 minutes (or hours after business hours)
  - 💵 At $1/response, you're paying pennies for instant engagement
  - 🎯 **Instant customer satisfaction** - no more "sorry for the delay" messages
- **Features**:
  - 💬 Instant auto-replies (seconds, not minutes)
  - 🤖 AI-powered intelligent responses
  - 📝 Custom message templates
  - ⏰ Works 24/7, even when you're closed
  - 📱 Full SMS conversation tracking

### Service 3: SMS Autoresponder (Add-on) ✅
- **Description**: Same SMS autoresponder functionality, discounted when bundled with AI Voice Receptionist
- **Pricing**: $0.50 per response (50% discount)
- **Requirement**: Must have AI Voice Receptionist service enabled
- **Value Proposition**:
  - 🎁 **50% discount** when you bundle with Voice Receptionist
  - 🔗 Seamless integration with your voice service
  - 📞 Text customers who called + respond to direct texts
  - 💰 Complete communication solution at the best price
  - 🎯 **Bundle and save** - perfect for businesses using both channels
- **Features**:
  - Same features as standalone SMS Autoresponder
  - Integrated with call logs and voice service
  - Unified customer communication tracking

### Service 4: Missed Call Responder ✅
- **Description**: Automatically send SMS to callers when their call goes unanswered
- **Pricing**: $1.50 per call
- **Value Proposition**:
  - 🏃 Customer calls you, doesn't reach you, calls your competitor next
  - 💔 Losing ONE customer to a competitor costs you hundreds or thousands in lifetime value
  - 📞 Most businesses convert 20-30% of callbacks into customers
  - 💰 If your average customer is worth $200+, paying $1.50 to keep them is a no-brainer
  - 🎯 **Never lose another customer to a competitor**
- **Features**:
  - 📞 Automatic missed call detection
  - 💬 Instant SMS follow-up
  - ⏱️ Configurable delay (send immediately or wait 30 seconds)
  - 📝 Custom message templates
  - 🔗 Full call tracking and analytics

## Key Features

- 🔧 **Modular Architecture**: Enable only the services you need
- 💰 **Pay-per-Use**: No fixed costs, pay only for what you use
- 💳 **Prepaid Wallet**: Add funds and track spending in real-time
- 📊 **Analytics**: Track usage across all services
- 🔐 **Secure**: Built with Supabase Auth and Row Level Security
- 🎯 **Easy Setup**: Toggle services on/off with one click

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, WebSocket
- **Database**: Supabase (PostgreSQL)
- **Voice AI**: Grok Voice API
- **Telephony**: Twilio
- **Payments**: Stripe (optional)

## Project Structure

```
agentflow/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   └── lib/          # Utility functions
│   └── package.json
├── websocket-server/     # WebSocket server for voice calls
│   ├── src/
│   │   ├── services/    # Business logic services
│   │   └── utils/       # Utility functions
│   └── package.json
├── shared/              # Shared types and utilities
│   └── src/
│       └── types.ts     # Shared TypeScript types
├── database/            # Database migrations
│   └── migrations/
└── package.json         # Root package.json (workspace)
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Twilio account with phone number
- Grok API access (for AI voice)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd agentflow
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   # Copy example env files
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   cp websocket-server/.env.example websocket-server/.env

   # Edit each file with your actual credentials
   ```

4. Set up the database:
   ```bash
   # Run migrations in Supabase SQL Editor
   # See database/README.md for instructions
   ```

5. Start the development servers:
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend on http://localhost:3000
   - WebSocket server on http://localhost:8080

## Configuration

### Frontend Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### WebSocket Server Environment Variables

Create `websocket-server/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
GROK_API_KEY=your_grok_api_key
WEBSOCKET_SERVER_PORT=8080
BASE_URL=https://your-domain.com
```

## Database Setup

1. Create a new Supabase project
2. Run the migration file in the SQL Editor:
   - Copy contents from `database/migrations/001_initial_schema.sql`
   - Paste into Supabase SQL Editor
   - Execute

See `database/README.md` for detailed instructions.

## Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel
```

### WebSocket Server (Railway/Render/DigitalOcean)

```bash
cd websocket-server
npm run build
npm start
```

## Twilio Configuration

### Phone Numbers
1. Purchase a Twilio phone number with Voice and SMS capabilities
2. Configure webhooks for each service:

### Voice Webhooks (Service 1: AI Voice Receptionist)
- Voice URL: `https://your-server.com/api/voice/incoming`
- Status Callback: `https://your-server.com/api/voice/status`
- Method: POST

### SMS Webhooks (Service 2 & 3: SMS Services)
- SMS URL: `https://your-server.com/api/sms/incoming`
- Method: POST

All three services use the same Twilio phone number and are handled based on the type of incoming request (voice vs SMS).

## Usage

1. **Sign up** at `/signup`
2. **Add funds** to your prepaid wallet
3. **Enable services** you need in `/dashboard/services`
4. **Configure each service**:
   - AI Voice Receptionist: Create agent, set voice model and prompt
   - SMS Autoresponder: Create templates, enable AI responses
   - Missed Call Responder: Set delay time and message template
5. **Get your phone number** and configure Twilio webhooks
6. **Start serving customers** automatically!

## Pricing

Agent12 uses **value-based pricing** - you pay based on the value you receive, not our costs.

Our prices reflect what it's worth to never miss a customer, respond instantly to messages, and provide 24/7 service without hiring staff.

**Pay-per-use model** - no monthly fees, no contracts, only pay for what you use:

### Service Pricing
- **Service 1 - AI Voice Receptionist**:
  - Base: $2.00 per minute
  - With Industry Templates: $2.75 per minute (+$0.75/min add-on)
- **Service 2 - SMS Autoresponder (Standalone)**: $1.00 per response
- **Service 3 - SMS Autoresponder (Add-on)**: $0.50 per response
  - Requires AI Voice Receptionist service
  - 50% discount when bundled
- **Service 4 - Missed Call Responder**: $1.50 per missed call

**Industry Templates Available For:**
- Dental Offices
- HVAC Companies
- Restaurants
- Hair Salons & Spas
- Law Firms
- Real Estate Agencies
- Medical Practices
- And more...

### Prepaid Wallet
- Add funds to your wallet via Stripe
- Usage is automatically deducted as you use services
- Track spending in real-time from the dashboard
- Never worry about surprise bills

## Adding New Services

The Agent12 platform is built with an **extensible service architecture**. Adding new services is simple and requires no changes to core infrastructure.

### How to Add a New Service

1. **Define the service in the database:**
```sql
INSERT INTO services (service_key, name, description, category, tier, icon, usage_based, usage_price_model, requires_services, config_schema, default_config)
VALUES (
  'your_service_key',
  'Your Service Name',
  'Service description',
  'communication', -- or 'core', 'intelligence', 'automation', 'integration', 'enterprise'
  'standard',
  'IconName', -- Lucide icon name
  true,
  '{"type": "per_usage", "price": 1.00}'::jsonb,
  ARRAY['required_service_key'], -- or NULL if no dependencies
  '{"type": "object", "properties": {...}}'::jsonb,
  '{"default_setting": "value"}'::jsonb
);
```

2. **Implement the service logic** (if needed):
   - Add handler in `websocket-server/src/services/`
   - Wire up webhook endpoints in `index.ts`
   - Use `log_service_usage()` for billing

3. **Users can now enable it** from the dashboard!

### Example Future Services

Ideas for services that could be added:
- **Appointment Reminders** ($0.25/reminder)
- **Call Recording & Transcription** ($0.50/call)
- **Sentiment Analysis** ($0.10/call)
- **Multi-language Support** ($1.00/min add-on)
- **CRM Integration** ($25/month)
- **Analytics Dashboard** ($15/month)
- **Voicemail to Email** ($0.10/voicemail)
- **Custom Workflows** ($50/month)

The architecture supports:
- ✅ Usage-based pricing (per call, per minute, per SMS, etc.)
- ✅ Monthly subscriptions
- ✅ Add-ons and upgrades
- ✅ Service dependencies
- ✅ Service conflicts
- ✅ Custom configuration schemas
- ✅ Automatic billing integration

## Development

### Build all packages:
```bash
npm run build
```

### Run tests:
```bash
npm test
```

### Lint:
```bash
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For support, email support@agent12.com or join our Discord community.
