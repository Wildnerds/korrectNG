'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { getProductUnitLabel, timeAgo } from '@korrectng/shared';
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

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  changedBy?: string;
  note?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  booking?: {
    _id: string;
    jobType: string;
  };
  artisan?: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  artisanProfile?: {
    phoneNumber?: string;
    whatsappNumber?: string;
    address?: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  platformFee: number;
  merchantEarnings: number;
  status: string;
  statusHistory: StatusHistoryEntry[];
  deliveryType: string;
  deliveryAddress: string;
  deliveryInstructions?: string;
  scheduledDeliveryDate?: string;
  createdAt: string;
  confirmedAt?: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  receivedAt?: string;
  completedAt?: string;
  hasDefect: boolean;
  defectDescription?: string;
  defectImages?: string[];
}

export default function MerchantOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<Order>(`/material-orders/${orderId}`, { token });
      if (res.data) {
        setOrder(res.data);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  const updateOrderStatus = async (action: string) => {
    if (!order) return;
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/material-orders/${order._id}/${action}`, {
        method: 'POST',
        token,
      });
      fetchOrder();
    } catch {
      // Handle error
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'paid':
      case 'preparing':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'delivered':
      case 'received':
        return 'bg-teal-100 text-teal-700 border-teal-300';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'disputed':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <button
            onClick={() => router.back()}
            className="text-brand-green hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-brand-gray hover:text-brand-green transition-colors mb-2"
          >
            Back to Orders
          </button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <p className="text-brand-gray">Created {timeAgo(order.createdAt)}</p>
            </div>
            <span className={`px-4 py-2 rounded-full font-medium border ${getStatusColor(order.status)}`}>
              {order.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Order Items</h2>
              <div className="space-y-4">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.productSnapshot.image ? (
                        <img
                          src={item.productSnapshot.image}
                          alt={item.productSnapshot.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.productSnapshot.name}</h3>
                      <p className="text-sm text-brand-gray">
                        {item.quantity} {getProductUnitLabel(item.productSnapshot.unit)} @ NGN{item.unitPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">NGN{item.totalPrice.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>NGN{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>NGN{order.deliveryFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-brand-gray">
                  <span>Platform Fee (5%)</span>
                  <span>-NGN{order.platformFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>NGN{order.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-brand-green font-semibold">
                  <span>Your Earnings</span>
                  <span>NGN{order.merchantEarnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Delivery Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-brand-gray">Deliver To</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      order.deliveryType === 'customer_address'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {order.deliveryType === 'customer_address'
                        ? `👤 Customer: ${order.customer.firstName} ${order.customer.lastName}`
                        : `🔧 Artisan: ${order.artisan?.firstName || ''} ${order.artisan?.lastName || ''}`
                      }
                    </span>
                  </div>
                </div>
                {order.deliveryType !== 'pickup' && (
                  <div>
                    <p className="text-sm text-brand-gray">Address</p>
                    <p className="font-medium">{order.deliveryAddress}</p>
                  </div>
                )}
                {order.deliveryInstructions && (
                  <div>
                    <p className="text-sm text-brand-gray">Instructions</p>
                    <p className="font-medium">{order.deliveryInstructions}</p>
                  </div>
                )}
                {order.scheduledDeliveryDate && (
                  <div>
                    <p className="text-sm text-brand-gray">Scheduled Delivery</p>
                    <p className="font-medium">
                      {new Date(order.scheduledDeliveryDate).toLocaleDateString('en-NG', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Defect Report */}
            {order.hasDefect && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h2 className="text-lg font-bold text-red-800 mb-4">Defect Reported</h2>
                <p className="text-red-700 mb-4">{order.defectDescription}</p>
                {order.defectImages && order.defectImages.length > 0 && (
                  <div className="flex gap-2">
                    {order.defectImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Defect ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status History */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Order Timeline</h2>
              <div className="space-y-4">
                {order.statusHistory.map((entry, idx) => {
                  const statusLabels: Record<string, { label: string; icon: string; color: string }> = {
                    pending_artisan_approval: { label: 'Order Created - Awaiting Artisan Verification', icon: '📋', color: 'bg-orange-500' },
                    pending: { label: 'Artisan Verified - Awaiting Your Confirmation', icon: '✅', color: 'bg-yellow-500' },
                    confirmed: { label: 'Order Confirmed - Awaiting Payment', icon: '📦', color: 'bg-blue-500' },
                    payment_pending: { label: 'Payment Initiated', icon: '💳', color: 'bg-blue-400' },
                    paid: { label: 'Payment Received', icon: '💰', color: 'bg-green-500' },
                    preparing: { label: 'Preparing Order', icon: '🔧', color: 'bg-purple-500' },
                    shipped: { label: 'Out for Delivery', icon: '🚚', color: 'bg-indigo-500' },
                    delivered: { label: 'Delivered - Awaiting Confirmation', icon: '📍', color: 'bg-teal-500' },
                    received: { label: 'Receipt Confirmed', icon: '✔️', color: 'bg-green-600' },
                    completed: { label: 'Order Completed - Payment Released', icon: '🎉', color: 'bg-green-700' },
                    cancelled: { label: 'Order Cancelled', icon: '❌', color: 'bg-red-500' },
                    disputed: { label: 'Dispute Raised', icon: '⚠️', color: 'bg-red-600' },
                  };
                  const info = statusLabels[entry.status] || { label: entry.status.replace(/_/g, ' '), icon: '•', color: 'bg-gray-500' };

                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full ${info.color} flex items-center justify-center text-white text-sm flex-shrink-0`}>
                          {info.icon}
                        </div>
                        {idx < order.statusHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium">{info.label}</p>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Actions</h2>
              <div className="space-y-3">
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus('confirm')}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-brand-green text-white rounded-md font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                  >
                    Confirm Order
                  </button>
                )}
                {order.status === 'paid' && (
                  <button
                    onClick={() => updateOrderStatus('preparing')}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus('ship')}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    Mark as Shipped
                  </button>
                )}
                {order.status === 'shipped' && (
                  <button
                    onClick={() => updateOrderStatus('deliver')}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    Mark as Delivered
                  </button>
                )}
                {['pending', 'confirmed'].includes(order.status) && (
                  <button
                    onClick={() => updateOrderStatus('cancel')}
                    disabled={actionLoading}
                    className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-md font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>

            {/* Delivery Contact - Show when order is paid/preparing/shipped */}
            {['paid', 'preparing', 'shipped'].includes(order.status) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4 text-blue-800">
                  📍 Delivery Contact
                </h2>

                {/* Delivery Type Badge */}
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    order.deliveryType === 'customer_address'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {order.deliveryType === 'customer_address' ? '👤 Deliver to Customer' : '🔧 Deliver to Artisan'}
                  </span>
                </div>

                {/* Customer Delivery */}
                {order.deliveryType === 'customer_address' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-blue-600">Customer Name</p>
                      <p className="font-medium">{order.customer.firstName} {order.customer.lastName}</p>
                    </div>
                    {order.customer.phone && (
                      <a
                        href={`tel:${order.customer.phone}`}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors w-full"
                      >
                        <span>📞</span>
                        <span>Call {order.customer.phone}</span>
                      </a>
                    )}
                    <div>
                      <p className="text-sm text-blue-600">Delivery Address</p>
                      <p className="font-medium break-words">{order.deliveryAddress}</p>
                    </div>
                  </div>
                )}

                {/* Artisan Delivery */}
                {order.deliveryType !== 'customer_address' && order.artisan && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-blue-600">Artisan Name</p>
                      <p className="font-medium">{order.artisan.firstName} {order.artisan.lastName}</p>
                    </div>
                    {(order.artisanProfile?.phoneNumber || order.artisan.phone) && (
                      <a
                        href={`tel:${order.artisanProfile?.phoneNumber || order.artisan.phone}`}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors w-full"
                      >
                        <span>📞</span>
                        <span>Call {order.artisanProfile?.phoneNumber || order.artisan.phone}</span>
                      </a>
                    )}
                    {order.artisanProfile?.whatsappNumber && (
                      <a
                        href={`https://wa.me/${order.artisanProfile.whatsappNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors w-full"
                      >
                        <span>💬</span>
                        <span>WhatsApp {order.artisanProfile.whatsappNumber}</span>
                      </a>
                    )}
                    <div>
                      <p className="text-sm text-blue-600">Delivery Address</p>
                      <p className="font-medium break-words">{order.artisanProfile?.address || order.deliveryAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer Info */}
            <div className="bg-white rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4">Customer</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-brand-gray">Name</p>
                  <p className="font-medium">{order.customer.firstName} {order.customer.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-brand-gray">Email</p>
                  <p className="font-medium">{order.customer.email}</p>
                </div>
                {order.customer.phone && (
                  <div>
                    <p className="text-sm text-brand-gray">Phone</p>
                    <p className="font-medium">{order.customer.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Linked Booking */}
            {order.booking && (
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-lg font-bold mb-4">Linked Booking</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-brand-gray">Job Type</p>
                    <p className="font-medium">{order.booking.jobType}</p>
                  </div>
                  {order.artisan && (
                    <div>
                      <p className="text-sm text-brand-gray">Artisan</p>
                      <p className="font-medium">{order.artisan.firstName} {order.artisan.lastName}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
