import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import env from '@/lib/env';

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
    const avgDuration = recentCalls?.reduce((acc, call) => acc + (call.duration_seconds || 0), 0) / (callsLast24h || 1);

    // Get top users by call count
    const userCallCounts = topUsers?.reduce((acc: any, call: any) => {
      const userId = call.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          email: call.users?.email,
          name: call.users?.name,
          count: 0,
        };
      }
      acc[userId].count++;
      return acc;
    }, {});

    const topUsersList = Object.values(userCallCounts || {})
      .sort((a: any, b: any) => b.count - a.count)
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
