import { NextRequest, NextResponse } from 'next/server';
import env from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    // Create clients at runtime, not at build time
    const stripe = env.createStripeClient();
    const supabaseAdmin = env.createSupabaseAdmin();

    const { transactionId, userId, reason } = await request.json();

    if (!transactionId || !userId) {
      return NextResponse.json(
        { error: 'Transaction ID and User ID required' },
        { status: 400 }
      );
    }

    // Get transaction details
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (txError || !transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify it's a deposit and has a payment intent
    if (transaction.transaction_type !== 'deposit') {
      return NextResponse.json(
        { error: 'Only deposits can be refunded' },
        { status: 400 }
      );
    }

    if (!transaction.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'No payment intent found for this transaction' },
        { status: 400 }
      );
    }

    // Process refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripe_payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        reason: reason || 'Customer requested refund',
        user_id: userId,
        original_transaction_id: transactionId,
      },
    });

    // Deduct from wallet (reverse the deposit)
    const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
      'deduct_from_wallet',
      {
        p_user_id: userId,
        p_amount: transaction.amount_usd,
        p_description: `Refund for transaction ${transaction.receipt_number || transactionId}`,
        p_call_id: null,
      }
    );

    if (deductError) {
      console.error('Error deducting refund from wallet:', deductError);
      return NextResponse.json(
        { error: 'Failed to process refund in wallet' },
        { status: 500 }
      );
    }

    // Update original transaction status
    await supabaseAdmin
      .from('wallet_transactions')
      .update({ status: 'refunded' })
      .eq('id', transactionId);

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
    });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
