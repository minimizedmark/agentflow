'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { WalletTransaction, formatCurrency } from '@shared/types';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, DollarSign, Download, Filter, Settings, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(20);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('wallet_balance_usd, low_balance_threshold_usd')
        .eq('id', user.id)
        .single();

      if (userData) {
        setBalance(userData.wallet_balance_usd);
        setLowBalanceThreshold(userData.low_balance_threshold_usd);
      }

      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (txData) {
        const mapped = txData.map(tx => ({
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
          notes: tx.notes,
          tags: tx.tags,
          promoCodeId: tx.promo_code_id,
          isAutoReload: tx.is_auto_reload,
          receiptUrl: tx.receipt_url,
          receiptNumber: tx.receipt_number,
          createdAt: tx.created_at,
        }));
        setTransactions(mapped);
        setFilteredTransactions(mapped);
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

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.transactionType === typeFilter);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(tx => new Date(tx.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(tx => new Date(tx.createdAt) <= new Date(endDate + 'T23:59:59'));
    }

    setFilteredTransactions(filtered);
  }, [searchQuery, typeFilter, startDate, endDate, transactions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });

      const response = await fetch(`/api/wallet/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallet-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting transactions:', error);
      alert('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
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

  const activeFiltersCount = [typeFilter !== 'all', startDate, endDate, searchQuery].filter(Boolean).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Manage your account balance and view transaction history</p>
        </div>
        <Link href="/dashboard/wallet/settings">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Wallet Settings
          </Button>
        </Link>
      </div>

      <WalletBalance
        balance={balance}
        lowBalanceThreshold={lowBalanceThreshold}
        onTopUpSuccess={fetchWalletData}
      />

      <Card className="p-6">
        <div className="space-y-4">
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Transaction History</h2>
              <p className="text-sm text-muted-foreground">
                {filteredTransactions.length} of {transactions.length} transactions
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting || filteredTransactions.length === 0}
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="refund">Refunds</option>
              <option value="adjustment">Adjustments</option>
            </select>

            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          )}

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {transactions.length === 0 ? 'No transactions yet' : 'No transactions match your filters'}
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-muted rounded-full">
                      {getTransactionIcon(tx.transactionType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tx.description}</p>
                        {tx.isAutoReload && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                            Auto-reload
                          </span>
                        )}
                        {tx.promoCodeId && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                            Promo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.createdAt), 'MMM dd, yyyy • hh:mm a')}
                        {tx.receiptNumber && ` • ${tx.receiptNumber}`}
                      </p>
                      {tx.notes && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          Note: {tx.notes}
                        </p>
                      )}
                      {tx.tags && tx.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {tx.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
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
        </div>
      </Card>
    </div>
  );
}
