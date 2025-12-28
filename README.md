# Agent12 - AI Voice Agent Platform

Agent12 is an AI-powered voice agent platform that helps small businesses never miss a customer call. The platform uses advanced AI to handle phone calls, book appointments, and manage customer service 24/7.

## Features

- 🤖 **AI Voice Agents**: Intelligent voice agents powered by Grok AI
- 📞 **Twilio Integration**: Reliable phone call handling
- 📊 **Call Analytics**: Track and analyze all your calls
- 💰 **Usage-Based Pricing**: Pay only for what you use
- 🏢 **Industry Templates**: Pre-configured agents for dental, HVAC, restaurants, salons, and more
- 📅 **Calendar Integration**: Automatic appointment booking
- 🔐 **Secure Authentication**: Built with Supabase Auth

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

1. Set up a Twilio phone number
2. Configure webhooks:
   - Voice URL: `https://your-server.com/api/voice/incoming`
   - Status Callback: `https://your-server.com/api/voice/status`

## Usage

1. Sign up at `/signup`
2. Create your first AI voice agent in the dashboard
3. Configure the agent with industry template or custom prompt
4. Get your dedicated phone number
5. Start receiving calls!

## Pricing

- **Platform Fee**: $50/month
- **Call Pricing** (usage-based):
  - 0-50 calls: $2.00/call
  - 51-150 calls: $1.50/call
  - 151-300 calls: $1.25/call
  - 301+ calls: $1.00/call

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
