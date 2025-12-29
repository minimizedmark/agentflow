# External API & Service Dependencies Analysis

**Date:** 2025-12-29
**Project:** AgentFlow - AI Voice Agent Platform

---

## 🚨 Critical Problem: High API Dependency Count

**To run this application, you need 4 PAID external services:**

| Service | Status | Monthly Cost | Required For |
|---------|--------|--------------|--------------|
| **Supabase** | 🔴 CRITICAL | $25+ (Pro tier) | Database, Auth, Real-time |
| **Twilio** | 🔴 CRITICAL | $15+ base + usage | Phone calls, SMS |
| **Grok AI (X.AI)** | 🔴 CRITICAL | Pay-per-use | Voice AI assistant |
| **Stripe** | 🟡 REQUIRED | Free + 2.9% fees | Payment processing |

**Minimum Monthly Fixed Cost: ~$40+** (before any usage)
**Plus per-use costs:** Voice minutes, SMS, API calls, etc.

---

## Service Dependency Breakdown

### 1. Supabase (Database & Auth)

**What it does:**
- PostgreSQL database hosting
- User authentication & authorization
- Row Level Security (RLS)
- Real-time subscriptions
- Storage (if used)

**Usage in codebase:**
- `frontend/src/lib/supabase/client.ts` - Browser client
- `frontend/src/lib/supabase/server.ts` - Server-side client
- 43+ files reference Supabase

**Environment variables required:**
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**Cost:**
- Free tier: Limited features, good for development
- Pro tier: $25/month (required for production)
- Plus usage charges for database size, bandwidth

**Alternatives:**
- Self-hosted PostgreSQL + NextAuth.js
- Firebase (similar pricing model)
- PlanetScale (MySQL, pay-per-use)
- Neon (serverless Postgres, generous free tier)

---

### 2. Twilio (Telephony)

**What it does:**
- Phone number provisioning
- Voice call routing (VoIP)
- SMS sending/receiving
- WebSocket streaming for voice
- Call recording & analytics

**Usage in codebase:**
- `websocket-server/src/services/twilio.ts` - Main integration
- `websocket-server/src/services/call-logger.ts` - Call tracking
- `websocket-server/src/services/sms-service.ts` - SMS automation
- WebSocket server streams audio between Twilio ↔ Grok AI

**Environment variables required:**
```bash
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
```

**Cost:**
- Phone number: $1-15/month (depends on capabilities)
- Voice calls: $0.0085-0.025/minute
- SMS: $0.0075-0.02/message
- Typical usage: $100-500/month for small business

**Alternatives:**
- **Vonage/Nexmo** - Similar pricing
- **Plivo** - Slightly cheaper
- **Bandwidth.com** - Wholesale pricing
- **Telnyx** - Competitive rates
- **SignalWire** - Developer-friendly
- ⚠️ **Problem:** All alternatives have similar costs - VoIP is expensive!

---

### 3. Grok AI (X.AI)

**What it does:**
- Real-time voice AI conversations
- Speech-to-text (STT)
- Text-to-speech (TTS)
- Natural language understanding
- WebSocket streaming API

**Usage in codebase:**
- `websocket-server/src/services/grok-voice.ts` - Full integration
- Handles bidirectional audio streaming
- Session management
- Voice configuration (voice selection, prompts)

**Environment variables required:**
```bash
GROK_API_KEY
GROK_VOICE_API_URL=wss://api.x.ai/v1/voice
```

**Cost:**
- Unknown - likely pay-per-minute
- Estimated: $0.10-0.50/minute (based on similar services)
- Includes STT + LLM + TTS bundled

**Alternatives:**
- **OpenAI Realtime API** - $0.06/min input + $0.24/min output
- **Build your own stack:**
  - STT: Deepgram ($0.0043/min), AssemblyAI ($0.00025/sec)
  - LLM: OpenAI GPT-4o-mini ($0.15/1M tokens), Groq (free tier available)
  - TTS: ElevenLabs ($0.30/1K chars), Play.ht, OpenAI TTS
- **Google Dialogflow CX** - Voice agent platform
- **Amazon Lex + Polly** - AWS voice stack

**⚠️ Major Issue:** Grok Voice API is NEW and may have:
- Limited documentation
- Pricing changes
- API instability
- Vendor lock-in risk

