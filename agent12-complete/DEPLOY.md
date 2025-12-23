# Deployment Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
npm run install:all
```

### 2. Environment Setup

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Deploy

**Frontend (Vercel):**
```bash
cd frontend
vercel
```

**WebSocket Server (Railway):**
```bash
cd websocket-server
# Follow Railway deployment docs
```

See full instructions in main README.md
