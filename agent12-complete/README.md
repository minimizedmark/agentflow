# Agent12 - AI Voice Agent Platform

## Overview
Agent12 is a scalable AI voice agent platform that helps businesses automate phone conversations using advanced AI. Built with Grok Voice API, Twilio telephony, and modular architecture.

## Features
- **Real-time voice conversations** - Sub-1 second response time
- **Industry templates** - Pre-built agents for dental, HVAC, restaurants, etc.
- **Usage-based pricing** - Automatic tier adjustment based on call volume
- **Tool integrations** - Calendar booking, CRM updates, webhooks
- **Comprehensive dashboard** - Call logs, analytics, billing management

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Node.js, WebSocket server, Next.js API routes
- **Database**: PostgreSQL (via Supabase)
- **Voice AI**: Grok Voice API
- **Telephony**: Twilio Voice API
- **Payments**: Stripe
- **Hosting**: Vercel (frontend), Railway (WebSocket server)

## Architecture

```
Phone Call → Twilio → WebSocket Server → Grok Voice API
                           ↓
Customer Dashboard ← Node.js API ← Database ← Usage Tracking
                           ↓
                    Stripe Billing
```

## Getting Started

1. **Environment Setup**
```bash
cp .env.example .env.local
# Fill in all required environment variables
```

2. **Install Dependencies**
```bash
npm install
```

3. **Database Setup**
```bash
npm run db:setup
```

4. **Development**
```bash
npm run dev
```

## Project Structure
```
agent12/
├── frontend/          # Next.js application
├── websocket-server/  # WebSocket server for voice connections
├── database/          # Database schemas and migrations
├── shared/           # Shared types and utilities
└── deployment/       # Docker and deployment configs
```

## Deployment
- Frontend: Vercel
- WebSocket Server: Railway
- Database: Supabase

## License
MIT License
