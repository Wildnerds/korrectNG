'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import type { User } from '@korrectng/shared';
import Cookies from 'js-cookie';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
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
    fetchUsers();
  }, [roleFilter]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Users</h1>

      <div className="flex gap-2 mb-6">
        {['', 'customer', 'artisan', 'admin'].map((role) => (
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
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-t">
                  <td className="px-6 py-4">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 text-brand-gray">{user.email}</td>
                  <td className="px-6 py-4 text-brand-gray">{user.phone}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : user.role === 'artisan'
                            ? 'bg-green-100 text-green-700'
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
