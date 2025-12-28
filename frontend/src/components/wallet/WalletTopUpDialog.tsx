'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WALLET_TOPUP_OPTIONS, formatCurrency } from '@shared/types';
import { CheckoutForm } from './CheckoutForm';
import { Wallet } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface WalletTopUpDialogProps {
  currentBalance: number;
  onSuccess?: () => void;
}

export function WalletTopUpDialog({ currentBalance, onSuccess }: WalletTopUpDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError(null);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 10) {
      setSelectedAmount(numValue);
    } else {
      setSelectedAmount(null);
    }
    setError(null);
  };

  const handleContinue = async () => {
    if (!selectedAmount || selectedAmount < 10) {
      setError('Minimum top-up amount is $10');
      return;
    }

    if (selectedAmount > 10000) {
      setError('Maximum top-up amount is $10,000');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: selectedAmount }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setOpen(false);
    setClientSecret(null);
    setSelectedAmount(50);
    setCustomAmount('');
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleCancel = () => {
    setClientSecret(null);
    setError(null);
  };

  const appearance = {
    theme: 'stripe' as const,
  };

  const options = {
    clientSecret: clientSecret || undefined,
    appearance,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Wallet className="h-4 w-4" />
          Add Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Funds to Wallet</DialogTitle>
          <DialogDescription>
            Current balance: <span className="font-semibold text-foreground">{formatCurrency(currentBalance)}</span>
          </DialogDescription>
        </DialogHeader>

        {!clientSecret ? (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Select Amount</Label>
              <div className="grid grid-cols-3 gap-3">
                {WALLET_TOPUP_OPTIONS.map((option) => (
                  <Card
                    key={option.amount}
                    className={`relative p-4 cursor-pointer transition-all hover:border-primary ${
                      selectedAmount === option.amount && !customAmount
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => handleAmountSelect(option.amount)}
                  >
                    {option.popular && (
                      <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <div className="text-center">
                      <div className="text-lg font-bold">{option.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ~{Math.floor(option.amount / 1.5)} calls
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom-amount" className="text-sm font-medium">
                Or Enter Custom Amount
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="custom-amount"
                  type="number"
                  min="10"
                  max="10000"
                  step="1"
                  placeholder="Enter amount (min $10)"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: $10 • Maximum: $10,000
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleContinue}
                disabled={!selectedAmount || loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : `Continue with ${formatCurrency(selectedAmount || 0)}`}
              </Button>
            </div>
          </div>
        ) : (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm
              amount={selectedAmount!}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
