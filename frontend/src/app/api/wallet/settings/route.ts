import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch wallet settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user settings
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        auto_reload_enabled,
        auto_reload_threshold_usd,
        auto_reload_amount_usd,
        auto_reload_payment_method_id,
        daily_spending_limit_usd,
        weekly_spending_limit_usd,
        monthly_spending_limit_usd,
        spending_limit_enabled,
        low_balance_threshold_usd
      `)
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    // Get notification preferences
    const { data: notifPrefs, error: notifError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // If no preferences exist, create defaults
    if (notifError && notifError.code === 'PGRST116') {
      const { data: newPrefs } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.id })
        .select()
        .single();

      return NextResponse.json({
        settings: userData,
        notifications: newPrefs,
      });
    }

    return NextResponse.json({
      settings: userData,
      notifications: notifPrefs,
    });
  } catch (error: any) {
    console.error('Error fetching wallet settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update wallet settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings, notifications } = body;

    // Update user settings
    if (settings) {
      const { error } = await supabase
        .from('users')
        .update(settings)
        .eq('id', user.id);

      if (error) throw error;
    }

    // Update notification preferences
    if (notifications) {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...notifications,
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating wallet settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
