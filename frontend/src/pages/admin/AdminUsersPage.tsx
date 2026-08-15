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
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
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
    <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold shrink-0 shadow-2xs`}>
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Customer Management</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">View shoppers, total spend, order history, and manage roles</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex gap-2 max-w-md">
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

      {/* Grid Layout: User list + User detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* User list */}
        <div className={`bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden ${
          selectedUserId ? 'lg:col-span-7' : 'lg:col-span-12'
        }`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              Customers {users && `(${users.length})`}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Loading customers...</p>
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-16 p-6">
              <span className="text-4xl mb-2 block">👥</span>
              <p className="font-bold text-gray-900">No users found</p>
              <p className="text-xs text-gray-400 mt-1">Try clearing your search query.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((u) => {
                const isSelected = selectedUserId === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(isSelected ? null : u.id)}
                    className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs sm:text-sm text-gray-900 truncate">{u.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900">{fmt(u.totalSpend)}</p>
                      <span className="text-[10px] text-indigo-600 font-medium">
                        {isSelected ? 'Viewing' : 'Details →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User detail pane */}
        {selectedUserId && (
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Customer Profile</h3>
              <button
                onClick={() => setSelectedUserId(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userDetail ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={userDetail.name} size="lg" />
                  <div>
                    <h4 className="font-bold text-base text-gray-900">{userDetail.name}</h4>
                    <p className="text-xs text-gray-400">{userDetail.email}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Joined {new Date(userDetail.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-gray-500 font-bold uppercase">Role</p>
                    <p className="text-xs font-semibold capitalize text-gray-900">{userDetail.role}</p>
                  </div>
                  <button
                    disabled={changingRole === userDetail.id}
                    onClick={() => handleRoleChange(userDetail.id, userDetail.role)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-white transition-colors"
                  >
                    {changingRole === userDetail.id ? 'Updating...' : `Switch to ${userDetail.role === 'admin' ? 'User' : 'Admin'}`}
                  </button>
                </div>

                {/* Orders by this user */}
                <div>
                  <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Order History</h5>
                  {!userDetail.orders || userDetail.orders.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">No orders placed yet</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {userDetail.orders.map((ord) => (
                        <div key={ord.id} className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-gray-500">#{ord.id.slice(0, 8)}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full font-bold capitalize text-[10px] ${STATUS_BADGE[ord.status] || 'bg-gray-100'}`}>
                              {ord.status}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900">{fmt(ord.totalAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
