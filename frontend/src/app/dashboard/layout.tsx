'use client'

import { DashboardNav } from '@/components/layout/dashboard-nav'
import { AuthProvider } from '@/contexts/auth-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen bg-gray-50">
        <DashboardNav />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </AuthProvider>
  )
}
