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
      className="rounded-2xl p-4 sm:p-5 shadow-xs flex items-start gap-3.5 bg-white border border-gray-100 transition-all hover:shadow-md"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0"
        style={{ background: color + '18' }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
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
    <div className="flex items-end gap-1.5 sm:gap-2 h-40 mt-2">
      {data.map((d, i) => {
        const h = Math.max(6, (d.revenue / max) * 140);
        const date = new Date(d.day);
        const label = days[date.getDay()] || d.day.slice(5);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="relative w-full">
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
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
            <span className="text-[10px] text-gray-400 font-medium">{label}</span>
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
    const fraction = count / total;
    const strokeDash = fraction * circ;
    const strokeDashoffset = -offset;
    offset += strokeDash;
    return {
      status,
      count,
      color: STATUS_COLORS[status] || '#94a3b8',
      strokeDash: `${strokeDash} ${circ - strokeDash}`,
      strokeDashoffset,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center">
      <svg className="w-28 h-28 shrink-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth="16" />
        {slices.map((s) => (
          <circle
            key={s.status}
            cx="50"
            cy="50"
            r={r}
            fill="transparent"
            stroke={s.color}
            strokeWidth="16"
            strokeDasharray={s.strokeDash}
            strokeDashoffset={s.strokeDashoffset}
          />
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full sm:w-auto">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: STATUS_COLORS[status] || '#94a3b8' }}
            />
            <span className="text-gray-600 capitalize">{status}:</span>
            <span className="font-bold text-gray-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<Stats>('/admin/stats').then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading analytics dashboard...</p>
      </div>
    );
  }

  const stats = data || {
    totalRevenue: 0,
    pendingOrderCount: 0,
    totalUsers: 0,
    totalProducts: 0,
    revenueByDay: [],
    topProducts: [],
    recentOrders: [],
    lowStock: [],
    statusBreakdown: {},
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Real-time metrics, order fulfillment, and sales insights</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Total Revenue"
          value={fmt(stats.totalRevenue)}
          icon="💰"
          color="#6366f1"
          sub="Delivered & confirmed orders"
        />
        <KPICard
          title="Pending Orders"
          value={String(stats.pendingOrderCount)}
          icon="⏳"
          color="#f59e0b"
          sub="Requires fulfillment"
        />
        <KPICard
          title="Total Customers"
          value={String(stats.totalUsers)}
          icon="👥"
          color="#10b981"
          sub="Registered accounts"
        />
        <KPICard
          title="Catalog Size"
          value={String(stats.totalProducts)}
          icon="👕"
          color="#ec4899"
          sub="Active products"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Revenue 7-day Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Revenue (Last 7 Days)</h2>
              <p className="text-xs text-gray-400">Daily breakdown of confirmed purchases</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              Sales Trend
            </span>
          </div>
          <RevenueBarChart data={stats.revenueByDay} />
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Order Statuses</h2>
            <p className="text-xs text-gray-400 mb-4">All-time order fulfillment state</p>
          </div>
          <DonutChart data={stats.statusBreakdown} />
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top 5 Products by Revenue */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-gray-100">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Top Selling Items</h2>
          <p className="text-xs text-gray-400 mb-4">Ranked by total earned revenue</p>

          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className="w-5 text-center text-xs font-bold text-gray-400">#{idx + 1}</span>
                  <div className="w-10 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={p.imageUrl || 'https://via.placeholder.com/80x100?text=Item'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.units} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-gray-900">{fmt(p.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Low Stock Inventory</h2>
            {stats.lowStock.length > 0 && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                {stats.lowStock.length} items critical
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">Products with stock under 10 units</p>

          {stats.lowStock.length === 0 ? (
            <div className="py-8 text-center text-emerald-600 text-sm font-medium">
              ✓ All inventory levels are healthy!
            </div>
          ) : (
            <div className="space-y-3">
              {stats.lowStock.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/40 border border-amber-100">
                  <div className="w-10 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={p.imageUrl || 'https://via.placeholder.com/80x100?text=Item'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{p.name}</p>
                    <span className="text-[10px] text-gray-500 font-medium">{p.category}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black px-2 py-1 rounded-md ${
                      p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
