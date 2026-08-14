import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  totalSpend: number;
  orders?: { id: string; status: string; totalAmount: number; createdAt: string }[];
}

function fmt(cents: number) { return `₹${(cents / 100).toFixed(0)}`; }

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const colors = [
    'from-indigo-400 to-purple-500',
    'from-pink-400 to-rose-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-blue-400 to-cyan-500',
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
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

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', search],
    queryFn: () => api.get<AdminUser[]>('/admin/users', { params: search ? { search } : {} }).then((r) => r.data),
  });

  const { data: userDetail, isLoading: loadingDetail } = useQuery<AdminUser>({
    queryKey: ['admin-user', selectedUserId],
    queryFn: () => api.get<AdminUser>(`/admin/users/${selectedUserId}`).then((r) => r.data),
    enabled: !!selectedUserId,
  });

  async function handleRoleChange(userId: string, currentRole: 'user' | 'admin') {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const label = newRole === 'admin' ? 'promote to Admin' : 'demote to User';
    if (!confirm(`Are you sure you want to ${label}?`)) return;
    setChangingRole(userId);
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Role change failed');
    } finally {
      setChangingRole(null);
    }
  }

  const selectedUser = (users || []).find((u) => u.id === selectedUserId);

  return (
    <div className="p-6 space-y-5">
      {/* Header + Search */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{(users || []).length} registered accounts</p>
        </div>
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            placeholder="Search by name or email…"
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white w-56"
          />
          <button
            onClick={() => setSearch(searchInput)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
          {search && (
            <button onClick={() => { setSearch(''); setSearchInput(''); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-gray-200">
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#f8fafc' }}>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Role</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Spent</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Joined</th>
                  <th className="text-center px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(users || []).map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id === selectedUserId ? null : user.id)}
                    className={`cursor-pointer hover:bg-slate-50 transition-colors ${selectedUserId === user.id ? 'bg-indigo-50/50 border-l-2 border-l-indigo-400' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} />
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-semibold text-emerald-700">
                        {user.totalSpend > 0 ? fmt(user.totalSpend) : <span className="text-gray-300 font-normal">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRoleChange(user.id, user.role)}
                        disabled={changingRole === user.id}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 ${
                          user.role === 'admin'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        }`}
                      >
                        {changingRole === user.id ? '…' : user.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
                {(users || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-gray-400">
                      <div className="text-4xl mb-2">👥</div>
                      <p>No users found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* User Detail Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!selectedUserId ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 p-6">
              <div className="text-5xl mb-3">👆</div>
              <p className="text-sm text-center">Click on a user to view their order history</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : userDetail ? (
            <div>
              {/* User Header */}
              <div className="p-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)' }}>
                <div className="flex items-center gap-3">
                  <Avatar name={userDetail.name} size="lg" />
                  <div>
                    <h3 className="font-bold text-gray-900">{userDetail.name}</h3>
                    <p className="text-xs text-gray-500">{userDetail.email}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      userDetail.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {userDetail.role === 'admin' ? '👑 Admin' : '👤 User'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-xl p-2.5 text-center">
                    <p className="text-lg font-bold text-gray-900">{userDetail.orders?.length || 0}</p>
                    <p className="text-[10px] text-gray-400">Orders</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 text-center">
                    <p className="text-lg font-bold text-emerald-700">
                      {selectedUser?.totalSpend ? fmt(selectedUser.totalSpend) : '—'}
                    </p>
                    <p className="text-[10px] text-gray-400">Total Spent</p>
                  </div>
                </div>
              </div>

              {/* Orders list */}
              <div className="p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order History</h4>
                {!userDetail.orders || userDetail.orders.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {userDetail.orders.map((order) => (
                      <li key={order.id} className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-gray-900">{fmt(order.totalAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                            {order.status}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
