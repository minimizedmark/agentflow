import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
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

interface DbCallWithUser extends DbCall {
  users?: {
    email?: string;
    name?: string;
  };
}

interface UserCallSummary {
  userId: string;
  email: string;
  name: string;
  count: number;
}

export async function GET() {
  try {
    // Verify admin authentication
    await requireAdmin();

    const supabase = env.createSupabaseAdmin();

    // Get platform statistics
    const { data: stats, error } = await supabase.rpc('get_platform_stats');

    if (error) {
      console.error('Error fetching platform stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Get additional metrics
    const [
      { data: recentUsers },
      { data: recentCalls },
      { data: topUsers },
    ] = await Promise.all([
      // Users registered in last 7 days
      supabase
        .from('users')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),

      // Calls in last 24 hours
      supabase
        .from('calls')
        .select('*')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false }),

      // Top users by call volume
      supabase
        .from('calls')
        .select('user_id, users!inner(email, name)')
        .not('user_id', 'is', null)
        .limit(10),
    ]);

    // Calculate user growth
    const usersLast7Days = recentUsers?.length || 0;

    // Calculate call metrics
    const callsLast24h = recentCalls?.length || 0;
    const avgDuration = recentCalls?.reduce((acc: number, call: DbCall) => acc + (call.duration_seconds || 0), 0) / (callsLast24h || 1);

    // Get top users by call count
    const userCallCounts = topUsers?.reduce((acc: Record<string, UserCallSummary>, call: DbCallWithUser) => {
      const userId = call.user_id;
      if (!userId) return acc;
      
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          email: call.users?.email || '',
          name: call.users?.name || '',
          count: 0,
        };
      }
      acc[userId].count++;
      return acc;
    }, {} as Record<string, UserCallSummary>);

    const topUsersList = (Object.values(userCallCounts || {}) as UserCallSummary[])
      .sort((a: UserCallSummary, b: UserCallSummary) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      ...stats[0],
      growth: {
        users_last_7_days: usersLast7Days,
        calls_last_24h: callsLast24h,
        avg_call_duration_24h: Math.round(avgDuration),
      },
      top_users: topUsersList,
    });
  } catch (error: any) {
    console.error('Error in admin stats API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Insufficient permissions' ? 403 : 500 }
    );
  }
}