---

### 4. Stripe (Payments)

**What it does:**
- Payment processing (credit cards)
- Customer management
- Subscriptions & invoicing
- Webhook notifications
- Payment method storage

**Usage in codebase:**
- `frontend/src/app/api/wallet/topup/route.ts` - Payment intents
- `frontend/src/app/api/wallet/webhook/route.ts` - Event handling
- `frontend/src/app/api/wallet/payment-methods/route.ts` - Card management
- `frontend/src/app/api/wallet/refund/route.ts` - Refunds
- 8+ files total

**Environment variables required:**
```bash
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

**Cost:**
- No monthly fee
- 2.9% + $0.30 per transaction
- Additional fees for international cards, disputes

**Alternatives:**
- **PayPal** - Similar fees (2.99% + $0.49)
- **Square** - 2.9% + $0.30
- **Paddle** - All-in-one (5% + $0.50)
- **Lemon Squeezy** - Merchant of record (5% + $0.50)
- **Cryptocurrency** - Lower fees but complex UX

**Status:** ✅ Reasonable - only pay when you earn

---

## Additional Services (Mentioned but Not Configured)

These are mentioned in README.md but not in current .env files:

### 5. OpenAI (Alternative AI)
- **README mentions:** "OpenAI (GPT-4o-mini)"
- **Not in .env files:** Not currently used
- **Use case:** Fallback LLM or alternative to Grok

### 6. Groq (Alternative AI)
- **README mentions:** "Groq (Mixtral, Llama)"
- **Not in .env files:** Not currently used
- **Use case:** Free/low-cost LLM alternative

### 7. ElevenLabs (Text-to-Speech)
- **README mentions:** "ElevenLabs (TTS)"
- **Not in .env files:** Not currently used
- **Use case:** High-quality voice synthesis

### 8. Email Services
- **README mentions:** "Gmail API, Outlook API, Resend"
- **Not in .env files:** Not currently used
- **Use case:** Email automation features

---

## Cost Analysis: What Does It REALLY Cost to Run This?

### Development Environment
```
Supabase Free Tier:        $0
Twilio Trial:               $15 credit (one-time)
Grok AI:                    Pay-per-use (~$10-50/month testing)
Stripe:                     $0 (no transactions)
─────────────────────────────────────────
TOTAL Development:          ~$10-50/month
```

### Production (Minimum Viable)
```
Supabase Pro:               $25/month
Twilio (1 phone number):    $1-15/month
Twilio Voice/SMS:           $100-300/month (usage)
Grok AI:                    $200-500/month (usage, estimated)
Stripe:                     ~2.9% of revenue
Hosting (Vercel):           $20/month (Pro tier)
─────────────────────────────────────────
TOTAL Production:           $346-860/month minimum
```

### Production (Real Usage - 100 customers)
```
Supabase Pro:               $25/month
Supabase Bandwidth:         $50/month (heavy usage)
Twilio Numbers:             $15/month (3 numbers)
Twilio Voice:               $1,500/month (500 min/day @ $0.01/min)
Twilio SMS:                 $300/month (2K msgs @ $0.0075)
Grok AI Voice:              $2,000/month (500 min/day @ $0.20/min est)
Stripe Fees:                3% of revenue
Hosting (Vercel):           $20-50/month
CDN (Cloudflare):           $20/month
Monitoring/Logs:            $50/month
─────────────────────────────────────────
TOTAL at Scale:             $3,980+/month in API costs
```

**This is BEFORE:**
- Customer support
- Marketing
- Development costs
- Server maintenance

---

## 🚨 Critical Issues

### 1. **Too Many Single Points of Failure**
- If Supabase goes down → Entire app broken
- If Twilio goes down → No calls/SMS possible
- If Grok AI goes down → Voice AI stops working
- If Stripe goes down → No payments

**Risk:** High dependency on 4 external services

### 2. **Vendor Lock-In**
- Supabase: Custom SDK, RLS policies
- Twilio: TwiML, phone numbers tied to account
- Grok AI: Proprietary API (NEW service, risky!)
- Stripe: Customer data, payment history

**Migration cost:** 100-200 hours of development to switch any one service

### 3. **Unpredictable Costs**
- Grok AI: Unknown pricing, could change
- Twilio: Usage-based, can spike unexpectedly
- Supabase: Database size grows → costs increase

**Risk:** Budget overruns, margin compression

### 4. **Development Complexity**
- Must maintain 4 different SDK integrations
- 4 different authentication methods
- 4 different error handling patterns
- 4 different rate limits to monitor

### 5. **Compliance & Data Residency**
- Data split across 4 services
- 4 different privacy policies
- GDPR compliance more complex
- SOC2 audit requires vetting all 4

---

## Recommendations

### 🔴 HIGH PRIORITY: Reduce API Dependencies

#### Option 1: Replace Grok AI with Modular Stack
**Problem:** Grok AI is a black box - one API for STT + LLM + TTS

**Solution:** Build your own voice stack:
```
Replace:  Grok AI ($0.20/min estimated)
With:     Deepgram STT ($0.0043/min)
          + Groq LLM (FREE tier or $0.10/1M tokens)
          + OpenAI TTS ($15/1M chars)
