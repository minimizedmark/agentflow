'use client';

import { Card } from '@/components/ui/card';
import { formatCurrency, isLowBalance, estimateCallsRemaining } from '@shared/types';
import { AlertCircle, Wallet } from 'lucide-react';
import { WalletTopUpDialog } from './WalletTopUpDialog';

interface WalletBalanceProps {
  balance: number;
  lowBalanceThreshold: number;
  onTopUpSuccess?: () => void;
}

export function WalletBalance({ balance, lowBalanceThreshold, onTopUpSuccess }: WalletBalanceProps) {
  const isLow = isLowBalance(balance, lowBalanceThreshold);
  const estimatedCalls = estimateCallsRemaining(balance);

  return (
    <Card className={`p-6 ${isLow ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wallet className={`h-5 w-5 ${isLow ? 'text-orange-600' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
            {isLow && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Low Balance</span>
              </div>
            )}
          </div>
          <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
          <p className="text-sm text-muted-foreground">
            Estimated {estimatedCalls} calls remaining
          </p>
        </div>
        <WalletTopUpDialog currentBalance={balance} onSuccess={onTopUpSuccess} />
      </div>

      {isLow && (
        <div className="mt-4 text-sm text-orange-600 dark:text-orange-500">
          Your balance is running low. Add funds to ensure uninterrupted service.
        </div>
      )}
    </Card>
  );
}
