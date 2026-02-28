'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';

interface MaterialOrderItem {
  productSnapshot: {
    name: string;
    price: number;
    unit: string;
    merchantName: string;
    image?: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface MaterialOrder {
  _id: string;
  orderNumber: string;
  status: string;
  artisanApprovalStatus: string;
  totalAmount: number;
  items: MaterialOrderItem[];
  deliveryAddress: string;
  merchantProfile: {
    businessName: string;
    slug: string;
  };
  booking?: {
    _id: string;
    jobType: string;
  };
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; description?: string }> = {
  pending_artisan_approval: {
    label: 'Awaiting Artisan',
    color: 'bg-yellow-100 text-yellow-700',
    description: 'Artisan is verifying the items',
  },
  pending: {
    label: 'Awaiting Merchant',
    color: 'bg-yellow-100 text-yellow-700',
    description: 'Merchant is confirming availability',
  },
  confirmed: {
    label: 'Ready to Pay',
    color: 'bg-blue-100 text-blue-700',
    description: 'Merchant confirmed - proceed to payment',
  },
  payment_pending: {
    label: 'Payment Pending',
    color: 'bg-orange-100 text-orange-700',
    description: 'Complete your payment',
  },
  paid: {
    label: 'Paid',
    color: 'bg-green-100 text-green-700',
    description: 'Payment received - preparing order',
  },
  preparing: {
    label: 'Preparing',
    color: 'bg-purple-100 text-purple-700',
    description: 'Merchant is preparing your order',
  },
  shipped: {
    label: 'In Transit',
    color: 'bg-indigo-100 text-indigo-700',
    description: 'Order is on the way to artisan',
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-700',
    description: 'Delivered to artisan - awaiting confirmation',
  },
  received: {
    label: 'Received',
    color: 'bg-green-100 text-green-700',
    description: 'Artisan confirmed receipt',
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-600',
    description: 'Order completed',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    description: 'Order was cancelled',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700',
    description: 'Artisan rejected the items',
  },
  disputed: {
    label: 'Disputed',
    color: 'bg-red-100 text-red-700',
    description: 'There is an issue with this order',
  },
};

export default function CustomerMaterialOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<{ data: MaterialOrder[] }>('/material-orders', { token });
      if (res.data?.data) {
        setOrders(res.data.data);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(
    (o) => !['completed', 'cancelled', 'rejected'].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ['completed', 'cancelled', 'rejected'].includes(o.status)
  );

  const displayOrders =
    filter === 'active' ? activeOrders : filter === 'completed' ? completedOrders : orders;

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-20">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/customer"
            className="text-brand-green hover:underline"
          >
            &larr; Dashboard
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Material Orders</h1>
          <p className="text-brand-gray">Track materials ordered for your jobs</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'active'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-50'
            }`}
          >
            Active ({activeOrders.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-50'
            }`}
          >
            Completed ({completedOrders.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-50'
            }`}
          >
            All ({orders.length})
          </button>
        </div>

        {/* Orders List */}
        {displayOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="font-semibold mb-2">No Material Orders</h3>
            <p className="text-brand-gray text-sm">
              {filter === 'active'
                ? 'No active material orders. Order materials from your booking page.'
                : 'No completed orders yet.'}
            </p>
            <Link
              href="/dashboard/customer/bookings"
              className="inline-block mt-4 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark"
            >
              View Bookings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {displayOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status] || {
                label: order.status,
                color: 'bg-gray-100 text-gray-600',
              };

              return (
                <Link
                  key={order._id}
                  href={`/dashboard/customer/material-orders/${order._id}`}
                  className="block bg-white rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold">{order.orderNumber}</p>
                      <p className="text-sm text-brand-gray">
                        From {order.merchantProfile?.businessName || 'Unknown Merchant'}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Items Preview */}
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {order.items.slice(0, 4).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden"
                      >
                        {item.productSnapshot.image ? (
                          <img
                            src={item.productSnapshot.image}
                            alt={item.productSnapshot.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                            📦
                          </div>
                        )}
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-brand-gray">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-brand-gray">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} •{' '}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="font-semibold text-brand-green">
                      NGN{order.totalAmount.toLocaleString()}
                    </div>
                  </div>

                  {/* Status description */}
                  {statusConfig.description && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-brand-gray">{statusConfig.description}</p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
