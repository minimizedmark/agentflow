import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

interface CallData {
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  direction: string;
  agentId?: string;
  userId?: string;
}

export class CallLogger {
  async startCall(data: CallData) {
    try {
      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          twilio_call_sid: data.twilioCallSid,
          from_number: data.fromNumber,
          to_number: data.toNumber,
          direction: data.direction,
          agent_id: data.agentId,
          user_id: data.userId,
          status: 'in-progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(`Logged start of call: ${data.twilioCallSid}`);
      return call;
    } catch (error) {
      logger.error(`Failed to log call start for ${data.twilioCallSid}:`, error);
      throw error;
    }
  }

  async endCall(twilioCallSid: string, duration?: number) {
    try {
      const { error } = await supabase
        .from('calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        })
        .eq('twilio_call_sid', twilioCallSid);

      if (error) throw error;

      logger.info(`Logged end of call: ${twilioCallSid}`);
      
      // Calculate and update cost
      await this.calculateCallCost(twilioCallSid);
    } catch (error) {
      logger.error(`Failed to log call end for ${twilioCallSid}:`, error);
      throw error;
    }
  }

  async updateTranscript(twilioCallSid: string, transcript: string) {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ transcript })
        .eq('twilio_call_sid', twilioCallSid);

      if (error) throw error;

      logger.debug(`Updated transcript for call: ${twilioCallSid}`);
    } catch (error) {
      logger.error(`Failed to update transcript for ${twilioCallSid}:`, error);
    }
  }

  async calculateCallCost(twilioCallSid: string) {
    try {
      // Get call duration
      const { data: call } = await supabase
        .from('calls')
        .select('duration_seconds')
        .eq('twilio_call_sid', twilioCallSid)
        .single();

      if (!call || !call.duration_seconds) return;

      const durationMinutes = call.duration_seconds / 60;
      
      // Calculate costs
      const grokCost = durationMinutes * 0.05; // $0.05 per minute
      const twilioCost = durationMinutes * 0.013; // ~$0.013 per minute
      const totalCost = grokCost + twilioCost;

      // Update call with cost
      const { error } = await supabase
        .from('calls')
        .update({ cost_usd: totalCost.toFixed(4) })
        .eq('twilio_call_sid', twilioCallSid);

      if (error) throw error;

      logger.info(`Calculated cost for call ${twilioCallSid}: $${totalCost.toFixed(4)}`);
    } catch (error) {
      logger.error(`Failed to calculate cost for ${twilioCallSid}:`, error);
    }
  }
}
