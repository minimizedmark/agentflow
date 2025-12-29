# Agentic Flow Architecture

## Core Principle: Maximize Value, Minimize Cost

**Customer pays for VALUE. We optimize for COST.**

- Voice Receptionist: Customer pays $2/min → Our cost target: $0.10-0.20/min
- SMS Autoresponder: Customer pays $1/SMS → Our cost target: $0.01-0.05/SMS
- Email Assistant: Customer pays $0.50/email → Our cost target: $0.02-0.10/email

**Profit margins: 80-90% by using free/open-source agentic flows**

---

## Service 1: AI Voice Receptionist

### Current Stack (Expensive)
- Grok Voice API: ~$1.50-2.00/min (eats into margins)

### Agentic Flow Stack (Low-Cost)
```
┌─────────────────────────────────────────────┐
│  Incoming Call (Twilio: $0.0085/min)       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  STT: Whisper (Free/Self-hosted)           │
│  - OpenAI Whisper API: $0.006/min          │
│  - Or self-hosted: FREE                    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  AGENT ORCHESTRATOR                         │
│  ┌────────────────────────────────────┐    │
│  │ Intent Classification Agent        │    │
│  │ - Groq Llama 3 70B (FREE tier)    │    │
│  │ - Determines: greeting, booking,   │    │
│  │   question, complaint, etc.        │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Response Generation Agent          │    │
│  │ - Groq Mixtral 8x7B (FREE tier)   │    │
│  │ - Uses business context/RAG        │    │
│  │ - Generates natural response       │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Action Agent (if needed)           │    │
│  │ - Book appointment → DB            │    │
│  │ - Transfer call → Twilio           │    │
│  │ - Take message → SMS/Email         │    │
│  └────────────────────────────────────┘    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  TTS: Coqui XTTS or ElevenLabs             │
│  - Coqui XTTS: FREE (self-hosted)          │
│  - ElevenLabs: $0.30/1000 chars (~$0.05/min)│
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Stream back to caller via Twilio           │
└─────────────────────────────────────────────┘

**Total Cost per Minute:**
- Twilio: $0.0085/min
- Whisper API: $0.006/min
- Groq LLMs: FREE (free tier: 30 req/min)
- TTS (ElevenLabs): $0.05/min
**TOTAL: ~$0.065/min**

**Margin: $2.00 - $0.065 = $1.935/min (96.7% margin)**
```

