'use client';

import { useState } from 'react';
import { PaymentMethod } from '@shared/types';
import { Button } from '@/components/ui/button';
import { CreditCard, Trash2, Star } from 'lucide-react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethodsListProps {
  paymentMethods: PaymentMethod[];
  onUpdate: () => void;
}

export function PaymentMethodsList({ paymentMethods, onUpdate }: PaymentMethodsListProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    try {
      const response = await fetch(`/api/wallet/payment-methods?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdate();
      } else {
        throw new Error('Failed to remove payment method');
      }
    } catch (error) {
      console.error('Error removing payment method:', error);
      alert('Failed to remove payment method');
    }
  };

  return (
    <div className="space-y-4">
      {paymentMethods.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No payment methods saved yet
        </p>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {pm.cardBrand} •••• {pm.cardLast4}
                    </span>
                    {pm.isDefault && (
                      <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Star className="h-3 w-3 fill-current" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Expires {pm.cardExpMonth}/{pm.cardExpYear}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(pm.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <Elements stripe={stripePromise}>
          <AddPaymentMethodForm
            onSuccess={() => {
              setShowAddForm(false);
              onUpdate();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </Elements>
      ) : (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      )}
    </div>
  );
}

function AddPaymentMethodForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) throw error;

      const response = await fetch('/api/wallet/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          setAsDefault,
        }),
      });

      if (!response.ok) throw new Error('Failed to save payment method');

      onSuccess();
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      alert(error.message || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <div>
        <label className="block text-sm font-medium mb-2">Card Details</label>
        <div className="p-3 border rounded-md">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="set-default"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="set-default" className="text-sm">
          Set as default payment method
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? 'Adding...' : 'Add Card'}
        </Button>
      </div>
    </form>
  );
}
