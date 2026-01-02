import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminActivity } from '@/lib/admin-auth';
import env from '@/lib/env';

// Database types (snake_case as returned by Supabase)
interface DbCall {
  id: string;
  agent_id?: string;
  user_id?: string;
  twilio_call_sid: string;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed';
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  cost_usd: number;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

interface DbWalletTransaction {
  id: string;
  user_id: string;
  transaction_type: 'deposit' | 'withdrawal' | 'refund' | 'adjustment' | 'call_charge';
  amount_usd: string | number;
  balance_before_usd: number;
  balance_after_usd: number;
  description: string;
  metadata?: Record<string, any>;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  related_call_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

// GET - Get single user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
    const { userId } = await params;

    const supabase = env.createSupabaseAdmin();

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user stats
    const [
      { data: agents, count: agentCount },
      { data: calls, count: callCount },
      { data: transactions },
    ] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact' }).eq('user_id', userId),
      supabase.from('calls').select('*', { count: 'exact' }).eq('user_id', userId),
      supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const totalMinutes = calls?.reduce((sum: number, call: DbCall) => sum + (call.duration_seconds || 0), 0) / 60;
    const totalSpent = transactions
      ?.filter((t: DbWalletTransaction) => t.transaction_type === 'call_charge')
      ?.reduce((sum: number, t: DbWalletTransaction) => sum + parseFloat(t.amount_usd.toString()), 0);

    return NextResponse.json({
      user,
      stats: {
        agent_count: agentCount || 0,
        call_count: callCount || 0,
        total_minutes: Math.round(totalMinutes || 0),
        total_spent: totalSpent || 0,
      },
      recent_transactions: transactions || [],
    });
  } catch (error: any) {
    console.error('Error in admin get user API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Insufficient permissions' ? 403 : 500 }
    );
  }
}

// DELETE - Deactivate user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
    const { userId } = await params;

    const supabase = env.createSupabaseAdmin();

    // Deactivate user (don't actually delete)
    const { error } = await supabase
      .from('users')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error deactivating user:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate user' },
        { status: 500 }
      );
    }

    // Log admin activity
    await logAdminActivity({
      action: 'user_deactivated',
      targetUserId: userId,
      targetResourceType: 'user',
      targetResourceId: userId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in admin delete user API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Insufficient permissions' ? 403 : 500 }
    );
  }
}
