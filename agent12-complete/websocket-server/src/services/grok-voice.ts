import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface GrokVoiceConfig {
  apiKey: string;
  model: string;
  voice: string;
  systemPrompt: string;
  tools?: any[];
}

export class GrokVoiceConnection extends EventEmitter {
  private ws: WebSocket | null = null;
  private callSid: string;
  private config: GrokVoiceConfig;
  private isConnected: boolean = false;

  constructor(callSid: string, config?: Partial<GrokVoiceConfig>) {
    super();
    this.callSid = callSid;
    
    this.config = {
      apiKey: process.env.GROK_API_KEY || '',
      model: 'grok-voice-agent',
      voice: config?.voice || 'Ara',
      systemPrompt: config?.systemPrompt || 'You are a helpful voice assistant.',
      tools: config?.tools || [],
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = process.env.GROK_VOICE_API_URL || 'wss://api.x.ai/v1/voice';
        
        this.ws = new WebSocket(url, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        this.ws.on('open', () => {
          logger.info(`Connected to Grok Voice API for call ${this.callSid}`);
          this.isConnected = true;
          
          // Send session configuration
          this.sendSessionConfig();
          
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleGrokMessage(data);
        });

        this.ws.on('error', (error) => {
          logger.error(`Grok WebSocket error for call ${this.callSid}:`, error);
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', () => {
          logger.info(`Grok WebSocket closed for call ${this.callSid}`);
          this.isConnected = false;
        });

      } catch (error) {
        logger.error(`Failed to connect to Grok for call ${this.callSid}:`, error);
        reject(error);
      }
    });
  }

  private sendSessionConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const sessionConfig = {
      type: 'session.update',
      session: {
        instructions: this.config.systemPrompt,
        voice: this.config.voice,
        model: this.config.model,
        tools: this.config.tools,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };

    this.ws.send(JSON.stringify(sessionConfig));
    logger.debug(`Sent session config for call ${this.callSid}`);
  }

  async sendAudio(audioData: Buffer): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Cannot send audio - WebSocket not open for call ${this.callSid}`);
      return;
    }

    // Convert audio to base64 and send to Grok
    const base64Audio = audioData.toString('base64');
    
    const audioMessage = {
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    };

    this.ws.send(JSON.stringify(audioMessage));
  }

  private handleGrokMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'response.audio.delta':
          // Audio chunk from Grok - forward to Twilio
          if (message.delta) {
            const audioBuffer = Buffer.from(message.delta, 'base64');
            this.emit('audio', audioBuffer);
          }
          break;

        case 'response.audio.done':
          logger.debug(`Audio response completed for call ${this.callSid}`);
          break;

        case 'response.text.delta':
          // Transcript chunk - log it
          logger.debug(`Grok text delta: ${message.delta}`);
          this.emit('transcript', message.delta);
          break;

        case 'error':
          logger.error(`Grok error for call ${this.callSid}:`, message.error);
          this.emit('error', new Error(message.error.message));
          break;

        case 'session.created':
          logger.info(`Grok session created for call ${this.callSid}`);
          break;

        case 'session.updated':
          logger.info(`Grok session updated for call ${this.callSid}`);
          break;

        default:
          logger.debug(`Unhandled Grok message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Error parsing Grok message for call ${this.callSid}:`, error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      logger.info(`Disconnected from Grok for call ${this.callSid}`);
    }
  }

  isActive(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}
