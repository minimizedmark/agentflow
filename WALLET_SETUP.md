# Wallet System Setup Guide

This guide will help you set up and configure the prepaid wallet system for Agent12.

## Overview

The wallet system implements a prepaid billing model where users must maintain a positive balance to use the platform. Costs are deducted automatically after each call.

## Features

- ✅ Prepaid wallet balance system
- ✅ Stripe integration for secure payments
- ✅ Real-time balance deduction after calls
- ✅ Low balance warnings and notifications
- ✅ Complete transaction history
- ✅ Automatic balance checks before calls
- ✅ Multiple top-up amount options

## Database Setup

### 1. Run the wallet migration

Apply the wallet system migration to your Supabase database:

```bash
psql -h your-supabase-host -U postgres -d postgres -f database/migrations/002_add_wallet_system.sql
```

Or use the Supabase SQL Editor to run the contents of `database/migrations/002_add_wallet_system.sql`.

### 2. Verify the migration

Check that the following were created:
- `wallet_balance_usd` column in `users` table
- `low_balance_threshold_usd` column in `users` table
- `wallet_transactions` table
- Database functions: `deduct_from_wallet`, `add_to_wallet`, `has_sufficient_balance`
- Trigger: `check_balance_before_call_trigger`

## Stripe Configuration

### 1. Create a Stripe account

If you don't have one, sign up at [stripe.com](https://stripe.com).

### 2. Get your API keys

1. Go to Stripe Dashboard → Developers → API keys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### 3. Set up webhook endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/wallet/webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

### 4. Configure environment variables

Update your `.env` file:

```env
# Frontend .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: Never commit your secret keys to version control!

## Installation

### 1. Install dependencies

```bash
cd frontend
npm install
```

This will install the new Stripe dependencies:
- `@stripe/stripe-js`
- `@stripe/react-stripe-js`
- `@supabase/ssr`

### 2. Build the shared types

```bash
cd shared
npm run build
```

### 3. Start the application

```bash
# Terminal 1: Frontend
cd frontend
npm run dev

# Terminal 2: WebSocket Server
cd websocket-server
npm run dev
```

## Usage

### For Users

1. **Adding Funds**
   - Navigate to Dashboard or Wallet page
   - Click "Add Funds" button
   - Select amount or enter custom amount (minimum $10)
   - Complete payment with Stripe

2. **Viewing Balance**
   - Wallet balance is displayed prominently on the dashboard
   - Navigate to Wallet page for detailed transaction history

3. **Low Balance Warnings**
   - Orange warning appears when balance drops below threshold (default $20)
   - Estimated calls remaining shown based on average cost

4. **Making Calls**
   - Calls are only allowed with minimum balance ($2)
   - Costs are automatically deducted after each call ends
   - Real-time balance updates

### For Administrators

1. **Setting User Balance**

```sql
-- Manually set a user's balance
UPDATE users
SET wallet_balance_usd = 100.00
WHERE id = 'user-uuid-here';
```

2. **Adding Credit (Manual)**

```sql
-- Add credit to a user's wallet
SELECT add_to_wallet(
  p_user_id := 'user-uuid-here',
  p_amount := 50.00,
  p_description := 'Manual credit adjustment',
  p_stripe_payment_intent_id := NULL,
  p_stripe_charge_id := NULL
);
```

3. **Viewing Transactions**

```sql
-- Get all transactions for a user
SELECT * FROM wallet_transactions
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

4. **Checking Balances**

```sql
-- Get all users with low balance
SELECT id, email, wallet_balance_usd, low_balance_threshold_usd
FROM users
WHERE wallet_balance_usd < low_balance_threshold_usd
ORDER BY wallet_balance_usd ASC;
```

## Pricing Configuration

Call costs are calculated as:
```
Cost = (Duration in minutes × $0.05) + (Duration in minutes × $0.013)
     = Duration in minutes × $0.063
```

To modify pricing, update `websocket-server/src/services/call-logger.ts`:

```typescript
// Line ~98
const grokCost = durationMinutes * 0.05;  // Grok Voice API cost
const twilioCost = durationMinutes * 0.013; // Twilio cost
```

## Wallet Top-up Options

Default top-up amounts are configured in `shared/src/types.ts`:

```typescript
export const WALLET_TOPUP_OPTIONS: WalletTopUpOption[] = [
  { amount: 25, label: '$25' },
  { amount: 50, label: '$50', popular: true },
  { amount: 100, label: '$100' },
  { amount: 200, label: '$200' },
  { amount: 500, label: '$500' },
];
```

Modify these values to change the available top-up amounts.

## Testing

### Test in Development Mode

1. Use Stripe test mode keys (they start with `test`)
2. Use test card numbers from [Stripe Testing Docs](https://stripe.com/docs/testing):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

3. Test the webhook locally using Stripe CLI:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/wallet/webhook

# Use the webhook signing secret from the CLI output
```

### Integration Test Checklist

- [ ] User can add funds to wallet
- [ ] Payment success updates balance correctly
- [ ] Transaction appears in history
- [ ] Balance is deducted after call ends
- [ ] Low balance warning appears at threshold
- [ ] Calls are blocked with insufficient balance
- [ ] Webhook handles payment failures gracefully

## Production Deployment

### Before Going Live

1. **Switch to Live Mode**
   - Replace test API keys with live keys
   - Update webhook endpoint to production URL
   - Test with real payments in small amounts

2. **Security Checklist**
   - ✅ All secret keys stored securely (not in code)
   - ✅ HTTPS enabled on production domain
   - ✅ Webhook endpoint validates Stripe signatures
   - ✅ Row Level Security (RLS) enabled on all tables
   - ✅ Service role key only used server-side

3. **Monitoring**
   - Set up alerts for failed payments
   - Monitor webhook delivery in Stripe Dashboard
   - Track low balance users
   - Monitor transaction errors in logs

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is publicly accessible
2. Verify webhook secret is correct
3. Check Stripe Dashboard → Webhooks for delivery attempts
4. Review webhook response codes

### Payment Succeeds But Balance Not Updated

1. Check webhook is configured for `payment_intent.succeeded`
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Check server logs for errors in webhook handler
4. Ensure `add_to_wallet` function exists in database

### Calls Not Deducting Balance

1. Verify `check_balance_before_call_trigger` is active
2. Check `deduct_from_wallet` function exists
3. Review websocket server logs for errors
4. Ensure `user_id` is properly set on calls

### Low Balance Warning Not Showing

1. Check `low_balance_threshold_usd` is set (default: 20)
2. Verify balance is below threshold
3. Clear browser cache and reload
4. Check console for errors loading wallet data

## Support

For issues or questions:
1. Check the [main README](./README.md)
2. Review database migration logs
3. Check application logs for errors
4. Verify environment variables are set correctly

## Next Steps

- [ ] Set up email notifications for low balance
- [ ] Add SMS alerts via Twilio
- [ ] Implement auto-reload when balance is low
- [ ] Add referral credits system
- [ ] Create admin dashboard for balance management
- [ ] Add receipt generation for top-ups
- [ ] Implement spending limits and budgets
