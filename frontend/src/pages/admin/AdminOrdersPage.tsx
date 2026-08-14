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
    <td colSpan={6} className="px-6 py-4 bg-indigo-50/50">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        Loading items…
      </div>
    </td>
  );

  return (
    <td colSpan={6} className="px-6 py-4 bg-slate-50 border-b border-gray-100">
      <div className="flex flex-wrap gap-3">
        {(items || []).map((item) => (
          <div key={item.productId} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <div className="w-8 h-10 bg-gray-100 rounded overflow-hidden shrink-0">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-800">{item.name}</p>
              <p className="text-[10px] text-gray-400">x{item.quantity} · {fmt(item.priceAtPurchase)}</p>
            </div>
          </div>
        ))}
        {(!items || items.length === 0) && (
          <p className="text-xs text-gray-400">No items found</p>
        )}
      </div>
    </td>
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Bulk update failed');
    } finally {
      setBulking(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage and track all customer orders</p>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {['', ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterStatus === s
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            {s === '' ? '🗂 All' : `${STATUS_ICONS[s as OrderStatus]} ${s.charAt(0).toUpperCase() + s.slice(1)}`}
          </button>
        ))}

        {/* Search */}
        <div className="ml-auto flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            placeholder="Search by name or email…"
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
          <button
            onClick={() => setSearch(searchInput)}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-sm hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">{selected.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
            className="border border-indigo-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button
            onClick={handleBulkUpdate}
            disabled={bulking}
            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {bulking ? 'Updating…' : 'Apply to Selected'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 ml-auto">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead style={{ background: '#f8fafc' }}>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selected.size === orders.length && orders.length > 0} onChange={toggleAll}
                    className="rounded border-gray-300 accent-indigo-600" />
                </th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Total</th>
                <th className="text-center px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <>
                  <tr
                    key={order.id}
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${selected.has(order.id) ? 'bg-indigo-50/40' : ''}`}
                  >
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggleSelect(order.id)}
                        className="rounded border-gray-300 accent-indigo-600" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 transition-transform duration-200">{expanded === order.id ? '▼' : '▶'}</span>
                        <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {order.user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{order.user.name}</p>
                          <p className="text-xs text-gray-400">{order.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                      {fmt(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border cursor-pointer focus:outline-none ${STATUS_STYLES[order.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_ICONS[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr key={`${order.id}-items`}>
                      <OrderItemsRow orderId={order.id} />
                    </tr>
                  )}
                </>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-2">📦</div>
                    <p>No orders found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
