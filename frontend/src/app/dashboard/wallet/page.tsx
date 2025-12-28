'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { WalletTransaction, formatCurrency } from '@shared/types';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(20);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's wallet balance
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_balance_usd, low_balance_threshold_usd')
        .eq('id', user.id)
        .single();

      if (userData) {
        setBalance(userData.wallet_balance_usd);
        setLowBalanceThreshold(userData.low_balance_threshold_usd);
      }

      // Fetch transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txData) {
        setTransactions(txData.map(tx => ({
          id: tx.id,
          userId: tx.user_id,
          transactionType: tx.transaction_type,
          amountUsd: parseFloat(tx.amount_usd),
          balanceBeforeUsd: parseFloat(tx.balance_before_usd),
          balanceAfterUsd: parseFloat(tx.balance_after_usd),
          description: tx.description,
          metadata: tx.metadata,
          stripePaymentIntentId: tx.stripe_payment_intent_id,
          stripeChargeId: tx.stripe_charge_id,
          relatedCallId: tx.related_call_id,
          status: tx.status,
          createdAt: tx.created_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-5 w-5 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-5 w-5 text-red-600" />;
      case 'refund':
        return <RefreshCw className="h-5 w-5 text-blue-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'refund':
        return 'text-green-600';
      case 'withdrawal':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Manage your account balance and view transaction history</p>
      </div>

      <WalletBalance
        balance={balance}
        lowBalanceThreshold={lowBalanceThreshold}
        onTopUpSuccess={fetchWalletData}
      />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Transaction History</h2>
            <p className="text-sm text-muted-foreground">Recent wallet activity</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground">Your wallet activity will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-full">
                    {getTransactionIcon(tx.transactionType)}
                  </div>
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(tx.createdAt), 'MMM dd, yyyy • hh:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getTransactionColor(tx.transactionType)}`}>
                    {tx.transactionType === 'deposit' || tx.transactionType === 'refund' ? '+' : '-'}
                    {formatCurrency(tx.amountUsd)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Balance: {formatCurrency(tx.balanceAfterUsd)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
