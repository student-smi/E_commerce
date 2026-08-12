import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  orders?: { id: string; status: string; totalAmount: number; createdAt: string }[];
}

export function AdminUsersPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUser[]>('/admin/users').then((r) => r.data),
  });

  const { data: userDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin-user', selectedUserId],
    queryFn: () => api.get<AdminUser>(`/admin/users/${selectedUserId}`).then((r) => r.data),
    enabled: !!selectedUserId,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(users || []).map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedUserId === user.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* User order history panel */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          {!selectedUserId ? (
            <p className="text-gray-400 text-sm text-center py-10">Select a user to view order history</p>
          ) : loadingDetail ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          ) : userDetail ? (
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">{userDetail.name}</h2>
              <p className="text-xs text-gray-500 mb-4">{userDetail.email}</p>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Orders ({userDetail.orders?.length || 0})</h3>
              {userDetail.orders && userDetail.orders.length > 0 ? (
                <ul className="space-y-2">
                  {userDetail.orders.map((order) => (
                    <li key={order.id} className="text-xs border border-gray-200 rounded-lg p-2">
                      <p className="font-mono text-gray-500">#{order.id.slice(0, 8)}</p>
                      <div className="flex justify-between mt-1">
                        <span className="capitalize text-gray-700">{order.status}</span>
                        <span className="font-semibold">${(order.totalAmount / 100).toFixed(2)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">No orders yet</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
