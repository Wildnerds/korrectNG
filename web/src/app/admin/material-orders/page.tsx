'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';

interface MaterialOrder {
  _id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  platformFee: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  merchantProfile: {
    businessName: string;
  };
  items: {
    productSnapshot: {
      name: string;
    };
    quantity: number;
    totalPrice: number;
  }[];
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
}

export default function MaterialOrdersPage() {
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    completed: 0,
    disputed: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  async function fetchOrders() {
    const token = Cookies.get('token');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: MaterialOrder[]; stats: typeof stats }>(
        `/admin/material-orders?status=${filter}`,
        { token }
      );
      setOrders(res.data?.data || []);
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      preparing: 'bg-purple-100 text-purple-700',
      shipped: 'bg-indigo-100 text-indigo-700',
      delivered: 'bg-teal-100 text-teal-700',
      completed: 'bg-green-100 text-green-700',
      disputed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      refunded: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Material Orders</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs text-brand-gray">Total Orders</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs text-brand-gray">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs text-brand-gray">Paid (In Escrow)</p>
          <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs text-brand-gray">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs text-brand-gray">Disputed</p>
          <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <p className="text-xs text-brand-gray">Platform Revenue</p>
          <p className="text-2xl font-bold text-brand-green">₦{stats.totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'pending', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === s
                ? 'bg-brand-orange text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : orders.length > 0 ? (
        <div className="bg-white rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Order #</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Customer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Merchant</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Items</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Total</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Platform Fee</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">{order.orderNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{order.customer?.firstName} {order.customer?.lastName}</p>
                    <p className="text-xs text-brand-gray">{order.customer?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {order.merchantProfile?.businessName}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {order.items?.length || 0} item(s)
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    ₦{order.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-green">
                    ₦{order.platformFee.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-gray">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 text-brand-gray">No orders found</div>
      )}
    </div>
  );
}
