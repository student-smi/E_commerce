import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface Stats {
  totalRevenue: number;
  pendingOrderCount: number;
  totalUsers: number;
  totalProducts: number;
}

function KPICard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border-l-4 ${color}`}>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<Stats>('/admin/stats').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={`$${((stats?.totalRevenue || 0) / 100).toFixed(2)}`}
          color="border-green-500"
        />
        <KPICard
          title="Pending Orders"
          value={String(stats?.pendingOrderCount || 0)}
          color="border-yellow-500"
        />
        <KPICard
          title="Total Users"
          value={String(stats?.totalUsers || 0)}
          color="border-blue-500"
        />
        <KPICard
          title="Total Products"
          value={String(stats?.totalProducts || 0)}
          color="border-purple-500"
        />
      </div>
    </div>
  );
}
