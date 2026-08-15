import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:   'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped:   'bg-purple-100 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '⏳', confirmed: '✅', shipped: '🚚', delivered: '📬', cancelled: '❌',
};

interface OrderItem {
  productId: string;
  name: string;
  imageUrl: string;
  quantity: number;
  priceAtPurchase: number;
}

interface AdminOrder {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

function fmt(cents: number) { return `₹${(cents / 100).toFixed(0)}`; }

function OrderItemsRow({ orderId }: { orderId: string }) {
  const { data: items, isLoading } = useQuery<OrderItem[]>({
    queryKey: ['order-items', orderId],
    queryFn: () => api.get<OrderItem[]>(`/admin/orders/${orderId}/items`).then((r) => r.data),
  });

  if (isLoading) return (
    <div className="px-4 py-3 bg-indigo-50/50 flex items-center gap-2 text-xs text-gray-500">
      <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      Loading item details…
    </div>
  );

  return (
    <div className="p-3 bg-slate-50 border-t border-gray-100">
      <div className="flex flex-wrap gap-2.5">
        {(items || []).map((item) => (
          <div key={item.productId} className="flex items-center gap-2 bg-white border border-gray-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <div className="w-7 h-9 bg-gray-100 rounded overflow-hidden shrink-0">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">{item.name}</p>
              <p className="text-[10px] text-gray-500">Qty: {item.quantity} · {fmt(item.priceAtPurchase)}</p>
            </div>
          </div>
        ))}
        {(!items || items.length === 0) && (
          <p className="text-xs text-gray-400">No items found</p>
        )}
      </div>
    </div>
  );
}

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>('confirmed');
  const [bulking, setBulking] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', filterStatus, search],
    queryFn: () =>
      api.get('/admin/orders', { params: { status: filterStatus || undefined, search: search || undefined, limit: 50 } })
        .then((r) => r.data),
  });

  const orders: AdminOrder[] = data?.orders || [];

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setUpdating(orderId);
    try {
      await api.patch(`/admin/orders/${orderId}`, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch {
      alert('Status update failed');
    } finally {
      setUpdating(null);
    }
  }

  async function handleBulkUpdate() {
    if (selected.size === 0) return;
    setBulking(true);
    try {
      await api.patch('/admin/orders/bulk', { orderIds: Array.from(selected), status: bulkStatus });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelected(new Set());
    } catch {
      alert('Bulk update failed');
    } finally {
      setBulking(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Order Management</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Track orders, update statuses, and fulfill customer requests</p>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="flex gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={() => setSearch(searchInput)}
            className="bg-black text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-800 shrink-0"
          >
            Search
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === '' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({data?.total || 0})
          </button>
          {STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors capitalize ${
                filterStatus === st ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {STATUS_ICONS[st]} {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="bg-indigo-600 text-white rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-1">
          <span className="text-xs sm:text-sm font-semibold">
            {selected.size} order{selected.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
              className="bg-white/20 text-white text-xs sm:text-sm rounded-xl px-3 py-1.5 font-medium border border-white/30 focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="text-gray-900 capitalize">
                  Set to {s}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={bulking}
              className="bg-white text-indigo-700 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-white/90 active:scale-95 transition-all shadow-xs"
            >
              {bulking ? 'Applying...' : 'Apply Status'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-white/70 hover:text-white text-xs px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Order List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs sm:text-sm text-gray-500 font-medium">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6">
          <span className="text-4xl mb-2 block">📦</span>
          <p className="font-bold text-gray-900">No orders found</p>
          <p className="text-xs text-gray-400 mt-1">Try changing filter status or clear search query.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View & Mobile Cards */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 items-center">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selected.size === orders.length && orders.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-black focus:ring-black"
                />
              </div>
              <div className="col-span-3">Order / Customer</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
              {orders.map((o) => {
                const isExp = expanded === o.id;
                const isSel = selected.has(o.id);
                return (
                  <div key={o.id} className="transition-colors hover:bg-gray-50/60">
                    {/* Desktop Row */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-4 items-center text-sm">
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleSelect(o.id)}
                          className="rounded border-gray-300 text-black focus:ring-black"
                        />
                      </div>
                      <div className="col-span-3">
                        <p className="font-bold text-gray-900">{o.user?.name || 'Guest'}</p>
                        <p className="text-xs text-gray-400 truncate">{o.user?.email}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">#{o.id.slice(0, 8)}</p>
                      </div>
                      <div className="col-span-2 text-xs text-gray-600">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </div>
                      <div className="col-span-2 font-bold text-gray-900">
                        {fmt(o.totalAmount)}
                      </div>
                      <div className="col-span-2">
                        <select
                          value={o.status}
                          disabled={updating === o.id}
                          onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-xl border capitalize focus:outline-none ${STATUS_STYLES[o.status]}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_ICONS[s]} {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          onClick={() => setExpanded(isExp ? null : o.id)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
                        >
                          {isExp ? 'Hide Items' : 'View Items'}
                        </button>
                      </div>
                    </div>

                    {/* Mobile Card Row */}
                    <div className="md:hidden p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleSelect(o.id)}
                            className="rounded border-gray-300 text-black focus:ring-black h-4 w-4"
                          />
                          <div>
                            <p className="font-bold text-sm text-gray-900">{o.user?.name || 'Customer'}</p>
                            <p className="text-xs text-gray-400 truncate">{o.user?.email}</p>
                          </div>
                        </div>
                        <span className="font-extrabold text-sm text-gray-900">{fmt(o.totalAmount)}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                        <span className="font-mono">#{o.id.slice(0, 8)}</span>
                        <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        <select
                          value={o.status}
                          disabled={updating === o.id}
                          onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border capitalize focus:outline-none flex-1 ${STATUS_STYLES[o.status]}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_ICONS[s]} {s}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setExpanded(isExp ? null : o.id)}
                          className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl whitespace-nowrap"
                        >
                          {isExp ? 'Hide' : 'Items'}
                        </button>
                      </div>
                    </div>

                    {/* Expand Items accordion */}
                    {isExp && <OrderItemsRow orderId={o.id} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
