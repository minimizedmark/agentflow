# Agentic Flow Implementation Plan

## Immediate Actions: Replace Expensive APIs with Free Alternatives

### Step 1: Set Up Free LLM Access (Groq)

**Why Groq:**
- FREE tier: 30 requests/minute (6,000+ requests/day)
- Ultra-fast inference (~300 tokens/sec)
- Multiple models: Llama 3 8B, 70B, Mixtral 8x7B
- No credit card required for free tier

**Setup:**
```bash
npm install groq-sdk
```

**.env addition:**
```env
GROQ_API_KEY=gsk_... # Free from https://console.groq.com
```

**Example usage:**
```typescript
// websocket-server/src/services/groq-service.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export class GroqService {
  // Fast classification - use 8B model
  async classifyIntent(text: string): Promise<string> {
    const completion = await groq.chat.completions.create({
      messages: [{
        role: 'system',
        content: 'Classify this message intent in one word: booking, question, complaint, greeting, urgent, spam'
      }, {
        role: 'user',
        content: text
      }],
      model: 'llama3-8b-8192', // Fast and free
      temperature: 0.1,
      max_tokens: 10
    });

    return completion.choices[0].message.content?.toLowerCase() || 'unknown';
  }

  // Smart response - use 70B or Mixtral
  async generateResponse(intent: string, message: string, context: any): Promise<string> {
    const completion = await groq.chat.completions.create({
      messages: [{
        role: 'system',
        content: `You are a helpful business assistant.
Business hours: ${context.businessHours}
Services: ${context.services}
Intent: ${intent}

Generate a brief, friendly response.`
      }, {
        role: 'user',
        content: message
      }],
      model: 'mixtral-8x7b-32768', // Good balance of quality and speed
      temperature: 0.7,
      max_tokens: 150
    });

    return completion.choices[0].message.content || 'Thank you for your message.';
  }
}
```

---

### Step 2: Replace SMS Autoresponder with Agentic Flow

**Current:** Template-based responses
**New:** AI-powered, context-aware responses using free Groq

```typescript
// websocket-server/src/services/sms-agent.ts
import { GroqService } from './groq-service';
import { createClient } from '@supabase/supabase-js';

const groq = new GroqService();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export class SMSAgent {
  async handleIncomingSMS(params: {
    userId: string;
    fromNumber: string;
    message: string;
  }) {
    // Agent 1: Get Context
    const context = await this.getContext(params.userId, params.fromNumber);

    // Agent 2: Classify Intent
    const intent = await groq.classifyIntent(params.message);

    // Agent 3: Determine Action
    const action = this.determineAction(intent, context);

    // Agent 4: Generate Response
    let response: string;

    if (action.useAI) {
      response = await groq.generateResponse(intent, params.message, {
        businessHours: context.businessHours,
        services: context.services,
        customerHistory: context.isReturning ? 'returning customer' : 'new customer'
      });
    } else {
      response = action.templateResponse;
    }

    // Agent 5: Execute Action
    await this.executeAction(action, params.userId, params.fromNumber);

    return response;
  }

  private async getContext(userId: string, fromNumber: string) {
    // Fetch business settings
    const { data: agent } = await supabase
      .from('agents')
      .select('business_hours, services, agent_prompt')
      .eq('user_id', userId)
      .single();

    // Check if returning customer
    const { data: history } = await supabase
      .from('sms_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('from_number', fromNumber)
      .limit(1);

    return {
      businessHours: agent?.business_hours || '9am-5pm',
      services: agent?.services || 'General business',
      agentPrompt: agent?.agent_prompt,
      isReturning: history && history.length > 0
    };
  }

  private determineAction(intent: string, context: any) {
    // Simple rules engine - can be made more sophisticated
    if (intent === 'spam') {
      return { useAI: false, templateResponse: '', shouldRespond: false };
    }

    if (intent === 'urgent' || intent === 'complaint') {
      return {
        useAI: true,
        notifyOwner: true,
        shouldRespond: true
      };
    }

    if (intent === 'booking') {
      return {
        useAI: true,
        createLead: true,
        shouldRespond: true
      };
    }

    return {
      useAI: true,
      shouldRespond: true
    };
  }

  private async executeAction(action: any, userId: string, fromNumber: string) {
    if (action.notifyOwner) {
      // Send notification to business owner
      // Could be email, SMS, or push notification
    }

    if (action.createLead) {
      // Create lead in CRM/database
      await supabase.from('leads').insert({
        user_id: userId,
        phone_number: fromNumber,
        source: 'sms',
        status: 'new'
      });
    }
  }
}
```

**Cost per SMS:**
- Groq API: FREE
- Twilio: $0.0079 (incoming) + $0.0079 (outgoing) = $0.0158

**Customer pays:** $1.00
**Our cost:** $0.0158
**Margin:** $0.9842 (98.4%)

---

### Step 3: Add Email Agent (100% Free)

