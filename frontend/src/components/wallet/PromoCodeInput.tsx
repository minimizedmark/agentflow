'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Check, X } from 'lucide-react';
import { formatCurrency } from '@shared/types';
import { supabase } from '@/lib/supabase';

export function PromoCodeInput() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);

  const handleRedeem = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/wallet/promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem code');
      }

      setCreditAmount(data.creditAmount);
      setSuccess(true);
      setCode('');

      // Refresh page after 2 seconds to show updated balance
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to redeem promo code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter promo code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={loading || success}
          className="flex-1"
        />
        <Button
          onClick={handleRedeem}
          disabled={!code.trim() || loading || success}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redeeming...
            </>
          ) : (
            'Redeem'
          )}
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-md">
          <Check className="h-5 w-5" />
          <span>
            Promo code redeemed! {formatCurrency(creditAmount)} added to your wallet.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-md">
          <X className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