─────────────────────────────────────────
Savings:  ~70-80% cost reduction
Control:  Full control over each component
Risk:     More integration work upfront
```

**Estimated work:** 40-60 hours to build + test

#### Option 2: Replace Supabase with Self-Hosted Stack
**Problem:** $25/month + usage fees for database + auth

**Solution:** Self-host on DigitalOcean/Railway:
```
Replace:  Supabase ($25-100/month)
With:     PostgreSQL on Railway ($5-20/month)
          + NextAuth.js (free)
          + Supabase Realtime self-hosted (free)
─────────────────────────────────────────
Savings:  $20-80/month
Control:  Full database access
Risk:     Must manage backups, scaling
```

**Estimated work:** 60-80 hours (database migration, auth rewrite)

#### Option 3: Alternative Telephony Providers
**Current:** Twilio (premium pricing)
**Alternatives:**
- **Telnyx:** 20-30% cheaper
- **Bandwidth.com:** Enterprise wholesale rates
- **Plivo:** Similar features, slightly cheaper

**Savings:** 10-30% on voice/SMS costs
**Risk:** Low - APIs are similar
**Estimated work:** 20-30 hours migration

### 🟡 MEDIUM PRIORITY: Add Fallbacks & Redundancy

#### Implement Multi-Provider Strategy
```typescript
// Example: Voice AI with fallback
try {
  await grokVoiceAPI.connect();
} catch (error) {
  logger.warn('Grok AI failed, falling back to OpenAI Realtime');
  await openAIRealtimeAPI.connect();
}
```

**Benefits:**
- Reduce downtime
- Leverage free tiers (Groq)
- Price arbitrage

**Estimated work:** 30-40 hours per service

### 🟢 LOW PRIORITY: Optimize for Cost

#### 1. **Cache aggressively**
- Reduce Supabase queries
- Cache user data in Redis

#### 2. **Batch operations**
- Send SMS in batches
- Reduce Twilio API calls

#### 3. **Use free tiers strategically**
- Groq for non-critical LLM calls
- Supabase free tier for dev/staging

---

## Minimum Viable Configuration (Lowest Cost)

### For Development:
```bash
# Use free tiers only
SUPABASE: Free tier
TWILIO: Trial credits ($15)
GROK_AI: Replace with Groq (free) + Deepgram trial
STRIPE: Test mode (free)

Total: $0-10/month
```

### For MVP Launch (< 50 customers):
```bash
SUPABASE: Free tier (upgrade when needed)
TWILIO: 1 number + pay-per-use
VOICE AI: DIY stack (Deepgram + Groq + OpenAI TTS)
STRIPE: Pay-per-transaction

Total: ~$50-150/month
```

---

## Alternative Architecture (Fewer APIs)

### Current: 4 Required APIs
```
┌─────────┐   ┌────────┐   ┌──────────┐   ┌────────┐
│Supabase │   │ Twilio │   │ Grok AI  │   │ Stripe │
└─────────┘   └────────┘   └──────────┘   └────────┘
```

### Proposed: 2-3 Required APIs
```
┌──────────────┐   ┌────────┐   ┌────────┐
│ PostgreSQL   │   │ Twilio │   │ Stripe │
│ + NextAuth   │   │  OR    │   │        │
│ (self-hosted)│   │ Telnyx │   │        │
└──────────────┘   └────────┘   └────────┘
       │
       ├── Deepgram (STT)
       ├── Groq (LLM) - FREE tier
       └── OpenAI TTS

