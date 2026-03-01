'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';

interface ProductImage {
  url: string;
  publicId: string;
}

interface FullProduct {
  name: string;
  description: string;
  images: ProductImage[];
  brand?: string;
  specifications?: Record<string, string>;
  category: string;
  unit: string;
}

interface MaterialOrderItem {
  product: string;
  productSnapshot: {
    name: string;
    price: number;
    unit: string;
    merchantName: string;
    image?: string;
  };
  fullProduct?: FullProduct;
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
  customer: {
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
    whatsappNumber?: string;
  };
  booking?: {
    _id: string;
    jobType: string;
    description?: string;
  };
  createdAt: string;
  artisanApprovedAt?: string;
  deliveredAt?: string;
  receivedAt?: string;
  receiptNote?: string;
  expiresAt?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; description: string }> = {
  pending_artisan_approval: {
    label: 'Needs Your Approval',
    color: 'bg-orange-100 text-orange-700',
    description: 'Review items and verify they are correct for the job',
  },
  pending: {
    label: 'Waiting for Merchant',
    color: 'bg-yellow-100 text-yellow-700',
    description: 'Merchant is reviewing the order',
  },
  confirmed: {
    label: 'Awaiting Payment',
    color: 'bg-blue-100 text-blue-700',
    description: 'Customer needs to complete payment',
  },
  payment_pending: {
    label: 'Payment Pending',
    color: 'bg-blue-100 text-blue-700',
    description: 'Customer needs to complete payment',
  },
  paid: {
    label: 'Paid',
    color: 'bg-purple-100 text-purple-700',
    description: 'Payment received, merchant will prepare the order',
  },
  preparing: {
    label: 'Being Prepared',
    color: 'bg-purple-100 text-purple-700',
    description: 'Merchant is preparing the items',
  },
  shipped: {
    label: 'On The Way',
    color: 'bg-indigo-100 text-indigo-700',
    description: 'Materials are being delivered to you',
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-700',
    description: 'Materials have arrived. Please confirm receipt and condition.',
  },
  received: {
    label: 'Received',
    color: 'bg-green-100 text-green-700',
    description: 'You confirmed receipt. Merchant has been paid.',
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-600',
    description: 'Order completed successfully',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    description: 'Order was cancelled',
  },
  disputed: {
    label: 'Disputed',
    color: 'bg-red-100 text-red-700',
    description: 'A dispute has been opened',
  },
};

