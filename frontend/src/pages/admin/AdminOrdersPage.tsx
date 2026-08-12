import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped:   'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface AdminOrder {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', filterStatus],
    queryFn: () =>
      api.get('/admin/orders', { params: filterStatus ? { status: filterStatus } : {} })
        .then((r) => r.data),
  });

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Order ID</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
                <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.orders || []).map((order: AdminOrder) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    #{order.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.user.name}</p>
                    <p className="text-xs text-gray-500">{order.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    ${(order.totalAmount / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={order.status}
                      disabled={updating === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_STYLES[order.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {(data?.orders || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">No orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
