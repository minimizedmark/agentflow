'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Clock, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface Call {
  id: string
  twilio_call_sid: string
  from_number: string
  to_number: string
  direction: 'inbound' | 'outbound'
  status: string
  duration_seconds?: number
  cost_usd?: number
  started_at: string
  ended_at?: string
  transcript?: string
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCalls()
  }, [])

  const loadCalls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setCalls(data || [])
    } catch (error) {
      console.error('Error loading calls:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading calls...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Call Logs</h1>
        <p className="text-gray-600 mt-2">
          View and analyze your call history
        </p>
      </div>

      {calls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Phone className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No calls yet</h3>
            <p className="text-gray-600">Your call history will appear here once you receive calls</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
            <CardDescription>
              Last {calls.length} calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calls.map(call => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full ${
                      call.direction === 'inbound'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {call.direction === 'inbound' ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {call.direction === 'inbound' ? 'From:' : 'To:'}
                        </span>
                        <span className="text-gray-600">
                          {formatPhoneNumber(
                            call.direction === 'inbound' ? call.from_number : call.to_number
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>
                          {format(new Date(call.started_at), 'MMM d, yyyy • h:mm a')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(call.duration_seconds)}
                        </span>
                        {call.cost_usd && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${call.cost_usd.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        call.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : call.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {call.status}
                      </span>
                    </div>
                  </div>

                  {call.transcript && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Transcript:</span> {call.transcript}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
