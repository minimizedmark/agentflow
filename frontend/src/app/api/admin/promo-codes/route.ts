import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, logAdminActivity } from '@/lib/admin-auth';
import env from '@/lib/env';

// GET - List all promo codes
export async function GET() {
  try {
    await requireAdmin();

    const supabase = env.createSupabaseAdmin();

    const { data: promoCodes, error } = await supabase
      .from('promo_codes')
      .select(`
        *,
        created_by_user:users!promo_codes_created_by_fkey(email, name),
        redemptions:promo_code_redemptions(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promo codes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch promo codes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ promoCodes });
  } catch (error: any) {
    console.error('Error in admin promo codes API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Insufficient permissions' ? 403 : 500 }
    );
  }
}

// POST - Create new promo code
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { code, creditAmount, usageLimit, expiresAt } = await request.json();

    if (!code || !creditAmount) {
      return NextResponse.json(
        { error: 'Code and credit amount are required' },
        { status: 400 }
      );
    }

    if (creditAmount <= 0) {
      return NextResponse.json(
        { error: 'Credit amount must be positive' },
        { status: 400 }
      );
    }

    const supabase = env.createSupabaseAdmin();

    // Call database function to create promo code
    const { data, error } = await supabase.rpc('create_promo_code', {
      p_admin_user_id: admin.id,
      p_code: code,
      p_credit_amount: creditAmount,
      p_usage_limit: usageLimit || null,
      p_expires_at: expiresAt || null,
    });

    if (error) {
      console.error('Error creating promo code:', error);

      if (error.message?.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'Promo code already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create promo code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      promoCodeId: data,
    });
  } catch (error: any) {
    console.error('Error in admin create promo code API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Insufficient permissions' ? 403 : 500 }
    );
  }
}

// PATCH - Update promo code
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const { promoCodeId, updates } = await request.json();

    if (!promoCodeId) {
      return NextResponse.json(
        { error: 'Promo code ID required' },
        { status: 400 }
      );
    }

    const supabase = env.createSupabaseAdmin();

    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', promoCodeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating promo code:', error);
      return NextResponse.json(
        { error: 'Failed to update promo code' },
        { status: 500 }
      );
    }

    await logAdminActivity({
      action: 'promo_code_updated',
      targetResourceType: 'promo_code',
      targetResourceId: promoCodeId,
      details: { updates },
    });

    return NextResponse.json({ promoCode });
  } catch (error: any) {
    console.error('Error in admin update promo code API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Insufficient permissions' ? 403 : 500 }
    );
  }
}
