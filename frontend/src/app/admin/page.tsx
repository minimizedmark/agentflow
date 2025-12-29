'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface PlatformStats {
  total_users: number;
  total_admins: number;
  active_services: number;
  total_revenue_today: number;
  total_revenue_month: number;
  total_revenue_all_time: number;
  transactions_today: number;
  new_users_today: number;
  new_users_month: number;
  promo_codes_active: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const { data, error } = await supabase.rpc('get_platform_overview');

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading platform statistics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Platform Overview</h2>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Today's Revenue"
          value={`$${stats?.total_revenue_today.toFixed(2) || '0.00'}`}
          icon="💵"
          color="green"
        />
        <StatCard
          title="This Month's Revenue"
          value={`$${stats?.total_revenue_month.toFixed(2) || '0.00'}`}
          icon="📈"
          color="blue"
        />
        <StatCard
          title="All-Time Revenue"
          value={`$${stats?.total_revenue_all_time.toFixed(2) || '0.00'}`}
          icon="💰"
          color="purple"
        />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats?.total_users.toString() || '0'}
          icon="👥"
          color="gray"
        />
        <StatCard
          title="New Today"
          value={stats?.new_users_today.toString() || '0'}
          icon="✨"
          color="green"
        />
        <StatCard
          title="New This Month"
          value={stats?.new_users_month.toString() || '0'}
          icon="📊"
          color="blue"
        />
        <StatCard
          title="Admins"
          value={stats?.total_admins.toString() || '0'}
          icon="⚙️"
          color="red"
        />
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Services"
          value={stats?.active_services.toString() || '0'}
          icon="🔧"
          color="indigo"
        />
        <StatCard
          title="Transactions Today"
          value={stats?.transactions_today.toString() || '0'}
          icon="💳"
          color="yellow"
        />
        <StatCard
          title="Active Promo Codes"
          value={stats?.promo_codes_active.toString() || '0'}
          icon="🎟️"
          color="pink"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction href="/admin/users" icon="👥" label="Manage Users" />
          <QuickAction href="/admin/services" icon="🔧" label="Manage Services" />
          <QuickAction href="/admin/promo-codes" icon="🎟️" label="Create Promo" />
          <QuickAction href="/admin/transactions" icon="💰" label="View Transactions" />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'green' | 'blue' | 'purple' | 'gray' | 'red' | 'indigo' | 'yellow' | 'pink';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg border-2 p-6`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-sm font-medium opacity-75">{title}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
    </a>
  );
}
