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
  customer: {
    firstName: string;
    lastName: string;
  };
  merchantProfile: {
    businessName: string;
    slug: string;
  };
  booking?: {
    _id: string;
    jobType: string;
  };
  createdAt: string;
  deliveredAt?: string;
  expiresAt?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; action?: string }> = {
  pending_artisan_approval: {
    label: 'Needs Your Approval',
    color: 'bg-orange-100 text-orange-700',
    action: 'Verify items are correct',
  },
  pending: {
    label: 'Waiting Merchant',
    color: 'bg-yellow-100 text-yellow-700',
  },
  confirmed: {
    label: 'Awaiting Payment',
    color: 'bg-blue-100 text-blue-700',
  },
  payment_pending: {
    label: 'Payment Pending',
    color: 'bg-blue-100 text-blue-700',
  },
  paid: {
    label: 'Paid - Preparing',
    color: 'bg-purple-100 text-purple-700',
  },
  preparing: {
    label: 'Being Prepared',
    color: 'bg-purple-100 text-purple-700',
  },
  shipped: {
    label: 'On The Way',
    color: 'bg-indigo-100 text-indigo-700',
  },
  delivered: {
    label: 'Delivered - Confirm Receipt',
    color: 'bg-green-100 text-green-700',
    action: 'Confirm receipt & condition',
  },
  received: {
    label: 'Received',
    color: 'bg-green-100 text-green-700',
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-600',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
  },
  disputed: {
    label: 'Disputed',
    color: 'bg-red-100 text-red-700',
  },
};

export default function ArtisanMaterialOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'action_needed' | 'all'>('action_needed');

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

  const actionNeededOrders = orders.filter(
    (o) => o.status === 'pending_artisan_approval' || o.status === 'delivered'
  );

  const displayOrders = filter === 'action_needed' ? actionNeededOrders : orders;

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Material Orders</h1>
          <p className="text-brand-gray">
            Verify customer material selections and confirm deliveries
          </p>
        </div>

        {/* Action Needed Banner */}
        {actionNeededOrders.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-orange-800">
                  {actionNeededOrders.length} order{actionNeededOrders.length !== 1 ? 's' : ''} need your action
                </p>
                <p className="text-sm text-orange-600">
                  {orders.filter((o) => o.status === 'pending_artisan_approval').length} awaiting approval,{' '}
                  {orders.filter((o) => o.status === 'delivered').length} awaiting receipt confirmation
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('action_needed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'action_needed'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-50'
            }`}
          >
            Action Needed ({actionNeededOrders.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-50'
            }`}
          >
            All Orders ({orders.length})
          </button>
        </div>

        {/* Orders List */}
        {displayOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="font-semibold mb-2">No Orders</h3>
            <p className="text-brand-gray text-sm">
              {filter === 'action_needed'
                ? 'No orders need your action right now.'
                : 'No material orders linked to your jobs yet.'}
            </p>
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
                  href={`/dashboard/artisan/material-orders/${order._id}`}
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
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No img
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
                      {order.booking?.jobType || 'No job linked'}
                    </div>
                    <div className="font-semibold text-brand-green">
                      ₦{order.totalAmount.toLocaleString()}
                    </div>
                  </div>

                  {/* Action hint */}
                  {statusConfig.action && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-orange-600 font-medium">
                        → {statusConfig.action}
                      </p>
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
