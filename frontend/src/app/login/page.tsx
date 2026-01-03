'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'
import { isSupabaseConfigured, getSupabaseConfigError } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [configError, setConfigError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  // Check configuration on mount
  useEffect(() => {
    const error = getSupabaseConfigError();
    setConfigError(error);
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Check for configuration error first
    if (configError) {
      setError(configError)
      return
    }

    setLoading(true)

    try {
      await signIn({
        email: formData.email,
        password: formData.password,
      })

      router.push('/dashboard')
    } catch (err: any) {
      // Provide more helpful error messages
      let errorMessage = err.message || 'Failed to sign in'
      
      // Handle common fetch errors
      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your Agent12 account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configError && (
            <div className="mb-4 p-4 text-sm text-amber-800 bg-amber-50 rounded-md border border-amber-200">
              <p className="font-semibold mb-1">⚠️ Configuration Required</p>
              <p>{configError}</p>
              <p className="mt-2 text-xs">
                If you're the administrator, please set the required environment variables and restart the application.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                disabled={!!configError}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Your password"
                disabled={!!configError}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !!configError}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
