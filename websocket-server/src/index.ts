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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
