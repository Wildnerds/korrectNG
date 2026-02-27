'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { MATERIAL_ORDER_STATUSES, timeAgo } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface OrderItem {
  product: string;
  productSnapshot: {
    name: string;
    price: number;
    unit: string;
    image?: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  merchantEarnings: number;
  status: string;
  deliveryType: string;
  deliveryAddress: string;
  scheduledDeliveryDate?: string;
  createdAt: string;
  confirmedAt?: string;
  paidAt?: string;
  deliveredAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function MerchantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, currentPage]);

  async function fetchOrders() {
    setLoading(true);
    const token = Cookies.get('token');
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const res = await apiFetch<{ data: Order[]; pagination: Pagination }>(
        `/material-orders?${params}`,
        { token }
      );

      if (res.data) {
        setOrders(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  const updateOrderStatus = async (orderId: string, action: string) => {
    const token = Cookies.get('token');
    try {
      await apiFetch(`/material-orders/${orderId}/${action}`, {
        method: 'POST',
        token,
      });
      fetchOrders();
    } catch {
      // Handle error
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700';
      case 'paid':
      case 'preparing':
        return 'bg-purple-100 text-purple-700';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-700';
      case 'delivered':
      case 'received':
        return 'bg-teal-100 text-teal-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-700';
      case 'disputed':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionButton = (order: Order) => {
    switch (order.status) {
      case 'pending':
        return (
          <button
            onClick={() => updateOrderStatus(order._id, 'confirm')}
            className="px-4 py-2 bg-brand-green text-white rounded-md text-sm font-medium hover:bg-brand-green-dark transition-colors"
          >
            Confirm Order
          </button>
        );
      case 'paid':
        return (
          <button
            onClick={() => updateOrderStatus(order._id, 'preparing')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Start Preparing
          </button>
        );
      case 'preparing':
        return (
          <button
            onClick={() => updateOrderStatus(order._id, 'ship')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Mark as Shipped
          </button>
        );
      case 'shipped':
        return (
          <button
            onClick={() => updateOrderStatus(order._id, 'deliver')}
            className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Mark as Delivered
          </button>
        );
      default:
        return null;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-brand-gray">Manage your material orders</p>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            All Orders
          </button>
          {['pending', 'confirmed', 'paid', 'preparing', 'shipped', 'delivered', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-brand-gray hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold mb-2">No Orders Found</h2>
            <p className="text-brand-gray">
              {statusFilter === 'all'
                ? 'You have no orders yet. Products will appear here when customers place orders.'
                : `No ${statusFilter} orders found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg">{order.orderNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-brand-gray">
                      {order.customer.firstName} {order.customer.lastName} - {timeAgo(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/merchant/orders/${order._id}`}
                      className="px-4 py-2 border border-brand-green text-brand-green rounded-md text-sm font-medium hover:bg-brand-green hover:text-white transition-colors"
                    >
                      View Details
                    </Link>
                    {getActionButton(order)}
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-4">
                  <div className="flex flex-wrap gap-4 mb-4">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {item.productSnapshot.image ? (
                            <img
                              src={item.productSnapshot.image}
                              alt={item.productSnapshot.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <span className="text-xl">📦</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.productSnapshot.name}</p>
                          <p className="text-xs text-brand-gray">
                            {item.quantity} x NGN{item.unitPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="flex items-center">
                        <span className="text-sm text-brand-gray">+{order.items.length - 3} more</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <p className="text-sm text-brand-gray">
                      Delivery: {order.deliveryType === 'pickup' ? 'Pickup' : order.deliveryAddress}
                    </p>
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-green">
                        NGN{order.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-brand-gray">
                        Your earnings: NGN{order.merchantEarnings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {currentPage} of {pagination.pages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
              disabled={currentPage === pagination.pages}
              className="px-4 py-2 bg-white rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
