import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import env from '@/lib/env';

export async function POST(request: NextRequest) {
  // Create clients at runtime, not at build time
  const stripe = env.createStripeClient();
  const supabaseAdmin = env.createSupabaseAdmin();

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.stripe.webhookSecret
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Check if this is a wallet top-up
        if (paymentIntent.metadata.type === 'wallet_topup') {
          const userId = paymentIntent.metadata.user_id;
          const amount = paymentIntent.amount / 100; // Convert from cents

          // Add funds to wallet using the add_to_wallet function
          const { data, error } = await supabaseAdmin.rpc('add_to_wallet', {
            p_user_id: userId,
            p_amount: amount,
            p_description: `Wallet top-up via Stripe`,
            p_stripe_payment_intent_id: paymentIntent.id,
            p_stripe_charge_id: paymentIntent.latest_charge as string || null,
          });

          if (error) {
            console.error('Error adding funds to wallet:', error);
            throw error;
          }

          console.log('Wallet topped up successfully:', data);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', paymentIntent.id);
        // You could send a notification to the user here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
