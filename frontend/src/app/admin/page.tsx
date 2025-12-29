'use client';

import { useEffect, useState } from 'react';
import { Users, Phone, DollarSign, TrendingUp, Activity, UserCheck } from 'lucide-react';

interface PlatformStats {
  total_users: number;
  active_users: number;
  total_agents: number;
  active_agents: number;
  total_calls: number;
  calls_today: number;
  total_revenue: number;
  revenue_today: number;
  total_minutes: number;
  avg_call_duration: number;
  growth?: {
    users_last_7_days: number;
    calls_last_24h: number;
    avg_call_duration_24h: number;
  };
  top_users?: Array<{
    email: string;
    name: string;
    count: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-2 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users.toLocaleString(),
      subtitle: `${stats.active_users} active`,
      icon: Users,
      color: 'bg-blue-500',
      growth: stats.growth?.users_last_7_days,
      growthLabel: 'new this week',
    },
    {
      title: 'Total Calls',
      value: stats.total_calls.toLocaleString(),
      subtitle: `${stats.calls_today} today`,
      icon: Phone,
      color: 'bg-green-500',
      growth: stats.growth?.calls_last_24h,
      growthLabel: 'in last 24h',
    },
    {
      title: 'Total Revenue',
      value: `$${parseFloat(stats.total_revenue.toString()).toLocaleString()}`,
      subtitle: `$${parseFloat(stats.revenue_today.toString()).toFixed(2)} today`,
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      title: 'Total Minutes',
      value: Math.round(stats.total_minutes / 60).toLocaleString(),
      subtitle: `${Math.round(stats.avg_call_duration / 60)}min avg`,
      icon: Activity,
      color: 'bg-purple-500',
    },
    {
      title: 'Active Agents',
      value: stats.active_agents.toLocaleString(),
      subtitle: `of ${stats.total_agents} total`,
      icon: UserCheck,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform overview and statistics
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.title}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stat.value}
                        </div>
                      </dd>
                      <dd className="mt-1 text-sm text-gray-500">
                        {stat.subtitle}
                      </dd>
                      {stat.growth !== undefined && (
                        <dd className="mt-1 flex items-center text-sm text-green-600">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          {stat.growth} {stat.growthLabel}
                        </dd>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Users */}
      {stats.top_users && stats.top_users.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Top Users by Call Volume
            </h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calls
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.top_users.map((user, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <a
              href="/admin/users"
              className="relative block p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Manage Users
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  View and manage all platform users
                </p>
              </div>
            </a>
            <a
              href="/admin/promo-codes"
              className="relative block p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="text-center">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Promo Codes
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create and manage promotional codes
                </p>
              </div>
            </a>
            <a
              href="/admin/activity-logs"
              className="relative block p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="text-center">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Activity Logs
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  View admin activity audit trail
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
