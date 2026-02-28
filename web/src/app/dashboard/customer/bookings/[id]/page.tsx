'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { MaterialsList, MerchantComparison, MaterialOrderForm, MaterialOrderStatus } from '@/components/materials';
import Cookies from 'js-cookie';

interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  specs?: string;
}

interface MaterialOrder {
  _id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  merchantProfile: {
    businessName: string;
    slug: string;
  };
}

interface Booking {
  _id: string;
  paymentReference?: string;
  jobType: string;
  description: string;
  location: string;
  address: string;
  status: string;
  quotedPrice?: number;
  quoteMessage?: string;
  finalPrice?: number;
  platformFee?: number;
  artisanEarnings?: number;
  images?: string[];
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
  confirmedAt?: string;
  cancellationReason?: string;
  expiresAt?: string;
  materialsList?: MaterialItem[];
  linkedMaterialOrders?: MaterialOrder[];
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatar?: string;
  };
  artisanProfile: {
    _id: string;
    businessName: string;
    slug: string;
    trade: string;
    whatsappNumber?: string;
  };
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

const statusLabels: Record<string, { label: string; color: string; description: string }> = {
  pending: { label: 'Awaiting Quote', color: 'bg-yellow-100 text-yellow-700', description: 'Waiting for the artisan to send a quote' },
  quoted: { label: 'Quote Received', color: 'bg-blue-100 text-blue-700', description: 'Review and accept or decline the quote' },
  accepted: { label: 'Quote Accepted', color: 'bg-green-100 text-green-700', description: 'Proceed to payment to confirm booking' },
  payment_pending: { label: 'Awaiting Payment', color: 'bg-orange-100 text-orange-700', description: 'Complete payment to confirm booking' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', description: 'Payment received, job will begin soon' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', description: 'Artisan is working on your job' },
  completed: { label: 'Pending Confirmation', color: 'bg-purple-100 text-purple-700', description: 'Artisan marked complete, please confirm' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', description: 'Job completed and confirmed' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', description: 'Artisan rejected this booking' },
  declined: { label: 'Declined', color: 'bg-gray-100 text-gray-700', description: 'You declined the quote' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', description: 'This booking was cancelled' },
  disputed: { label: 'Disputed', color: 'bg-red-100 text-red-700', description: 'There is an open dispute' },
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Materials state
  const [merchantQuotes, setMerchantQuotes] = useState<any[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const bookingId = params.id as string;

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    const token = Cookies.get('token');
    try {
      const response = await apiFetch<Booking>(`/bookings/${bookingId}`, { token });
      setBooking(response.data || null);
    } catch (error: any) {
      showToast(error.message || 'Failed to load booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  const acceptQuote = async () => {
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/accept-quote`, {
        method: 'POST',
        token,
      });
      showToast('Quote accepted! Proceed to payment.', 'success');
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to accept quote', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const declineQuote = async () => {
    if (!confirm('Are you sure you want to decline this quote?')) return;
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/decline-quote`, {
        method: 'POST',
        token,
      });
      showToast('Quote declined', 'success');
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to decline quote', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const initiatePayment = async () => {
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      const response = await apiFetch<{ authorization_url: string }>(`/bookings/${bookingId}/pay`, {
        method: 'POST',
        token,
      });
      if (response.data?.authorization_url) {
        window.location.href = response.data.authorization_url;
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to initiate payment', 'error');
      setActionLoading(false);
    }
  };

  const certifyJob = async () => {
    if (!confirm('Are you satisfied with the job? This will release payment to the artisan.')) return;
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/certify`, {
        method: 'POST',
        token,
      });
      showToast('Job certified! Payment has been released.', 'success');
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to certify job', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelBooking = async () => {
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: cancelReason }),
      });
      showToast('Booking cancelled', 'success');
      setShowCancelModal(false);
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel booking', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const canCancel = booking && ['pending', 'quoted', 'accepted', 'payment_pending'].includes(booking.status);

  // Fetch merchant quotes for materials
  const fetchMerchantQuotes = async () => {
    if (!booking?.materialsList?.length) return;
    setLoadingQuotes(true);
    const token = Cookies.get('token');
    try {
      const response = await apiFetch<any[]>(`/bookings/${bookingId}/material-options`, { token });
      setMerchantQuotes(response.data || []);
    } catch (error: any) {
      showToast(error.message || 'Failed to load merchant options', 'error');
    } finally {
      setLoadingQuotes(false);
    }
  };

  // Alternative sourcing state
  const [selectedAlternative, setSelectedAlternative] = useState<'customer_sources' | 'artisan_sources' | null>(null);

  // Handle alternative selection
  const handleAlternativeSelected = (option: 'customer_sources' | 'artisan_sources') => {
    setSelectedAlternative(option);
    setShowMaterialsModal(false);
    showToast(
      option === 'customer_sources'
        ? 'You\'ve chosen to source materials yourself. The artisan will proceed with labor only.'
        : 'The artisan will source materials. Labor charges are protected by escrow.',
      'success'
    );
  };

  // Create material order - sends to artisan for verification first
  const createMaterialOrder = async (orderData: {
    deliveryType: string;
    deliveryAddress: string;
    deliveryInstructions?: string;
    scheduledDeliveryDate?: string;
  }) => {
    if (!selectedMerchant) return;
    setCreatingOrder(true);
    const token = Cookies.get('token');
    try {
      // Use material-orders endpoint with booking reference
      await apiFetch(`/material-orders`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          merchant: selectedMerchant.merchant._id,
          booking: bookingId,
          items: selectedMerchant.items.map((item: any) => ({
            product: item.product._id,
            quantity: item.quantity,
          })),
          deliveryType: 'artisan_location', // Always deliver to artisan
          deliveryAddress: orderData.deliveryAddress,
          deliveryInstructions: orderData.deliveryInstructions,
          scheduledDeliveryDate: orderData.scheduledDeliveryDate,
        }),
      });
      showToast('Order created! Artisan will verify the items.', 'success');
      setShowMaterialsModal(false);
      setSelectedMerchant(null);
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to create order', 'error');
    } finally {
      setCreatingOrder(false);
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

  if (!booking) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-xl p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Booking Not Found</h1>
            <p className="text-gray-500 mb-6">This booking may have been deleted or you don't have access to it.</p>
            <Link
              href="/dashboard/customer/bookings"
              className="inline-block px-6 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium"
            >
              Back to Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = statusLabels[booking.status] || { label: booking.status, color: 'bg-gray-100', description: '' };

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="text-brand-green hover:underline"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold">Booking Details</h1>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <p className="text-gray-500 text-sm mt-2">{statusInfo.description}</p>
            </div>
            {booking.expiresAt && ['pending', 'quoted', 'accepted'].includes(booking.status) && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Expires</p>
                <p className="text-sm font-medium text-orange-600">
                  {new Date(booking.expiresAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {booking.cancellationReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-red-700">
                <span className="font-medium">Cancellation reason:</span> {booking.cancellationReason}
              </p>
            </div>
          )}
        </div>

        {/* Artisan Info */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Artisan</h2>
          <div className="flex items-center gap-4">
            {booking.artisan.avatar ? (
              <img
                src={booking.artisan.avatar}
                alt={booking.artisan.firstName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-light-gray flex items-center justify-center text-2xl text-gray-400">
                {booking.artisan.firstName?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <Link
                href={`/artisan/${booking.artisanProfile.slug}`}
                className="text-lg font-semibold hover:text-brand-green"
              >
                {booking.artisanProfile.businessName}
              </Link>
              <p className="text-gray-500 text-sm">
                {booking.artisan.firstName} {booking.artisan.lastName}
              </p>
              <p className="text-gray-400 text-xs">{booking.artisanProfile.trade}</p>
            </div>
            {booking.artisanProfile.whatsappNumber && (
              <a
                href={`https://wa.me/${booking.artisanProfile.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Job Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Job Type</p>
              <p className="font-medium">{booking.jobType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-gray-700">{booking.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{booking.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{booking.address}</p>
              </div>
            </div>
            {booking.scheduledDate && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Scheduled Date</p>
                  <p className="font-medium">{new Date(booking.scheduledDate).toLocaleDateString()}</p>
                </div>
                {booking.scheduledTime && (
                  <div>
                    <p className="text-sm text-gray-500">Scheduled Time</p>
                    <p className="font-medium">{booking.scheduledTime}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Images */}
          {booking.images && booking.images.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-2">Images</p>
              <div className="flex gap-2 overflow-x-auto">
                {booking.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Job image ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        {(booking.quotedPrice || booking.finalPrice) && (
          <div className="bg-white rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Pricing</h2>
            <div className="space-y-3">
              {booking.quotedPrice && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Quoted Price</span>
                  <span className="font-semibold">₦{booking.quotedPrice.toLocaleString()}</span>
                </div>
              )}
              {booking.finalPrice && (
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-brand-green">₦{booking.finalPrice.toLocaleString()}</span>
                </div>
              )}
              {booking.quoteMessage && (
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <p className="text-sm text-gray-500 mb-1">Artisan's Note:</p>
                  <p className="text-gray-700 text-sm">{booking.quoteMessage}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Materials Section */}
        {booking.materialsList && booking.materialsList.length > 0 && (
          <div className="bg-white rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Materials Required</h2>
            <MaterialsList materials={booking.materialsList} showHeader={false} />

            {/* Linked Material Orders */}
            {booking.linkedMaterialOrders && booking.linkedMaterialOrders.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Material Orders</h3>
                <div className="space-y-2">
                  {booking.linkedMaterialOrders.map((order) => (
                    <Link
                      key={order._id}
                      href={`/dashboard/customer/material-orders/${order._id}`}
                      className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">
                            {order.merchantProfile.businessName}
                          </p>
                        </div>
                        <div className="text-right">
                          <MaterialOrderStatus currentStatus={order.status} showTimeline={false} />
                          <p className="text-sm font-medium mt-1">
                            NGN{order.totalAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : selectedAlternative ? (
              /* Show selected alternative sourcing option */
              <div className="mt-6">
                <div className={`rounded-lg p-4 ${
                  selectedAlternative === 'customer_sources'
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {selectedAlternative === 'customer_sources' ? '🛒' : '🔧'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">
                        {selectedAlternative === 'customer_sources'
                          ? 'You\'re sourcing materials yourself'
                          : 'Artisan will source materials'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedAlternative === 'customer_sources'
                          ? 'Get the materials listed above and provide them to the artisan.'
                          : 'Material costs are handled outside the platform. Labor is protected by escrow.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedAlternative(null);
                        fetchMerchantQuotes();
                        setShowMaterialsModal(true);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Show option to order materials if quote is accepted/paid */
              ['accepted', 'payment_pending', 'paid', 'in_progress'].includes(booking.status) && (
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => {
                      fetchMerchantQuotes();
                      setShowMaterialsModal(true);
                    }}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Get Merchant Quotes for Materials
                  </button>
                  <Link
                    href={`/shop?bookingId=${booking._id}&materials=${encodeURIComponent(JSON.stringify(booking.materialsList?.map(m => m.name) || []))}`}
                    className="block w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium text-center"
                  >
                    Browse Shop for These Materials
                  </Link>
                  <p className="text-xs text-gray-500 text-center">
                    Compare prices from multiple merchants and order with escrow protection
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Accept/Decline Quote */}
          {booking.status === 'quoted' && (
            <div className="bg-white rounded-xl p-6">
              <div className="flex gap-3">
                <button
                  onClick={acceptQuote}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Accept Quote'}
                </button>
                <button
                  onClick={declineQuote}
                  disabled={actionLoading}
                  className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Pay Button */}
          {(booking.status === 'accepted' || booking.status === 'payment_pending') && booking.finalPrice && (
            <div className="bg-white rounded-xl p-6">
              <button
                onClick={initiatePayment}
                disabled={actionLoading}
                className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : `Pay ₦${booking.finalPrice.toLocaleString()}`}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Payment is held securely until you confirm the job is complete
              </p>
            </div>
          )}

          {/* Certify Button */}
          {booking.status === 'completed' && (
            <div className="bg-white rounded-xl p-6">
              <button
                onClick={certifyJob}
                disabled={actionLoading}
                className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Certify Job Complete'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will release payment to the artisan
              </p>
            </div>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
            >
              Cancel Booking
            </button>
          )}
        </div>

        {/* Reference */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Booking Reference: {booking.paymentReference || booking._id}</p>
          <p>Created: {new Date(booking.createdAt).toLocaleString()}</p>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Cancel Booking</h3>
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (optional)"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-green mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Keep Booking
                </button>
                <button
                  onClick={cancelBooking}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Materials Order Modal */}
        {showMaterialsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Order Materials</h3>
                <button
                  onClick={() => {
                    setShowMaterialsModal(false);
                    setSelectedMerchant(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              {!selectedMerchant ? (
                /* Merchant Comparison View */
                <MerchantComparison
                  quotes={merchantQuotes}
                  onSelectMerchant={setSelectedMerchant}
                  loading={loadingQuotes}
                  onAlternativeSelected={handleAlternativeSelected}
                  selectedAlternative={selectedAlternative}
                />
              ) : (
                /* Order Form View */
                <div>
                  <button
                    onClick={() => setSelectedMerchant(null)}
                    className="text-brand-green hover:underline mb-4"
                  >
                    &larr; Back to merchant selection
                  </button>
                  <h4 className="font-semibold mb-4">
                    Order from {selectedMerchant.merchant.businessName}
                  </h4>
                  <MaterialOrderForm
                    merchant={selectedMerchant.merchant}
                    items={selectedMerchant.items}
                    subtotal={selectedMerchant.subtotal}
                    deliveryFee={selectedMerchant.deliveryFee}
                    totalAmount={selectedMerchant.totalPrice}
                    bookingId={booking._id}
                    artisanAddress={booking.address}
                    onSubmit={createMaterialOrder}
                    onCancel={() => setSelectedMerchant(null)}
                    loading={creatingOrder}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
