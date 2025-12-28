'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, CreditCard, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PRICING_TIERS, PLATFORM_FEE, getPricingTier } from '@shared/types'
import type { PricingTier } from '@shared/types'
import { format } from 'date-fns'

interface BillingData {
  currentPlan: string
  monthlyCallCount: number
  monthlySpend: number
  nextBillingDate: string
}

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingData>({
    currentPlan: 'trial',
    monthlyCallCount: 0,
    monthlySpend: 0,
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: calls } = await supabase
        .from('calls')
        .select('cost_usd')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

      const { data: userData } = await supabase
        .from('users')
        .select('current_plan, created_at')
        .eq('id', user.id)
        .single()

      if (calls && userData) {
        const monthlyCallCount = calls.length
        const monthlySpend = calls.reduce((sum, call) => sum + (call.cost_usd || 0), 0)

        const nextBillingDate = new Date(startOfMonth)
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

        setBillingData({
          currentPlan: userData.current_plan,
          monthlyCallCount,
          monthlySpend,
          nextBillingDate: nextBillingDate.toISOString(),
        })
      }
    } catch (error) {
      console.error('Error loading billing data:', error)
    }
  }

  const currentTier = getPricingTier(billingData.monthlyCallCount)
  const estimatedTotal = PLATFORM_FEE + (billingData.monthlyCallCount * currentTier.pricePerCall)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription and view usage
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{billingData.currentPlan}</div>
            <p className="text-xs text-gray-500">
              {currentTier.tierName} Tier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingData.monthlyCallCount}</div>
            <p className="text-xs text-gray-500">
              ${currentTier.pricePerCall.toFixed(2)} per call
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Bill</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${estimatedTotal.toFixed(2)}</div>
            <p className="text-xs text-gray-500">
              Due {format(new Date(billingData.nextBillingDate), 'MMM d')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage-Based Pricing</CardTitle>
          <CardDescription>
            Your rate automatically adjusts based on monthly call volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="font-medium">Platform Fee</span>
              <span className="text-gray-600">${PLATFORM_FEE.toFixed(2)}/month</span>
            </div>

            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.tierName}
                className={`flex justify-between items-center py-3 border-b border-gray-100 ${
                  tier.tierName === currentTier.tierName
                    ? 'bg-blue-50 -mx-6 px-6 rounded-lg'
                    : ''
                }`}
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {tier.tierName}
                    {tier.tierName === currentTier.tierName && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {tier.minCalls}-{tier.maxCalls || '∞'} calls/month
                  </div>
                </div>
                <span className="font-semibold">${tier.pricePerCall.toFixed(2)}/call</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Billing Cycle</CardTitle>
          <CardDescription>
            Breakdown of your usage this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Platform Fee</span>
              <span className="font-medium">${PLATFORM_FEE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">
                Usage ({billingData.monthlyCallCount} calls × ${currentTier.pricePerCall.toFixed(2)})
              </span>
              <span className="font-medium">
                ${(billingData.monthlyCallCount * currentTier.pricePerCall).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
              <span className="font-semibold text-lg">Estimated Total</span>
              <span className="font-bold text-2xl">${estimatedTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Manage your payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-gray-400" />
              <div>
                <div className="font-medium">No payment method</div>
                <div className="text-sm text-gray-600">Add a card to continue after trial</div>
              </div>
            </div>
            <Button>Add Payment Method</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
