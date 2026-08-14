import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

const STATUS_COLORS: Record<string, string> = {
  pending:   '#f59e0b',
  confirmed: '#3b82f6',
  shipped:   '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

interface Stats {
  totalRevenue: number;
  pendingOrderCount: number;
  totalUsers: number;
  totalProducts: number;
  revenueByDay: { day: string; revenue: number }[];
  topProducts: { id: string; name: string; imageUrl: string; category: string; revenue: number; units: number }[];
  recentOrders: { id: string; status: string; totalAmount: number; createdAt: string; user: { name: string; email: string } }[];
  lowStock: { id: string; name: string; stock: number; category: string; imageUrl: string }[];
  statusBreakdown: Record<string, number>;
}

function fmt(cents: number) {
  return `₹${(cents / 100).toFixed(0)}`;
}

function KPICard({ title, value, icon, color, sub }: { title: string; value: string; icon: string; color: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl p-5 shadow-sm flex items-start gap-4"
      style={{ background: 'white', borderTop: `4px solid ${color}` }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: color + '18' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RevenueBarChart({ data }: { data: { day: string; revenue: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No revenue data yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.revenue), 1);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex items-end gap-2 h-40 mt-2">
      {data.map((d, i) => {
        const h = Math.max(4, (d.revenue / max) * 140);
        const date = new Date(d.day);
        const label = days[date.getDay()] || d.day.slice(5);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full">
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {fmt(d.revenue)}
              </div>
              <div
                className="w-full rounded-t-lg transition-all duration-300"
                style={{
                  height: `${h}px`,
                  background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)',
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return <div className="text-gray-400 text-sm text-center py-4">No orders yet</div>;

  let offset = 0;
  const r = 40;
  const circ = 2 * Math.PI * r;

  const slices = entries.map(([status, count]) => {
    const pct = count / total;
    const dash = pct * circ;
    const gap = circ - dash;
    const slice = { status, count, dash, gap, offset, color: STATUS_COLORS[status] || '#94a3b8' };
    offset += dash;
    return slice;
  });

  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        {slices.map((s, i) => (
          <circle
            key={i}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 50 50)"
          />
        ))}
        <text x="50" y="54" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e293b">{total}</text>
      </svg>
      <div className="space-y-1.5">
        {slices.map((s) => (
          <div key={s.status} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-gray-600 capitalize">{s.status}</span>
            <span className="text-xs font-semibold text-gray-900 ml-auto pl-2">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<Stats>('/admin/stats').then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" icon="💰" color="#10b981" value={fmt(stats?.totalRevenue || 0)} sub="Confirmed + Delivered" />
        <KPICard title="Pending Orders" icon="⏳" color="#f59e0b" value={String(stats?.pendingOrderCount || 0)} sub="Awaiting processing" />
        <KPICard title="Total Users" icon="👥" color="#3b82f6" value={String(stats?.totalUsers || 0)} sub="Registered accounts" />
        <KPICard title="Total Products" icon="👕" color="#8b5cf6" value={String(stats?.totalProducts || 0)} sub="In catalog" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-800">Revenue (Last 7 Days)</h2>
            <span className="text-xs text-indigo-500 font-medium bg-indigo-50 px-2 py-0.5 rounded-full">7d</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">Daily revenue from confirmed orders</p>
          <RevenueBarChart data={stats?.revenueByDay || []} />
        </div>

        {/* Status Donut */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Order Status</h2>
          <p className="text-xs text-gray-400 mb-4">Breakdown of all orders</p>
          <DonutChart data={stats?.statusBreakdown || {}} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {(stats?.recentOrders || []).length === 0 && (
              <p className="text-sm text-gray-400">No orders yet</p>
            )}
            {(stats?.recentOrders || []).map((o) => (
              <div key={o.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {o.user.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{o.user.name}</p>
                  <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600'}`}>
                  {o.status}
                </span>
                <span className="text-sm font-bold text-gray-900 shrink-0">{fmt(o.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Top Products */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Top Products</h2>
            <div className="space-y-3">
              {(stats?.topProducts || []).length === 0 && (
                <p className="text-sm text-gray-400">No sales yet</p>
              )}
              {(stats?.topProducts || []).map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-300 w-4">#{i + 1}</span>
                  <div className="w-8 h-10 rounded bg-gray-100 overflow-hidden shrink-0">
                    <img src={p.imageUrl || ''} alt={p.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.units} sold</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">{fmt(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alert */}
          {(stats?.lowStock || []).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-red-400">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>⚠️</span> Low Stock Alert
              </h2>
              <div className="space-y-2">
                {(stats?.lowStock || []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <p className="text-xs text-gray-700 truncate flex-1">{p.name}</p>
                    <span className={`text-xs font-bold ml-2 px-1.5 py-0.5 rounded ${p.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                      {p.stock === 0 ? 'OUT' : `${p.stock} left`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