```typescript
// websocket-server/src/services/email-agent.ts
import { GroqService } from './groq-service';
import { google } from 'googleapis';

const groq = new GroqService();
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

export class EmailAgent {
  async processEmail(emailId: string, userId: string) {
    // Agent 1: Fetch Email
    const email = await this.fetchEmail(emailId);

    // Agent 2: Classify & Prioritize
    const classification = await this.classifyEmail(email.body);

    // Agent 3: Decide Action
    const decision = this.decideAction(classification);

    // Agent 4: Generate Draft
    if (decision.shouldDraft) {
      const draft = await this.generateDraft(email, classification);

      if (decision.autoSend) {
        await this.sendEmail(draft);
      } else {
        await this.saveDraft(draft);
        await this.notifyUser(userId, 'New draft ready for review');
      }
    }

    // Log usage for billing
    await this.logUsage(userId, 'email_assistant');
  }

  private async classifyEmail(body: string) {
    const completion = await groq.chat.completions.create({
      messages: [{
        role: 'system',
        content: `Classify this email:
- Category: customer_service, sales, spam, urgent, general
- Priority: high, medium, low
- Sentiment: positive, neutral, negative
- RequiresHuman: yes, no

Respond in JSON format.`
      }, {
        role: 'user',
        content: body
      }],
      model: 'llama3-8b-8192',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  private decideAction(classification: any) {
    // Auto-send for low priority, routine responses
    if (classification.priority === 'low' && classification.category === 'general') {
      return { shouldDraft: true, autoSend: true };
    }

    // Save draft for high priority or negative sentiment
    if (classification.priority === 'high' || classification.sentiment === 'negative') {
      return { shouldDraft: true, autoSend: false };
    }

    // Default: draft but don't auto-send
    return { shouldDraft: true, autoSend: false };
  }

  private async generateDraft(email: any, classification: any) {
    const completion = await groq.chat.completions.create({
      messages: [{
        role: 'system',
        content: `Generate a professional email response.
Category: ${classification.category}
Sentiment: ${classification.sentiment}
Tone: friendly, professional, helpful`
      }, {
        role: 'user',
        content: `Original email: ${email.body}\n\nGenerate a response:`
      }],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 300
    });

    return {
      to: email.from,
      subject: `Re: ${email.subject}`,
      body: completion.choices[0].message.content
    };
  }
}
```

**Cost per Email:**
- Gmail API: FREE
- Groq API: FREE
- Total: $0.00

**Customer pays:** $0.50 (standalone) or $0.25 (bundled)
**Our cost:** $0.00
**Margin:** 100%

---

### Step 4: Voice Receptionist with Agentic Flow

**Architecture:**
```
Twilio Call → Whisper STT → Groq Agents → Coqui TTS → Twilio
   ($0.0085/min)   (FREE)      (FREE)      (FREE)     (stream back)
```

**Technologies:**
1. **STT:** Groq Whisper API (FREE tier) or OpenAI Whisper API ($0.006/min)
2. **LLM:** Groq Llama/Mixtral (FREE)
3. **TTS:** Coqui XTTS v2 (self-hosted FREE) or PlayHT ($0.06/1000 chars)

```typescript
// websocket-server/src/services/voice-agent.ts
import Groq from 'groq-sdk';
import WebSocket from 'ws';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export class VoiceAgent {
  private conversationHistory: any[] = [];

  async handleVoiceStream(ws: WebSocket, userId: string) {
    let audioBuffer = Buffer.alloc(0);

    ws.on('message', async (message: any) => {
      const msg = JSON.parse(message.toString());

      if (msg.event === 'media') {
        // Accumulate audio
        const chunk = Buffer.from(msg.media.payload, 'base64');
        audioBuffer = Buffer.concat([audioBuffer, chunk]);

        // When we have ~2 seconds of audio, transcribe
        if (audioBuffer.length > 32000) {
          await this.processAudioChunk(audioBuffer, ws, userId);
          audioBuffer = Buffer.alloc(0);
        }
      }
    });
  }

  private async processAudioChunk(audio: Buffer, ws: WebSocket, userId: string) {
    // Agent 1: Speech-to-Text (Groq Whisper - FREE)
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3',
      response_format: 'json'
    });

    const userText = transcription.text;
    console.log('User said:', userText);

    // Agent 2: Understanding & Response (Groq Llama/Mixtral - FREE)
    this.conversationHistory.push({
      role: 'user',
      content: userText
    });

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a friendly receptionist for a small business.
Keep responses brief (1-2 sentences).
Be helpful and professional.
Ask clarifying questions when needed.
Offer to take messages or book appointments.`
        },
        ...this.conversationHistory
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 100
    });

    const responseText = completion.choices[0].message.content;
    this.conversationHistory.push({
      role: 'assistant',
      content: responseText
    });

    console.log('Agent response:', responseText);

    // Agent 3: Text-to-Speech
    const audioResponse = await this.synthesizeSpeech(responseText);

    // Agent 4: Stream back to caller
    ws.send(JSON.stringify({
      event: 'media',
      media: {
        payload: audioResponse.toString('base64')
      }
    }));
  }

  private async synthesizeSpeech(text: string): Promise<Buffer> {
    // Option 1: Use ElevenLabs ($0.30/1000 chars)
    // Option 2: Use PlayHT ($0.06/1000 chars)
    // Option 3: Self-host Coqui XTTS (FREE but needs GPU)

    // For now, using PlayHT (cheap and good quality)
    const response = await fetch('https://api.play.ht/api/v2/tts/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PLAYHT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voice: 'en-US-JennyNeural',
        output_format: 'mulaw',
        sample_rate: 8000
      })
    });

    return Buffer.from(await response.arrayBuffer());
  }
}
```

**Cost per Minute:**
- Twilio: $0.0085/min
- Groq Whisper: FREE (or $0.006/min if using OpenAI)
- Groq LLM: FREE
- TTS (PlayHT): ~$0.05/min
- **Total: $0.059/min**

**Customer pays:** $2.00/min
**Our cost:** $0.059/min
**Margin:** $1.941/min (97%)

---

### Step 5: Agent Orchestration with LangGraph

For complex multi-step workflows:

```bash
npm install @langchain/langgraph @langchain/core
```

```typescript
// websocket-server/src/agents/voice-receptionist-graph.ts
import { StateGraph } from '@langchain/langgraph';

