'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PaymentMethod } from '@shared/types';
import { Loader2, CreditCard, Bell, Shield, Percent, Settings as SettingsIcon } from 'lucide-react';
import { PaymentMethodsList } from '@/components/wallet/PaymentMethodsList';
import { PromoCodeInput } from '@/components/wallet/PromoCodeInput';

export default function WalletSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Auto-reload settings
  const [autoReloadEnabled, setAutoReloadEnabled] = useState(false);
  const [autoReloadThreshold, setAutoReloadThreshold] = useState('10.00');
  const [autoReloadAmount, setAutoReloadAmount] = useState('50.00');
  const [autoReloadPaymentMethodId, setAutoReloadPaymentMethodId] = useState<string>('');

  // Spending limits
  const [spendingLimitEnabled, setSpendingLimitEnabled] = useState(false);
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');

  // Low balance threshold
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState('20.00');

  // Notification preferences
  const [emailOnDeposit, setEmailOnDeposit] = useState(true);
  const [emailOnWithdrawal, setEmailOnWithdrawal] = useState(true);
  const [emailOnLowBalance, setEmailOnLowBalance] = useState(true);
  const [emailOnAutoReload, setEmailOnAutoReload] = useState(true);
  const [emailOnRefund, setEmailOnRefund] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  useEffect(() => {
    loadSettings();
    loadPaymentMethods();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/wallet/settings');
      const data = await response.json();

      if (data.settings) {
        setAutoReloadEnabled(data.settings.auto_reload_enabled || false);
        setAutoReloadThreshold(data.settings.auto_reload_threshold_usd?.toString() || '10.00');
        setAutoReloadAmount(data.settings.auto_reload_amount_usd?.toString() || '50.00');
        setAutoReloadPaymentMethodId(data.settings.auto_reload_payment_method_id || '');
        setSpendingLimitEnabled(data.settings.spending_limit_enabled || false);
        setDailyLimit(data.settings.daily_spending_limit_usd?.toString() || '');
        setWeeklyLimit(data.settings.weekly_spending_limit_usd?.toString() || '');
        setMonthlyLimit(data.settings.monthly_spending_limit_usd?.toString() || '');
        setLowBalanceThreshold(data.settings.low_balance_threshold_usd?.toString() || '20.00');
      }

      if (data.notifications) {
        setEmailOnDeposit(data.notifications.email_on_deposit);
        setEmailOnWithdrawal(data.notifications.email_on_withdrawal);
        setEmailOnLowBalance(data.notifications.email_on_low_balance);
        setEmailOnAutoReload(data.notifications.email_on_auto_reload);
        setEmailOnRefund(data.notifications.email_on_refund);
        setDailyDigest(data.notifications.daily_digest_enabled);
        setWeeklyDigest(data.notifications.weekly_digest_enabled);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch('/api/wallet/payment-methods');
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/wallet/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            auto_reload_enabled: autoReloadEnabled,
            auto_reload_threshold_usd: parseFloat(autoReloadThreshold),
            auto_reload_amount_usd: parseFloat(autoReloadAmount),
            auto_reload_payment_method_id: autoReloadPaymentMethodId || null,
            spending_limit_enabled: spendingLimitEnabled,
            daily_spending_limit_usd: dailyLimit ? parseFloat(dailyLimit) : null,
            weekly_spending_limit_usd: weeklyLimit ? parseFloat(weeklyLimit) : null,
            monthly_spending_limit_usd: monthlyLimit ? parseFloat(monthlyLimit) : null,
            low_balance_threshold_usd: parseFloat(lowBalanceThreshold),
          },
          notifications: {
            email_on_deposit: emailOnDeposit,
            email_on_withdrawal: emailOnWithdrawal,
            email_on_low_balance: emailOnLowBalance,
            email_on_auto_reload: emailOnAutoReload,
            email_on_refund: emailOnRefund,
            daily_digest_enabled: dailyDigest,
            weekly_digest_enabled: weeklyDigest,
          },
        }),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl font-bold">Wallet Settings</h1>
        <p className="text-muted-foreground">Manage your wallet preferences and security settings</p>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Payment Methods</CardTitle>
          </div>
          <CardDescription>Manage your saved payment methods for wallet top-ups</CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentMethodsList
            paymentMethods={paymentMethods}
            onUpdate={loadPaymentMethods}
          />
        </CardContent>
      </Card>

      {/* Promo Code */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            <CardTitle>Promotional Code</CardTitle>
          </div>
          <CardDescription>Redeem a promo code for free wallet credit</CardDescription>
        </CardHeader>
        <CardContent>
          <PromoCodeInput />
        </CardContent>
      </Card>

      {/* Auto-Reload */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <CardTitle>Auto-Reload</CardTitle>
          </div>
          <CardDescription>Automatically top up your wallet when balance is low</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-reload">Enable Auto-Reload</Label>
            <Switch
              id="auto-reload"
              checked={autoReloadEnabled}
              onCheckedChange={setAutoReloadEnabled}
            />
          </div>

          {autoReloadEnabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reload-threshold">Trigger When Balance Below</Label>
                  <Input
                    id="reload-threshold"
                    type="number"
                    step="1"
                    min="5"
                    value={autoReloadThreshold}
                    onChange={(e) => setAutoReloadThreshold(e.target.value)}
                    placeholder="10.00"
                  />
                </div>
                <div>
                  <Label htmlFor="reload-amount">Reload Amount</Label>
                  <Input
                    id="reload-amount"
                    type="number"
                    step="5"
                    min="10"
                    value={autoReloadAmount}
                    onChange={(e) => setAutoReloadAmount(e.target.value)}
                    placeholder="50.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reload-payment-method">Payment Method</Label>
                <select
                  id="reload-payment-method"
                  value={autoReloadPaymentMethodId}
                  onChange={(e) => setAutoReloadPaymentMethodId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.cardBrand} •••• {pm.cardLast4}
                      {pm.isDefault && ' (Default)'}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Spending Limits */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Spending Limits</CardTitle>
          </div>
          <CardDescription>Set daily, weekly, or monthly spending caps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="spending-limits">Enable Spending Limits</Label>
            <Switch
              id="spending-limits"
              checked={spendingLimitEnabled}
              onCheckedChange={setSpendingLimitEnabled}
            />
          </div>

          {spendingLimitEnabled && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="daily-limit">Daily Limit ($)</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  step="10"
                  min="0"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  placeholder="No limit"
                />
              </div>
              <div>
                <Label htmlFor="weekly-limit">Weekly Limit ($)</Label>
                <Input
                  id="weekly-limit"
                  type="number"
                  step="10"
                  min="0"
                  value={weeklyLimit}
                  onChange={(e) => setWeeklyLimit(e.target.value)}
                  placeholder="No limit"
                />
              </div>
              <div>
                <Label htmlFor="monthly-limit">Monthly Limit ($)</Label>
                <Input
                  id="monthly-limit"
                  type="number"
                  step="10"
                  min="0"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  placeholder="No limit"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Balance Threshold */}
      <Card>
        <CardHeader>
          <CardTitle>Low Balance Alert</CardTitle>
          <CardDescription>Get notified when your balance drops below this amount</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="low-balance">Low Balance Threshold ($)</Label>
            <Input
              id="low-balance"
              type="number"
              step="5"
              min="0"
              value={lowBalanceThreshold}
              onChange={(e) => setLowBalanceThreshold(e.target.value)}
              placeholder="20.00"
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>Choose which wallet events trigger email notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-deposit">Deposits</Label>
            <Switch
              id="email-deposit"
              checked={emailOnDeposit}
              onCheckedChange={setEmailOnDeposit}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-withdrawal">Withdrawals (Call Costs)</Label>
            <Switch
              id="email-withdrawal"
              checked={emailOnWithdrawal}
              onCheckedChange={setEmailOnWithdrawal}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-low-balance">Low Balance Warnings</Label>
            <Switch
              id="email-low-balance"
              checked={emailOnLowBalance}
              onCheckedChange={setEmailOnLowBalance}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-auto-reload">Auto-Reload Events</Label>
            <Switch
              id="email-auto-reload"
              checked={emailOnAutoReload}
              onCheckedChange={setEmailOnAutoReload}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-refund">Refunds</Label>
            <Switch
              id="email-refund"
              checked={emailOnRefund}
              onCheckedChange={setEmailOnRefund}
            />
          </div>

          <hr className="my-4" />

          <div className="flex items-center justify-between">
            <Label htmlFor="daily-digest">Daily Activity Digest</Label>
            <Switch
              id="daily-digest"
              checked={dailyDigest}
              onCheckedChange={setDailyDigest}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="weekly-digest">Weekly Summary Report</Label>
            <Switch
              id="weekly-digest"
              checked={weeklyDigest}
              onCheckedChange={setWeeklyDigest}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}
