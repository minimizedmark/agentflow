import twilio from 'twilio';
import { logger } from '../utils/logger';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Twilio credentials not configured');
}

const client = twilio(accountSid, authToken);

export class TwilioService {
  async getCallDetails(callSid: string) {
    try {
      const call = await client.calls(callSid).fetch();
      
      return {
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        startTime: call.startTime,
      };
    } catch (error) {
      logger.error(`Failed to fetch call details for ${callSid}:`, error);
      throw error;
    }
  }

  async endCall(callSid: string) {
    try {
      await client.calls(callSid).update({ status: 'completed' });
      logger.info(`Ended call: ${callSid}`);
    } catch (error) {
      logger.error(`Failed to end call ${callSid}:`, error);
      throw error;
    }
  }

  async makeOutboundCall(to: string, from: string, webhookUrl: string) {
    try {
      const call = await client.calls.create({
        to,
        from,
        url: webhookUrl,
        statusCallback: `${webhookUrl}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
      });

      logger.info(`Created outbound call: ${call.sid}`);
      return call;
    } catch (error) {
      logger.error('Failed to create outbound call:', error);
      throw error;
    }
  }

  generateTwiML(websocketUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${websocketUrl}" />
  </Connect>
</Response>`;
  }

  async sendSMS(from: string, to: string, body: string) {
    try {
      const message = await client.messages.create({
        from,
        to,
        body,
      });

      logger.info(`Sent SMS: ${message.sid} from ${from} to ${to}`);
      return {
        sid: message.sid,
        status: message.status,
        from: message.from,
        to: message.to,
        body: message.body,
        price: message.price,
        priceUnit: message.priceUnit,
      };
    } catch (error) {
      logger.error(`Failed to send SMS from ${from} to ${to}:`, error);
      throw error;
    }
  }

  async getSMSDetails(messageSid: string) {
    try {
      const message = await client.messages(messageSid).fetch();

      return {
        sid: message.sid,
        from: message.from,
        to: message.to,
        body: message.body,
        status: message.status,
        direction: message.direction,
        price: message.price,
        priceUnit: message.priceUnit,
        dateSent: message.dateSent,
      };
    } catch (error) {
      logger.error(`Failed to fetch SMS details for ${messageSid}:`, error);
      throw error;
    }
  }
}