interface ConversationState {
  messages: any[];
  intent: string;
  context: any;
  action: string;
  response: string;
}

export function createVoiceReceptionistGraph() {
  const workflow = new StateGraph<ConversationState>({
    channels: {
      messages: null,
      intent: null,
      context: null,
      action: null,
      response: null
    }
  });

  // Agent 1: Understand Intent
  workflow.addNode('understand_intent', async (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const intent = await groq.classifyIntent(lastMessage.content);
    return { ...state, intent };
  });

  // Agent 2: Fetch Context
  workflow.addNode('fetch_context', async (state) => {
    const context = await getBusinessContext(state.userId);
    return { ...state, context };
  });

  // Agent 3: Decide Action
  workflow.addNode('decide_action', async (state) => {
    let action = 'respond';

    if (state.intent === 'booking') action = 'create_appointment';
    if (state.intent === 'transfer') action = 'transfer_call';
    if (state.intent === 'message') action = 'take_message';

    return { ...state, action };
  });

  // Agent 4: Execute Action
  workflow.addNode('execute_action', async (state) => {
    if (state.action === 'create_appointment') {
      await createAppointment(state);
    } else if (state.action === 'transfer_call') {
      await transferCall(state);
    }
    return state;
  });

  // Agent 5: Generate Response
  workflow.addNode('generate_response', async (state) => {
    const response = await groq.generateResponse(
      state.intent,
      state.messages[state.messages.length - 1].content,
      state.context
    );
    return { ...state, response };
  });

  // Define workflow edges
  workflow.addEdge('understand_intent', 'fetch_context');
  workflow.addEdge('fetch_context', 'decide_action');
  workflow.addEdge('decide_action', 'execute_action');
  workflow.addEdge('execute_action', 'generate_response');

  workflow.setEntryPoint('understand_intent');

  return workflow.compile();
}
```

---

## Implementation Priority

### Week 1: SMS Autoresponder Agent
- [x] Set up Groq API (FREE)
- [ ] Implement SMS Agent with context awareness
- [ ] Deploy and test with real users
- [ ] Monitor costs and quality

### Week 2: Email Assistant Agent
- [ ] Set up Gmail API integration
- [ ] Implement Email Agent with classification
- [ ] Add auto-draft functionality
- [ ] Test with sample emails

### Week 3: Voice Receptionist v2
- [ ] Set up Groq Whisper API
- [ ] Implement voice streaming pipeline
- [ ] Add TTS (PlayHT or Coqui)
- [ ] Test call quality and latency

### Week 4: Advanced Features
- [ ] Add RAG/knowledge base (pgvector)
- [ ] Implement multi-agent workflows (LangGraph)
- [ ] Add caching for common responses
- [ ] Optimize for scale

---

## Cost Monitoring

Create a simple cost tracking table:

```sql
CREATE TABLE service_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_key TEXT NOT NULL,
  usage_type TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'groq', 'twilio', 'playht', etc.
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Track every API call cost:
```typescript
async logCost(serviceKey: string, provider: string, cost: number) {
  await supabase.from('service_costs').insert({
    service_key: serviceKey,
    usage_type: 'api_call',
    provider,
    cost_usd: cost
  });
}
```

---

## Success Metrics

Track these to ensure we're delivering value while minimizing cost:

1. **Margin per Service**
   - Target: >95% margin
   - Alert if margin drops below 90%

2. **Response Quality**
   - User satisfaction score
   - Response accuracy
   - Escalation rate (how often AI fails and needs human)

3. **API Costs**
   - Daily cost per service
   - Cost per customer
   - Groq free tier usage (stay under 30 req/min)

4. **Performance**
   - Response latency
   - Call quality (MOS score for voice)
   - Email draft accuracy

---

## Next Steps

1. **Set up Groq account** (free tier): https://console.groq.com
2. **Implement SMS Agent** using the code above
3. **Test with 10-20 real SMS** to validate quality
4. **Monitor costs** in service_costs table
5. **Iterate** based on quality and cost metrics

The goal: **98%+ margins while delivering incredible value to small businesses.**
