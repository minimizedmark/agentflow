import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify admin access
  const hasAccess = await isAdmin();

  if (!hasAccess) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <nav className="bg-red-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/admin" className="text-xl font-bold">
                Admin Panel
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/admin"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/users"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Users
                </Link>
                <Link
                  href="/admin/promo-codes"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Promo Codes
                </Link>
                <Link
                  href="/admin/activity-logs"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Activity Logs
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-md text-sm font-medium bg-white text-red-600 hover:bg-gray-100"
              >
                Back to Dashboard
              </Link>
            </div>
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
