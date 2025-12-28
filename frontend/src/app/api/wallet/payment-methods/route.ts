import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// GET - List payment methods
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ paymentMethods: data });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add new payment method
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentMethodId, setAsDefault } = await request.json();

    // Get or create Stripe customer
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    let customerId = userData?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData?.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Get payment method details
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

    // If setting as default, unset other defaults
    if (setAsDefault) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set as default in Stripe
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Save to database
    const { data: savedPM, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        stripe_payment_method_id: paymentMethodId,
        stripe_customer_id: customerId,
        card_brand: pm.card?.brand,
        card_last4: pm.card?.last4,
        card_exp_month: pm.card?.exp_month,
        card_exp_year: pm.card?.exp_year,
        billing_name: pm.billing_details?.name,
        billing_email: pm.billing_details?.email,
        billing_address: pm.billing_details?.address,
        is_default: setAsDefault || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ paymentMethod: savedPM });
  } catch (error: any) {
    console.error('Error adding payment method:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove payment method
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pmId = searchParams.get('id');

    if (!pmId) {
      return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
    }

    // Get payment method
    const { data: pm } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('id', pmId)
      .eq('user_id', user.id)
      .single();

    if (!pm) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
    }

    // Detach from Stripe
    try {
      await stripe.paymentMethods.detach(pm.stripe_payment_method_id);
    } catch (err) {
      console.error('Error detaching from Stripe:', err);
    }

    // Mark as inactive in database
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_active: false, is_default: false })
      .eq('id', pmId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing payment method:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
