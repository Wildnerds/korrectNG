'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import type { User } from '@korrectng/shared';
import Cookies from 'js-cookie';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchUsers() {
    const token = Cookies.get('token');
    setLoading(true);
    try {
      const url = roleFilter ? `/admin/users?role=${roleFilter}` : '/admin/users';
      const res = await apiFetch<{ data: User[] }>(url, { token });
      setUsers(res.data?.data || []);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const user = users.find(u => u._id === userId);
    if (!user) return;

    if (!confirm(`Are you sure you want to change ${user.firstName}'s role from "${user.role}" to "${newRole}"?`)) {
      return;
    }

    setChangingRole(userId);
    setMessage(null);

    try {
      const token = Cookies.get('token');
      await apiFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ role: newRole }),
      });

      setMessage({ type: 'success', text: `Role changed to ${newRole} successfully!` });

      // Update local state
      setUsers(users.map(u =>
        u._id === userId ? { ...u, role: newRole as any } : u
      ));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change role' });
    } finally {
      setChangingRole(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Users</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {['', 'customer', 'artisan', 'merchant', 'admin'].map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              roleFilter === role
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            {role || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-brand-light-gray">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold">Name</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Email</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Phone</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Role</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Verified</th>
                <th className="text-left px-6 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 text-brand-gray">{user.email}</td>
                  <td className="px-6 py-4 text-brand-gray">{user.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : user.role === 'artisan'
                            ? 'bg-green-100 text-green-700'
                            : user.role === 'merchant'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isEmailVerified ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-brand-gray">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user._id, e.target.value)}
                      disabled={changingRole === user._id}
                      className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-brand-green disabled:opacity-50"
                    >
                      <option value="customer">Customer</option>
                      <option value="artisan">Artisan</option>
                      <option value="merchant">Merchant</option>
                      <option value="admin">Admin</option>
                    </select>
                    {changingRole === user._id && (
                      <span className="ml-2 text-xs text-brand-gray">Saving...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-10 text-brand-gray">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