### Free/Low-Cost Options:
1. **STT**: Whisper (self-hosted on GPU or use Groq's Whisper API - FREE)
2. **LLM**: Groq (Llama 3 70B, Mixtral - FREE tier with 30 req/min)
3. **TTS**:
   - Coqui XTTS v2 (self-hosted - FREE)
   - PlayHT ($0.06/1000 chars)
   - ElevenLabs turbo ($0.30/1000 chars)
4. **Orchestration**: LangGraph (FREE, open-source)

---

## Service 2 & 3: SMS Autoresponder

### Agentic Flow Stack
```
┌─────────────────────────────────────────────┐
│  Incoming SMS (Twilio: $0.0079/SMS)        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  AGENT ORCHESTRATOR                         │
│  ┌────────────────────────────────────┐    │
│  │ Context Retrieval Agent            │    │
│  │ - Fetch customer history from DB   │    │
│  │ - Check if repeat customer         │    │
│  │ - Get business hours/info          │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Intent Classification Agent        │    │
│  │ - Groq Llama 3 8B (FREE)          │    │
│  │ - Booking, question, complaint?    │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Response Generation Agent          │    │
│  │ - Groq Mixtral 8x7B (FREE)        │    │
│  │ - Personalized, context-aware      │    │
│  │ - Business-specific knowledge      │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Action Agent (if needed)           │    │
│  │ - Create appointment               │    │
│  │ - Escalate to human                │    │
│  │ - Send follow-up later             │    │
│  └────────────────────────────────────┘    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Send SMS Response (Twilio: $0.0079/SMS)   │
└─────────────────────────────────────────────┘

**Total Cost per SMS:**
- Incoming SMS: $0.0079
- Groq LLM: FREE
- Outgoing SMS: $0.0079
**TOTAL: ~$0.016/SMS**

**Margin (Standalone): $1.00 - $0.016 = $0.984/SMS (98.4% margin)**
**Margin (Bundled): $0.50 - $0.016 = $0.484/SMS (96.8% margin)**
```

### Free Options:
1. **LLM**: Groq Llama 3 8B (FREE tier - fast inference)
2. **Embeddings**: OpenAI text-embedding-3-small ($0.00002/1K tokens) or BGE (self-hosted FREE)
3. **Vector DB**: Supabase pgvector (FREE tier)
4. **Orchestration**: LangGraph (FREE)

---

## Service 4: Missed Call Responder

### Agentic Flow Stack
```
┌─────────────────────────────────────────────┐
│  Missed Call Detected                       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  AGENT ORCHESTRATOR                         │
│  ┌────────────────────────────────────┐    │
│  │ Context Agent                      │    │
│  │ - Check caller history             │    │
│  │ - Time of day                      │    │
│  │ - Previous interactions            │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Message Generation Agent           │    │
│  │ - Groq Llama 3 8B (FREE)          │    │
│  │ - Personalized message             │    │
│  │ - Business hours context           │    │
│  └────────────────────────────────────┘    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Send SMS (Twilio: $0.0079)                │
└─────────────────────────────────────────────┘

**Total Cost per Call:**
- Groq LLM: FREE
- SMS: $0.0079
**TOTAL: ~$0.008/call**

**Margin: $1.50 - $0.008 = $1.492/call (99.5% margin)**
```

---

## Service 5: Email Assistant

### Agentic Flow Stack
```
┌─────────────────────────────────────────────┐
│  Incoming Email (Gmail API: FREE)          │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  AGENT ORCHESTRATOR                         │
│  ┌────────────────────────────────────┐    │
│  │ Email Classifier Agent             │    │
│  │ - Groq Llama 3 8B (FREE)          │    │
│  │ - Categories: urgent, spam,        │    │
│  │   customer service, sales, etc.    │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Priority Agent                     │    │
│  │ - Assign priority score            │    │
│  │ - Determine if auto-respond or     │    │
│  │   escalate to human                │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Response Drafter Agent             │    │
│  │ - Groq Mixtral 8x7B (FREE)        │    │
│  │ - Generate draft response          │    │
│  │ - Use business knowledge base      │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Action Agent                       │    │
│  │ - Auto-send (low priority)         │    │
│  │ - Save as draft (high priority)    │    │
│  │ - Notify owner                     │    │
│  └────────────────────────────────────┘    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Gmail API - Send/Draft (FREE)             │
└─────────────────────────────────────────────┘

**Total Cost per Email:**
- Gmail API: FREE
- Groq LLM: FREE
**TOTAL: ~$0.00/email**

**Margin (Standalone): $0.50 - $0.00 = $0.50/email (100% margin)**
**Margin (Bundled): $0.25 - $0.00 = $0.25/email (100% margin)**
```

---

## Service 16: Auto-Invoicing & Payment Reminders

### Agentic Flow Stack
```
┌─────────────────────────────────────────────┐
│  Trigger: Appointment completed             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  AGENT ORCHESTRATOR                         │
│  ┌────────────────────────────────────┐    │
│  │ Invoice Data Agent                 │    │
│  │ - Extract appointment details      │    │
│  │ - Calculate charges                │    │
│  │ - Format for QuickBooks            │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ QuickBooks Agent                   │    │
│  │ - Create invoice via API           │    │
│  │ - QuickBooks API: FREE             │    │
│  └────────────────────────────────────┘    │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │ Reminder Agent (scheduled)         │    │
│  │ - Check overdue invoices (cron)    │    │
│  │ - Groq LLM for personalized msg    │    │
│  │ - Send via Email/SMS               │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘

**Total Cost per Invoice:**
- QuickBooks API: FREE
- Groq LLM: FREE
- Reminder SMS/Email: $0.008-0.00
**TOTAL: ~$0.01/invoice**

**Margin: $1.50 - $0.01 = $1.49/invoice (99.3% margin)**
```

---

## Core Technologies for Low-Cost Agentic Flows

### 1. LLM Providers (FREE Tiers)
- **Groq** (PRIMARY): FREE tier with 30 req/min
  - Llama 3 8B: Fast, great for classification
  - Llama 3 70B: Smart, great for complex reasoning
  - Mixtral 8x7B: Balanced, great for responses
- **Together AI**: FREE $25/month credits
- **Replicate**: Pay-per-use, cheap
- **Self-hosted**: Llama 3 on Modal/RunPod (when volume increases)

### 2. Agent Orchestration (FREE)
- **LangGraph**: Build multi-agent workflows (FREE, open-source)
- **CrewAI**: Simpler agent framework (FREE, open-source)
- **AutoGen**: Microsoft's multi-agent framework (FREE)

### 3. Vector/Knowledge Base (FREE)
- **Supabase pgvector**: FREE tier, 500MB
- **Embeddings**: BGE (self-hosted FREE) or OpenAI ($0.00002/1K tokens)

### 4. Speech (Low-Cost)
- **STT**:
  - Groq Whisper API (FREE tier)
  - OpenAI Whisper API ($0.006/min)
  - Self-hosted Whisper (FREE)
- **TTS**:
  - Coqui XTTS v2 (self-hosted FREE)
  - PlayHT ($0.06/1000 chars)
  - ElevenLabs turbo ($0.30/1000 chars)

### 5. Communication (Low-Cost)
- **Twilio**: $0.0079-0.0085/message or per minute
- **Gmail API**: FREE
- **QuickBooks API**: FREE

---

## Implementation Strategy

### Phase 1: Replace Expensive APIs
1. Replace Grok Voice with Whisper + Groq + Coqui TTS
2. Add agent orchestration for voice calls (LangGraph)
3. Deploy self-hosted TTS (Coqui XTTS) on cheap GPU server

### Phase 2: Add Agentic Intelligence
1. Build multi-agent workflows for each service
2. Add RAG/knowledge base for business context
3. Implement intent classification and routing

### Phase 3: Scale & Optimize
1. Self-host models when volume justifies it
2. Batch processing where possible
3. Cache common responses
4. Use smaller models for simple tasks (Llama 3 8B)

---

## Example: Voice Receptionist Agentic Flow

```python
from langgraph.graph import Graph, StateGraph
from groq import Groq
import whisper
import coqui_tts

# Initialize agents
groq_client = Groq(api_key="free-tier")
whisper_model = whisper.load_model("base")
tts_engine = coqui_tts.TTS()

# Define agent workflow
class VoiceReceptionistFlow:
    async def listen(self, audio_stream):
        """Agent 1: Speech-to-Text"""
        text = whisper_model.transcribe(audio_stream)
        return text

    async def understand_intent(self, text):
        """Agent 2: Intent Classification"""
        response = groq_client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{
                "role": "system",
                "content": "Classify intent: booking, question, complaint, greeting, other"
            }, {
                "role": "user",
                "content": text
            }]
        )
        return response.choices[0].message.content

    async def generate_response(self, intent, context):
        """Agent 3: Response Generation"""
        response = groq_client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[{
                "role": "system",
                "content": f"You are a receptionist. Intent: {intent}. Context: {context}"
            }, {
                "role": "user",
                "content": "Generate appropriate response"
            }]
        )
        return response.choices[0].message.content

    async def take_action(self, intent, params):
        """Agent 4: Action Execution"""
        if intent == "booking":
            # Create appointment in DB
            pass
        elif intent == "transfer":
            # Transfer call
            pass

    async def speak(self, text):
        """Agent 5: Text-to-Speech"""
        audio = tts_engine.tts(text)
        return audio

# Build workflow graph
workflow = StateGraph()
workflow.add_node("listen", listen)
workflow.add_node("understand", understand_intent)
workflow.add_node("respond", generate_response)
workflow.add_node("action", take_action)
workflow.add_node("speak", speak)

# Define edges
workflow.add_edge("listen", "understand")
workflow.add_edge("understand", "respond")
workflow.add_edge("respond", "action")
workflow.add_edge("action", "speak")
```

---

## Cost Optimization Rules

1. **Use FREE tiers first** (Groq, Together AI)
2. **Use smaller models** for simple tasks (Llama 3 8B vs 70B)
3. **Cache responses** for common questions
4. **Batch operations** where possible
5. **Self-host** when volume justifies GPU costs
6. **Monitor usage** to avoid paid tier triggers

---

## Margin Analysis

| Service | Customer Price | Our Cost | Margin | Margin % |
|---------|---------------|----------|--------|----------|
| Voice Receptionist | $2.00/min | $0.065/min | $1.935/min | 96.7% |
| SMS Standalone | $1.00/SMS | $0.016/SMS | $0.984/SMS | 98.4% |
| SMS Bundled | $0.50/SMS | $0.016/SMS | $0.484/SMS | 96.8% |
| Missed Call | $1.50/call | $0.008/call | $1.492/call | 99.5% |
| Email Standalone | $0.50/email | $0.00/email | $0.50/email | 100% |
| Email Bundled | $0.25/email | $0.00/email | $0.25/email | 100% |
| Auto-Invoicing | $1.50/invoice | $0.01/invoice | $1.49/invoice | 99.3% |

**Average Margin: 98.7%**

This is how you build a sustainable, profitable business while delivering incredible value to small businesses.
