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
}
