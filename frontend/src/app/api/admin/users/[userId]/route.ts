import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminActivity } from '@/lib/admin-auth';
import env from '@/lib/env';

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

    const totalMinutes = calls?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / 60;
    const totalSpent = transactions
      ?.filter((t) => t.transaction_type === 'call_charge')
      ?.reduce((sum, t) => sum + parseFloat(t.amount_usd || '0'), 0);

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
