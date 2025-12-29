import { NextRequest, NextResponse } from 'next/server';
import env from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    // Create admin client at runtime, not at build time
    const supabaseAdmin = env.createSupabaseAdmin();

    const { code, userId } = await request.json();

    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Code and userId are required' },
        { status: 400 }
      );
    }

    // Call database function to redeem promo code
    const { data, error } = await supabaseAdmin.rpc('redeem_promo_code', {
      p_user_id: userId,
      p_code: code,
    });

    if (error) {
      console.error('Error redeeming promo code:', error);
      return NextResponse.json(
        { error: 'Failed to redeem promo code' },
        { status: 500 }
      );
    }

    if (!data.success) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      creditAmount: data.credit_amount,
      newBalance: data.new_balance,
      transactionId: data.transaction_id,
    });
  } catch (error: any) {
    console.error('Error in promo code API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
