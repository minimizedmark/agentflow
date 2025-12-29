'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, TrendingUp, DollarSign, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { WalletBalance } from '@/components/wallet/WalletBalance'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    activeCalls: 0,
    monthlySpend: 0,
    avgDuration: 0,
  })

  const [walletBalance, setWalletBalance] = useState(0)
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(20)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load wallet balance
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_balance_usd, low_balance_threshold_usd')
        .eq('id', user.id)
        .single()

      if (userData) {
        setWalletBalance(userData.wallet_balance_usd)
        setLowBalanceThreshold(userData.low_balance_threshold_usd)
      }

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: calls } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

      if (calls) {
        const totalCalls = calls.length
        const activeCalls = calls.filter(c => c.status === 'in-progress').length
        const monthlySpend = calls.reduce((sum, call) => sum + (call.cost_usd || 0), 0)
        const avgDuration = calls.length > 0
          ? calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / calls.length
          : 0

        setStats({
          totalCalls,
          activeCalls,
          monthlySpend,
          avgDuration: Math.round(avgDuration),
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's an overview of your voice agents.
        </p>
      </div>

      <WalletBalance
        balance={walletBalance}
        lowBalanceThreshold={lowBalanceThreshold}
        onTopUpSuccess={loadStats}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCalls}</div>
            <p className="text-xs text-gray-500">Right now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlySpend.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Usage charges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}s</div>
            <p className="text-xs text-gray-500">Per call</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Get started with your first voice agent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                1
              </div>
              <div>
                <h3 className="font-medium">Create an Agent</h3>
                <p className="text-sm text-gray-600">
                  Choose from industry templates or create a custom agent
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                2
              </div>
              <div>
                <h3 className="font-medium">Get Your Phone Number</h3>
                <p className="text-sm text-gray-600">
                  We'll provision a dedicated phone number for your agent
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                3
              </div>
              <div>
                <h3 className="font-medium">Start Receiving Calls</h3>
                <p className="text-sm text-gray-600">
                  Your AI agent will answer calls 24/7 automatically
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center py-8">
                No recent calls. Create an agent to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