Supabase → Self-hosted PostgreSQL + NextAuth.js
Grok AI → Modular voice stack (3 separate APIs)
```

**Pros:**
- Lower monthly costs
- More control
- Less vendor lock-in
- Use free tiers (Groq)

**Cons:**
- More code complexity
- More integration work
- Must manage infrastructure

---

## Recommended Action Plan

### Phase 1: Audit & Document (This report ✅)
- [x] List all external APIs
- [x] Calculate current costs
- [x] Identify alternatives

### Phase 2: Quick Wins (1-2 weeks)
- [ ] Replace Grok AI with DIY voice stack
  - Deepgram for STT
  - Groq for LLM (free tier!)
  - OpenAI TTS or ElevenLabs
- [ ] Estimated savings: $150-300/month
- [ ] Risk: Medium (requires testing)

### Phase 3: Infrastructure (1 month)
- [ ] Evaluate Supabase alternatives
- [ ] Test self-hosted PostgreSQL + NextAuth
- [ ] Migration plan if cost-effective
- [ ] Estimated savings: $20-50/month

### Phase 4: Telephony Optimization (2 weeks)
- [ ] Compare Twilio vs Telnyx vs Bandwidth
- [ ] Calculate cost differences
- [ ] Migrate if savings > 20%
- [ ] Estimated savings: $30-100/month

### Phase 5: Add Redundancy (Ongoing)
- [ ] Multi-provider fallbacks
- [ ] Free tier usage where possible
- [ ] Monitoring & alerts

---

## Cost Comparison Matrix

| Configuration | Monthly Fixed | Per 1000 min voice | Per 1000 SMS | Total @ 5K min/mo |
|--------------|---------------|-------------------|--------------|-------------------|
| **Current (All Premium)** | $45 | $200 | $7.50 | $1,045 |
| **Optimized (Mix)** | $30 | $100 | $5.00 | $530 |
| **Budget (Free Tiers)** | $5 | $50 | $5.00 | $255 |
| **Self-Hosted (Advanced)** | $20 | $80 | $4.00 | $420 |

**Potential savings:** 50-75% with optimization

---

## Key Takeaways

1. **Current setup requires 4 paid APIs** - high dependency count
2. **Estimated production cost: $350-4,000/month** depending on scale
3. **Biggest cost drivers:**
   - Voice minutes (Twilio + Grok AI) = 70-80% of costs
   - Fixed infrastructure (Supabase, hosting) = 10-15%
   - Payments (Stripe) = Transaction-based
4. **Quick win:** Replace Grok AI with modular stack → Save 50-70%
5. **Long-term:** Self-host database/auth → Save $20-50/month
6. **Risk:** Grok AI is NEW - pricing could change, API could deprecate

---

## Next Steps

**Immediate (This Week):**
1. Test Groq API (free tier) for LLM
2. Trial Deepgram for STT ($200 credit)
3. Benchmark voice quality vs Grok AI

**Short-term (This Month):**
1. Build prototype voice stack (STT + LLM + TTS)
2. Compare costs and latency
3. Migrate 10% of traffic to new stack

**Long-term (This Quarter):**
1. Evaluate database hosting options
2. Consider telephony provider switch
3. Implement multi-provider fallbacks

---

## Questions to Answer

1. **How critical is Grok AI voice quality?** Can we match it with DIY stack?
2. **What's our target cost per voice minute?** Need to hit < $0.10/min for profitability
3. **Is Supabase worth $25-100/month?** Or can we self-host for $5-20?
4. **Can we get volume discounts?** From Twilio or alternatives?
5. **What's our uptime requirement?** 99.9%? 99.5%? Affects redundancy needs

---

**Conclusion:**

This application has **too many external API dependencies** (4 required, 4+ optional). The monthly cost is **$350-4,000+** depending on usage, with voice services being the primary cost driver.

**Recommendation:** Prioritize replacing Grok AI with a modular voice stack to reduce costs by 50-70% and decrease vendor lock-in risk.
