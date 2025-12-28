import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { GrokVoiceConnection } from './services/grok-voice';
import { TwilioService } from './services/twilio';
import { CallLogger } from './services/call-logger';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.WEBSOCKET_SERVER_PORT || 8080;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Twilio webhook endpoint for incoming calls
app.post('/api/voice/incoming', async (req, res) => {
  const { CallSid, From, To, Direction } = req.body;

  logger.info(`Incoming call: ${CallSid} from ${From} to ${To}`);

  try {
    const twilioService = new TwilioService();
    const callLogger = new CallLogger();

    // Log the incoming call
    await callLogger.startCall({
      twilioCallSid: CallSid,
      fromNumber: From,
      toNumber: To,
      direction: Direction || 'inbound',
    });

    // Generate TwiML with WebSocket stream
    const websocketUrl = `wss://${BASE_URL.replace('http://', '').replace('https://', '')}/stream?callSid=${CallSid}`;
    const twiml = twilioService.generateTwiML(websocketUrl);

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    logger.error(`Error handling incoming call ${CallSid}:`, error);
    res.status(500).send('Error processing call');
  }
});

// Twilio webhook endpoint for call status updates
app.post('/api/voice/status', async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;

  logger.info(`Call status update: ${CallSid} - ${CallStatus}`);

  try {
    const callLogger = new CallLogger();

    if (CallStatus === 'completed') {
      const duration = parseInt(CallDuration, 10);
      await callLogger.endCall(CallSid, duration);
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error(`Error handling status update for ${CallSid}:`, error);
    res.sendStatus(500);
  }
});

// Endpoint to make outbound calls
app.post('/api/voice/outbound', async (req, res) => {
  const { to, from, agentId } = req.body;

  if (!to || !from) {
    return res.status(400).json({ error: 'Missing required parameters: to, from' });
  }

  try {
    const twilioService = new TwilioService();
    const webhookUrl = `${BASE_URL}/api/voice/incoming`;

    const call = await twilioService.makeOutboundCall(to, from, webhookUrl);

    logger.info(`Outbound call initiated: ${call.sid}`);

    res.json({
      success: true,
      callSid: call.sid,
      status: call.status,
    });
  } catch (error) {
    logger.error('Error initiating outbound call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// WebSocket connection handler
wss.on('connection', async (ws: WebSocket, req) => {
  const callSid = req.url?.split('?callSid=')[1];
  
  if (!callSid) {
    logger.error('No callSid provided in WebSocket connection');
    ws.close();
    return;
  }

  logger.info(`New WebSocket connection for call: ${callSid}`);

  try {
    // Initialize services
    const twilioService = new TwilioService();
    const callLogger = new CallLogger();
    const grokConnection = new GrokVoiceConnection(callSid);

    // Get call details from Twilio
    const callDetails = await twilioService.getCallDetails(callSid);
    
    // Start logging the call
    await callLogger.startCall({
      twilioCallSid: callSid,
      fromNumber: callDetails.from,
      toNumber: callDetails.to,
      direction: callDetails.direction,
    });

    // Connect to Grok Voice API
    await grokConnection.connect();

    // Bridge audio between Twilio and Grok
    ws.on('message', async (message: Buffer) => {
      try {
        // Forward audio from Twilio to Grok
        await grokConnection.sendAudio(message);
      } catch (error) {
        logger.error('Error forwarding audio to Grok:', error);
      }
    });

    // Handle audio from Grok back to Twilio
    grokConnection.on('audio', (audioData: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(audioData);
      }
    });

    // Handle call completion
    ws.on('close', async () => {
      logger.info(`WebSocket closed for call: ${callSid}`);
      await grokConnection.disconnect();
      await callLogger.endCall(callSid);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for call ${callSid}:`, error);
    });

    grokConnection.on('error', (error) => {
      logger.error(`Grok connection error for call ${callSid}:`, error);
    });

  } catch (error) {
    logger.error(`Failed to initialize call ${callSid}:`, error);
    ws.close();
  }
});

// Start server
server.listen(PORT, () => {
  logger.info(`WebSocket server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
