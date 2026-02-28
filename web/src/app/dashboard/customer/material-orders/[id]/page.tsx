'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { getProductUnitLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface MaterialOrderItem {
  product: string;
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
  artisanApprovalNote?: string;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  items: MaterialOrderItem[];
  deliveryAddress: string;
  deliveryType: string;
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  merchantProfile: {
    _id: string;
    businessName: string;
    slug: string;
    phoneNumber?: string;
  };
  booking?: {
    _id: string;
    jobType: string;
  };
  createdAt: string;
  artisanApprovedAt?: string;
  confirmedAt?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  receivedAt?: string;
  receiptNote?: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  pending_artisan_approval: {
    label: 'Awaiting Artisan Approval',
    color: 'bg-yellow-100 text-yellow-700',
    description: 'The artisan is reviewing the items to verify they are correct',
  },
  pending: {
    label: 'Awaiting Merchant',
    color: 'bg-yellow-100 text-yellow-700',
    description: 'Waiting for merchant to confirm availability',
  },
  confirmed: {
    label: 'Ready for Payment',
    color: 'bg-blue-100 text-blue-700',
    description: 'Merchant confirmed - complete payment to proceed',
  },
  payment_pending: {
    label: 'Payment Pending',
    color: 'bg-orange-100 text-orange-700',
    description: 'Complete your payment to proceed',
  },
  paid: {
    label: 'Paid',
    color: 'bg-green-100 text-green-700',
    description: 'Payment received. Order is being prepared.',
  },
  preparing: {
    label: 'Preparing',
    color: 'bg-purple-100 text-purple-700',
    description: 'Merchant is preparing your order',
  },
  shipped: {
    label: 'In Transit',
    color: 'bg-indigo-100 text-indigo-700',
    description: 'Order is on the way to the artisan',
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-700',
    description: 'Delivered to artisan. Waiting for receipt confirmation.',
  },
  received: {
    label: 'Received',
    color: 'bg-green-100 text-green-700',
    description: 'Artisan confirmed receipt. Merchant has been paid.',
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-600',
    description: 'Order completed successfully',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    description: 'This order was cancelled',
  },
  rejected: {
    label: 'Rejected by Artisan',
    color: 'bg-red-100 text-red-700',
    description: 'The artisan rejected these items. Please select different products.',
  },
  disputed: {
    label: 'Disputed',
    color: 'bg-red-100 text-red-700',
    description: 'There is an issue with this order',
  },
};

export default function CustomerMaterialOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<MaterialOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const orderId = params.id as string;

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<MaterialOrder>(`/material-orders/${orderId}`, { token });
      if (res.data) {
        setOrder(res.data);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<{ authorization_url: string }>(
        `/material-orders/${orderId}/pay`,
        {
          method: 'POST',
          token,
        }
      );
      if (res.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to initiate payment', 'error');
      setActionLoading(false);
    }
  };

  const cancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/material-orders/${orderId}/cancel`, {
        method: 'POST',
        token,
      });
      showToast('Order cancelled', 'success');
      fetchOrder();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center py-20">Loading...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
            <Link
              href="/dashboard/customer/material-orders"
              className="text-brand-green hover:underline"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[order.status] || {
    label: order.status,
    color: 'bg-gray-100 text-gray-600',
    description: '',
  };

  const canPay = ['confirmed', 'payment_pending'].includes(order.status);
  const canCancel = ['pending_artisan_approval', 'pending', 'confirmed'].includes(order.status);

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/customer/material-orders"
            className="text-brand-green hover:underline"
          >
            &larr; Back to Orders
          </Link>
        </div>

        {/* Order Number & Status */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <p className="text-brand-gray text-sm">
                Ordered {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-brand-gray">{statusInfo.description}</p>

          {/* Rejection note */}
          {order.status === 'rejected' && order.artisanApprovalNote && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">Artisan's feedback:</p>
              <p className="text-red-700">{order.artisanApprovalNote}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.productSnapshot.image ? (
                    <img
                      src={item.productSnapshot.image}
                      alt={item.productSnapshot.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{item.productSnapshot.name}</h3>
                  <p className="text-sm text-brand-gray">
                    NGN{item.unitPrice.toLocaleString()} / {getProductUnitLabel(item.productSnapshot.unit)}
                  </p>
                  <p className="text-sm text-brand-gray">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">NGN{item.totalPrice.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray">Subtotal</span>
              <span>NGN{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray">Delivery Fee</span>
              <span>NGN{order.deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-brand-green">NGN{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-brand-gray">Delivery To</p>
              <p className="font-medium">
                {order.artisan.firstName} {order.artisan.lastName} (Artisan)
              </p>
            </div>
            <div>
              <p className="text-sm text-brand-gray">Address</p>
              <p>{order.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Merchant Info */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Merchant</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-light-gray rounded-lg flex items-center justify-center text-2xl">
              🏪
            </div>
            <div className="flex-1">
              <Link
                href={`/merchant/${order.merchantProfile.slug}`}
                className="font-medium hover:text-brand-green"
              >
                {order.merchantProfile.businessName}
              </Link>
              {order.merchantProfile.phoneNumber && (
                <p className="text-sm text-brand-gray">{order.merchantProfile.phoneNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Linked Booking */}
        {order.booking && (
          <div className="bg-white rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Linked Booking</h2>
            <Link
              href={`/dashboard/customer/bookings/${order.booking._id}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <span>{order.booking.jobType}</span>
              <span className="text-brand-green">View &rarr;</span>
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {canPay && (
            <button
              onClick={initiatePayment}
              disabled={actionLoading}
              className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
            >
              {actionLoading ? 'Processing...' : `Pay NGN${order.totalAmount.toLocaleString()}`}
            </button>
          )}

          {canCancel && (
            <button
              onClick={cancelOrder}
              disabled={actionLoading}
              className="w-full py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
            >
              Cancel Order
            </button>
          )}
        </div>

        {/* Timeline */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="bg-white rounded-xl p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Order Timeline</h2>
            <div className="space-y-4">
              {order.statusHistory.map((entry, idx) => {
                const statusIcons: Record<string, { icon: string; color: string }> = {
                  pending_artisan_approval: { icon: '📋', color: 'bg-orange-500' },
                  pending: { icon: '🏪', color: 'bg-yellow-500' },
                  confirmed: { icon: '✅', color: 'bg-blue-500' },
                  payment_pending: { icon: '💳', color: 'bg-blue-400' },
                  paid: { icon: '💰', color: 'bg-green-500' },
                  preparing: { icon: '🔧', color: 'bg-purple-500' },
                  shipped: { icon: '🚚', color: 'bg-indigo-500' },
                  delivered: { icon: '📍', color: 'bg-teal-500' },
                  received: { icon: '✔️', color: 'bg-green-600' },
                  completed: { icon: '🎉', color: 'bg-green-700' },
                  cancelled: { icon: '❌', color: 'bg-red-500' },
                  disputed: { icon: '⚠️', color: 'bg-red-600' },
                };
                const entryStatus = STATUS_LABELS[entry.status] || { label: entry.status.replace(/_/g, ' '), color: '' };
                const iconInfo = statusIcons[entry.status] || { icon: '•', color: 'bg-gray-500' };

                return (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full ${iconInfo.color} flex items-center justify-center text-white text-sm flex-shrink-0`}>
                        {iconInfo.icon}
                      </div>
                      {idx < order.statusHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">{entryStatus.label}</p>
                      <p className="text-sm text-brand-gray">
                        {new Date(entry.timestamp).toLocaleString('en-NG', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {entry.note && (
                        <p className="text-sm text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded">{entry.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
