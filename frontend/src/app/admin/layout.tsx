import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirect=/admin');
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || (userData.role !== 'admin' && userData.role !== 'super_admin')) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">⚙️ Admin Panel</h1>
              <span className="text-sm bg-red-700 px-2 py-1 rounded">
                {userData.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
            <Link
              href="/dashboard"
              className="text-sm hover:text-red-100 underline"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 py-4">
            <Link
              href="/admin"
              className="text-gray-700 hover:text-red-600 font-medium"
            >
              📊 Overview
            </Link>
            <Link
              href="/admin/users"
              className="text-gray-700 hover:text-red-600 font-medium"
            >
              👥 Users
            </Link>
            <Link
              href="/admin/services"
              className="text-gray-700 hover:text-red-600 font-medium"
            >
              🔧 Services
            </Link>
            <Link
              href="/admin/promo-codes"
              className="text-gray-700 hover:text-red-600 font-medium"
            >
              🎟️ Promo Codes
            </Link>
            <Link
              href="/admin/transactions"
              className="text-gray-700 hover:text-red-600 font-medium"
            >
              💰 Transactions
            </Link>
            <Link
              href="/admin/activity"
              className="text-gray-700 hover:text-red-600 font-medium"
            >
              📜 Activity Log
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
