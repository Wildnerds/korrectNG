'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';

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
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    avatar?: string;
  };
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

const statusLabels: Record<string, { label: string; color: string; description: string }> = {
  pending: { label: 'Pending Quote', color: 'bg-yellow-100 text-yellow-700', description: 'Send a quote to the customer' },
  quoted: { label: 'Quote Sent', color: 'bg-blue-100 text-blue-700', description: 'Waiting for customer to accept your quote' },
  accepted: { label: 'Quote Accepted', color: 'bg-green-100 text-green-700', description: 'Waiting for customer payment' },
  payment_pending: { label: 'Awaiting Payment', color: 'bg-orange-100 text-orange-700', description: 'Customer needs to complete payment' },
  paid: { label: 'Payment Received', color: 'bg-green-100 text-green-700', description: 'You can now start the job' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', description: 'Job is in progress' },
  completed: { label: 'Pending Confirmation', color: 'bg-purple-100 text-purple-700', description: 'Waiting for customer to confirm completion' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', description: 'Job completed and payment released' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', description: 'You rejected this booking' },
  declined: { label: 'Declined', color: 'bg-gray-100 text-gray-700', description: 'Customer declined your quote' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', description: 'This booking was cancelled' },
  disputed: { label: 'Disputed', color: 'bg-red-100 text-red-700', description: 'There is an open dispute' },
};

export default function ArtisanBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Quote form state
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');

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

  const sendQuote = async () => {
    if (!quotedPrice || parseInt(quotedPrice) < 1000) {
      showToast('Please enter a price of at least 1,000', 'error');
      return;
    }

    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/quote`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          quotedPrice: parseInt(quotedPrice),
          quoteMessage: quoteMessage || undefined,
        }),
      });
      showToast('Quote sent successfully!', 'success');
      setShowQuoteForm(false);
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to send quote', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const rejectBooking = async () => {
    if (!confirm('Are you sure you want to reject this booking?')) return;

    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ status: 'rejected' }),
      });
      showToast('Booking rejected', 'success');
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to reject booking', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const startJob = async () => {
    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ status: 'in_progress' }),
      });
      showToast('Job started!', 'success');
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to start job', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const completeJob = async () => {
    if (!confirm('Mark this job as complete? The customer will be notified to review and certify.')) return;

    setActionLoading(true);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/complete`, {
        method: 'POST',
        token,
      });
      showToast('Job marked as complete! Waiting for customer confirmation.', 'success');
      fetchBooking();
    } catch (error: any) {
      showToast(error.message || 'Failed to complete job', 'error');
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

  if (!booking) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-xl p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Booking Not Found</h1>
            <p className="text-gray-500 mb-6">This booking may have been deleted or you don't have access to it.</p>
            <Link
              href="/dashboard/artisan/bookings"
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
            {booking.expiresAt && ['pending', 'quoted'].includes(booking.status) && (
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

          {/* Earnings display for confirmed jobs */}
          {booking.status === 'confirmed' && booking.artisanEarnings && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-green-800 font-medium">Your Earnings</span>
                <span className="text-2xl font-bold text-green-700">
                  ₦{booking.artisanEarnings.toLocaleString()}
                </span>
              </div>
              <p className="text-green-600 text-xs mt-1">Payment has been released to your account</p>
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Customer</h2>
          <div className="flex items-center gap-4">
            {booking.customer.avatar ? (
              <img
                src={booking.customer.avatar}
                alt={booking.customer.firstName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-light-gray flex items-center justify-center text-2xl text-gray-400">
                {booking.customer.firstName?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="text-lg font-semibold">
                {booking.customer.firstName} {booking.customer.lastName}
              </p>
              {booking.customer.phone && (
                <p className="text-gray-500 text-sm">{booking.customer.phone}</p>
              )}
            </div>
            {booking.customer.phone && (
              <a
                href={`tel:${booking.customer.phone}`}
                className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-brand-green-dark"
              >
                Call
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
              <p className="text-sm text-gray-500 mb-2">Images from Customer</p>
              <div className="flex gap-2 overflow-x-auto">
                {booking.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Job image ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0 cursor-pointer"
                    onClick={() => window.open(img, '_blank')}
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
                  <span className="text-gray-500">Your Quote</span>
                  <span className="font-semibold">₦{booking.quotedPrice.toLocaleString()}</span>
                </div>
              )}
              {booking.finalPrice && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Price</span>
                    <span className="font-semibold">₦{booking.finalPrice.toLocaleString()}</span>
                  </div>
                  {booking.platformFee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Platform Fee (10%)</span>
                      <span className="text-gray-400">-₦{booking.platformFee.toLocaleString()}</span>
                    </div>
                  )}
                  {booking.artisanEarnings && (
                    <div className="flex justify-between text-lg pt-2 border-t">
                      <span className="font-medium">Your Earnings</span>
                      <span className="font-bold text-brand-green">₦{booking.artisanEarnings.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              {booking.quoteMessage && (
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <p className="text-sm text-gray-500 mb-1">Your Message:</p>
                  <p className="text-gray-700 text-sm">{booking.quoteMessage}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Send Quote (for pending) */}
          {booking.status === 'pending' && !showQuoteForm && (
            <div className="bg-white rounded-xl p-6">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="flex-1 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium"
                >
                  Send Quote
                </button>
                <button
                  onClick={rejectBooking}
                  disabled={actionLoading}
                  className="flex-1 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Quote Form */}
          {booking.status === 'pending' && showQuoteForm && (
            <div className="bg-white rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Send Quote</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Price (₦)</label>
                  <input
                    type="number"
                    value={quotedPrice}
                    onChange={(e) => setQuotedPrice(e.target.value)}
                    placeholder="Enter your price"
                    min="1000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-green text-lg"
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimum ₦1,000</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Message (Optional)</label>
                  <textarea
                    value={quoteMessage}
                    onChange={(e) => setQuoteMessage(e.target.value)}
                    placeholder="Add any notes about the quote..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowQuoteForm(false)}
                    className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendQuote}
                    disabled={actionLoading || !quotedPrice}
                    className="flex-1 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                  >
                    {actionLoading ? 'Sending...' : 'Send Quote'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Start Job (for paid) */}
          {booking.status === 'paid' && (
            <div className="bg-white rounded-xl p-6">
              <button
                onClick={startJob}
                disabled={actionLoading}
                className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Start Job'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Mark the job as started to update the customer
              </p>
            </div>
          )}

          {/* Complete Job (for in_progress) */}
          {booking.status === 'in_progress' && (
            <div className="bg-white rounded-xl p-6">
              <button
                onClick={completeJob}
                disabled={actionLoading}
                className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Mark as Complete'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                The customer will be notified to review and certify the job
              </p>
            </div>
          )}

          {/* Waiting states */}
          {booking.status === 'quoted' && (
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <p className="text-blue-800">Waiting for customer to accept or decline your quote</p>
            </div>
          )}

          {booking.status === 'completed' && (
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <p className="text-purple-800">Waiting for customer to certify the job as complete</p>
              <p className="text-purple-600 text-sm mt-1">Payment will be released after confirmation</p>
            </div>
          )}
        </div>

        {/* Reference */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Booking Reference: {booking.paymentReference || booking._id}</p>
          <p>Created: {new Date(booking.createdAt).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