export default function ArtisanMaterialOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<MaterialOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiptNote, setReceiptNote] = useState('');
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [defectDescription, setDefectDescription] = useState('');

  // Product detail modal
  const [selectedItem, setSelectedItem] = useState<MaterialOrderItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const handleApprove = async () => {
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/material-orders/${orderId}/artisan-approve`, {
        method: 'POST',
        token,
        body: JSON.stringify({ note: 'Items verified as correct' }),
      });
      showToast('Order approved! Merchant will be notified.', 'success');
      fetchOrder();
    } catch (error: any) {
      showToast(error.message || 'Failed to approve', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('Please provide a reason', 'error');
      return;
    }
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/material-orders/${orderId}/artisan-reject`, {
        method: 'POST',
        token,
        body: JSON.stringify({ note: rejectReason }),
      });
      showToast('Order rejected. Customer will select different items.', 'success');
      setShowRejectModal(false);
      fetchOrder();
    } catch (error: any) {
      showToast(error.message || 'Failed to reject', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/material-orders/${orderId}/receive`, {
        method: 'POST',
        token,
        body: JSON.stringify({ note: receiptNote || 'Items received in good condition' }),
      });
      showToast('Receipt confirmed! Merchant will be paid.', 'success');
      setShowReceiveModal(false);
      fetchOrder();
    } catch (error: any) {
      showToast(error.message || 'Failed to confirm receipt', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportDefect = async () => {
    if (!defectDescription.trim() || defectDescription.length < 20) {
      showToast('Please describe the defect in detail (at least 20 characters)', 'error');
      return;
    }
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/material-orders/${orderId}/report-defect`, {
        method: 'POST',
        token,
        body: JSON.stringify({ description: defectDescription }),
      });
      showToast('Defect reported. Our team will review.', 'success');
      setShowDefectModal(false);
      fetchOrder();
    } catch (error: any) {
      showToast(error.message || 'Failed to report defect', 'error');
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
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <Link
              href="/dashboard/artisan/material-orders"
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
    color: 'bg-gray-100',
    description: '',
  };

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="text-brand-green hover:underline">
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <p className="text-gray-500 text-sm mt-2">{statusInfo.description}</p>
            </div>
            {order.expiresAt && ['pending_artisan_approval', 'delivered'].includes(order.status) && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Expires</p>
                <p className="text-sm font-medium text-orange-600">
                  {new Date(order.expiresAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Linked Job */}
        {order.booking && (
          <div className="bg-white rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Linked to Job</p>
                <p className="font-medium">{order.booking.jobType}</p>
              </div>
              <Link
                href={`/dashboard/artisan/bookings/${order.booking._id}`}
                className="text-brand-green text-sm hover:underline"
              >
                View Job →
              </Link>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Items to Verify</h2>
          {order.status === 'pending_artisan_approval' && (
            <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg mb-4">
              Tap on each item to view full details, images, and specifications before approving
            </p>
          )}
          <div className="space-y-4">
            {(order.items || []).map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedItem(item);
                  setCurrentImageIndex(0);
                }}
                className="w-full flex gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
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
                <div className="flex-1">
                  <p className="font-medium">{item.productSnapshot.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} {item.productSnapshot.unit} @ ₦{item.unitPrice.toLocaleString()}
                  </p>
                  <p className="text-sm text-brand-green font-medium">
                    ₦{item.totalPrice.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {/* Pricing Summary */}
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>₦{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span>{order.deliveryFee > 0 ? `₦${order.deliveryFee.toLocaleString()}` : 'Free'}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-brand-green">₦{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Delivery</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Delivery To</p>
              <p className="font-medium">Your Location (Artisan)</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p>{order.deliveryAddress}</p>
            </div>
          </div>
        </div>

        {/* Customer & Merchant Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Customer</p>
            <p className="font-medium">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            {order.customer.phone && (
              <a href={`tel:${order.customer.phone}`} className="text-sm text-brand-green">
                {order.customer.phone}
              </a>
            )}
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Merchant</p>
            <p className="font-medium">{order.merchantProfile?.businessName}</p>
            {order.merchantProfile?.phoneNumber && (
              <a href={`tel:${order.merchantProfile.phoneNumber}`} className="text-sm text-brand-green">
                {order.merchantProfile.phoneNumber}
              </a>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Approval Actions */}
          {order.status === 'pending_artisan_approval' && (
            <div className="bg-white rounded-xl p-6">
              <h3 className="font-semibold mb-2">Verify Item Selection</h3>
              <p className="text-sm text-gray-500 mb-4">
                Check if these are the correct items for the job. If not, reject and the customer
                will need to select different items.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="flex-1 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
                >
                  Wrong Items
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Items Are Correct'}
                </button>
              </div>
            </div>
          )}

          {/* Receipt Confirmation */}
          {order.status === 'delivered' && (
            <div className="bg-white rounded-xl p-6">
              <h3 className="font-semibold mb-2">Confirm Receipt</h3>
              <p className="text-sm text-gray-500 mb-4">
                Check that all items are received and in good condition. Once confirmed, the
                merchant will be paid.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDefectModal(true)}
                  disabled={actionLoading}
                  className="flex-1 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
                >
                  Report Issue
                </button>
                <button
                  onClick={() => setShowReceiveModal(true)}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                >
                  Confirm Receipt
                </button>
              </div>
            </div>
          )}

          {/* Status Messages */}
          {order.status === 'pending' && (
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <p className="text-yellow-800">Waiting for merchant to confirm availability</p>
            </div>
          )}

          {order.status === 'shipped' && (
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-indigo-800">Materials are on the way to your location</p>
            </div>
          )}

          {order.status === 'received' && (
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-green-800">You confirmed receipt. Merchant has been paid.</p>
              {order.receiptNote && (
                <p className="text-green-600 text-sm mt-1">Note: {order.receiptNote}</p>
              )}
            </div>
          )}
        </div>

        {/* Reference */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Order: {order.orderNumber}</p>
          <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Why are these items wrong?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Help the customer understand what items they should select instead.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., I need 2-inch PVC pipes, not 1-inch. Also need elbow joints."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Reject Selection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Receipt</h3>
            <p className="text-sm text-gray-500 mb-4">
              By confirming, you verify all items are received in good condition. The merchant will
              be paid immediately.
            </p>
            <textarea
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
              placeholder="Optional note (e.g., All items received in good condition)"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReceipt}
                disabled={actionLoading}
                className="flex-1 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark disabled:opacity-50"
              >
                {actionLoading ? 'Confirming...' : 'Confirm & Pay Merchant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defect Modal */}
      {showDefectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Report Issue</h3>
            <p className="text-sm text-gray-500 mb-4">
              Describe the problem with the delivery. Our team will review and help resolve it.
            </p>
            <textarea
              value={defectDescription}
              onChange={(e) => setDefectDescription(e.target.value)}
              placeholder="Describe the issue in detail (at least 20 characters)..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDefectModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReportDefect}
                disabled={actionLoading || defectDescription.length < 20}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Report Issue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold truncate pr-4">{selectedItem.productSnapshot.name}</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-200 text-xl flex-shrink-0"
              >
                &times;
              </button>
            </div>

            {/* Image Gallery */}
            <div className="relative bg-gray-100">
              {(() => {
                const images = selectedItem.fullProduct?.images ||
                  (selectedItem.productSnapshot.image ? [{ url: selectedItem.productSnapshot.image, publicId: '' }] : []);

                if (images.length === 0) {
                  return (
                    <div className="aspect-video flex items-center justify-center text-gray-400">
                      No images available
                    </div>
                  );
                }

                return (
                  <>
                    <div className="aspect-video">
                      <img
                        src={images[currentImageIndex]?.url}
                        alt={selectedItem.productSnapshot.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Image navigation */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(i => (i - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(i => (i + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                        >
                          ›
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Thumbnail strip */}
            {selectedItem.fullProduct?.images && selectedItem.fullProduct.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto bg-gray-50">
                {selectedItem.fullProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      idx === currentImageIndex ? 'border-brand-green' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Product Details */}
            <div className="p-6 space-y-4">
              {/* Price & Quantity */}
              <div className="bg-brand-light-gray rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-brand-green">
                      ₦{selectedItem.unitPrice.toLocaleString()}/{selectedItem.productSnapshot.unit}
                    </p>
                    <p className="text-gray-500">Quantity ordered: {selectedItem.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-xl font-bold">₦{selectedItem.totalPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Brand */}
              {selectedItem.fullProduct?.brand && (
                <div>
                  <p className="text-sm text-gray-500">Brand</p>
                  <p className="font-medium">{selectedItem.fullProduct.brand}</p>
                </div>
              )}

              {/* Category */}
              {selectedItem.fullProduct?.category && (
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium capitalize">{selectedItem.fullProduct.category.replace(/-/g, ' ')}</p>
                </div>
              )}

              {/* Description */}
              {selectedItem.fullProduct?.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedItem.fullProduct.description}</p>
                </div>
              )}

              {/* Specifications */}
              {selectedItem.fullProduct?.specifications && Object.keys(selectedItem.fullProduct.specifications).length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Specifications</p>
                  <div className="bg-gray-50 rounded-lg divide-y">
                    {Object.entries(selectedItem.fullProduct.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 px-3">
                        <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Merchant */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Sold by</p>
                <p className="font-medium">{selectedItem.productSnapshot.merchantName}</p>
              </div>
            </div>

            {/* Close button at bottom */}
            <div className="sticky bottom-0 bg-white border-t p-4">
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
