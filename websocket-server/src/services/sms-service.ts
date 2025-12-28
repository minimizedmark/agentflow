import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { TwilioService } from './twilio';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SMSAutoresponderParams {
  userId: string;
  fromNumber: string;
  toNumber: string;
  incomingMessage: string;
  twilioMessageSid: string;
}

interface MissedCallResponderParams {
  userId: string;
  callId: string;
  fromNumber: string;
  toNumber: string;
  callSid: string;
}

export class SMSService {
  private twilioService: TwilioService;

  constructor() {
    this.twilioService = new TwilioService();
  }

  /**
   * Handle incoming SMS and auto-respond if service is enabled
   */
  async handleAutoresponder(params: SMSAutoresponderParams) {
    const { userId, fromNumber, toNumber, incomingMessage, twilioMessageSid } = params;

    try {
      // Log incoming SMS
      const { data: incomingSMS } = await supabase
        .from('sms_messages')
        .insert({
          user_id: userId,
          twilio_message_sid: twilioMessageSid,
          direction: 'inbound',
          from_number: fromNumber,
          to_number: toNumber,
          body: incomingMessage,
          status: 'received',
          service_key: 'sms_autoresponder',
        })
        .select()
        .single();

      // Check if SMS autoresponder is enabled for this user (standalone or bundled)
      const { data: userServices } = await supabase
        .from('user_services')
        .select('id, enabled, config, service_id, services(service_key, usage_price_model)')
        .eq('user_id', userId)
        .eq('enabled', true)
        .in('services.service_key', ['sms_autoresponder_standalone', 'sms_autoresponder_bundled']);

      if (!userServices || userServices.length === 0) {
        logger.info(`SMS autoresponder not enabled for user ${userId}`);
        return null;
      }

      // Use the first enabled service (prefer bundled if both are enabled)
      const userService = userServices.find((s: any) => s.services?.service_key === 'sms_autoresponder_bundled') || userServices[0];
      const service = userService.services;

      const config = userService.config as any;

      // Get response message
      let responseMessage = '';

      if (config.ai_powered) {
        // TODO: Integrate with AI for intelligent responses
        responseMessage = 'Thank you for your message. We will get back to you shortly.';
      } else if (config.template_id) {
        // Get template
        const { data: template } = await supabase
          .from('sms_templates')
          .select('*')
          .eq('id', config.template_id)
          .eq('user_id', userId)
          .in('service_key', ['sms_autoresponder_standalone', 'sms_autoresponder_bundled'])
          .single();

        if (template) {
          responseMessage = this.fillTemplate(template.message_template, {
            from_number: fromNumber,
            to_number: toNumber,
          });
        }
      } else {
        responseMessage = 'Thank you for your message. We will get back to you shortly.';
      }

      // Send auto-reply
      const smsResult = await this.twilioService.sendSMS(toNumber, fromNumber, responseMessage);

      // Log outgoing SMS
      await supabase.from('sms_messages').insert({
        user_id: userId,
        twilio_message_sid: smsResult.sid,
        direction: 'outbound',
        from_number: toNumber,
        to_number: fromNumber,
        body: responseMessage,
        status: 'sent',
        service_key: 'sms_autoresponder',
        in_reply_to: incomingSMS?.id,
        is_automated: true,
        template_used: config.template_id,
        cost_usd: Math.abs(parseFloat(smsResult.price || '0')),
      });

      // Log service usage for billing (use the actual service key)
      await supabase.rpc('log_service_usage', {
        p_user_id: userId,
        p_service_key: service.service_key,
        p_usage_type: 'sms',
        p_quantity: 1,
        p_metadata: {
          message_sid: smsResult.sid,
          from: toNumber,
          to: fromNumber,
        },
      });

      logger.info(`Auto-replied to SMS from ${fromNumber}`);
      return smsResult;
    } catch (error) {
      logger.error('Error handling SMS autoresponder:', error);
      throw error;
    }
  }

  /**
   * Send SMS for missed calls
   */
  async handleMissedCallResponder(params: MissedCallResponderParams) {
    const { userId, callId, fromNumber, toNumber, callSid } = params;

    try {
      // Check if missed call responder is enabled for this user
      const { data: userService } = await supabase
        .from('user_services')
        .select('id, enabled, config, service_id')
        .eq('user_id', userId)
        .eq('enabled', true)
        .limit(1)
        .single();

      if (!userService) {
        logger.info(`Missed call responder not enabled for user ${userId}`);
        return null;
      }

      // Get service details
      const { data: service } = await supabase
        .from('services')
        .select('*')
        .eq('service_key', 'missed_call_responder')
        .single();

      if (!service || userService.service_id !== service.id) {
        logger.info(`Missed call responder service not found or mismatch`);
        return null;
      }

      const config = userService.config as any;
      const delaySeconds = config.delay_seconds || 30;

      // Wait for configured delay
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));

      // Get message template
      let message = '';

      if (config.template_id) {
        const { data: template } = await supabase
          .from('sms_templates')
          .select('*')
          .eq('id', config.template_id)
          .eq('user_id', userId)
          .in('service_key', ['sms_autoresponder_standalone', 'sms_autoresponder_bundled'])
          .single();

        if (template) {
          message = this.fillTemplate(template.message_template, {
            from_number: fromNumber,
            to_number: toNumber,
          });
        }
      } else {
        message = `Sorry we missed your call. We'll get back to you as soon as possible. Reply to this message or call us again.`;
      }

      // Send SMS
      const smsResult = await this.twilioService.sendSMS(toNumber, fromNumber, message);

      // Log outgoing SMS
      await supabase.from('sms_messages').insert({
        user_id: userId,
        twilio_message_sid: smsResult.sid,
        direction: 'outbound',
        from_number: toNumber,
        to_number: fromNumber,
        body: message,
        status: 'sent',
        service_key: 'missed_call_responder',
        related_call_id: callId,
        is_automated: true,
        template_used: config.template_id,
        cost_usd: Math.abs(parseFloat(smsResult.price || '0')),
      });

      // Log service usage for billing at $1.50 per call
      await supabase.rpc('log_service_usage', {
        p_user_id: userId,
        p_service_key: 'missed_call_responder',
        p_usage_type: 'call',
        p_quantity: 1,
        p_metadata: {
          message_sid: smsResult.sid,
          call_sid: callSid,
          from: toNumber,
          to: fromNumber,
        },
      });

      logger.info(`Sent missed call SMS to ${fromNumber}`);
      return smsResult;
    } catch (error) {
      logger.error('Error handling missed call responder:', error);
      throw error;
    }
  }

  /**
   * Fill template with variables
   */
  private fillTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Get user ID from phone number
   */
  async getUserByPhoneNumber(phoneNumber: string): Promise<string | null> {
    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('user_id')
        .eq('phone_number', phoneNumber)
        .single();

      return agent?.user_id || null;
    } catch (error) {
      logger.error(`Failed to get user for phone number ${phoneNumber}:`, error);
      return null;
    }
  }
}
