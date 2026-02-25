'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';

interface Booking {
  _id: string;
  jobType: string;
  description: string;
  location: string;
  address: string;
  status: string;
  quotedPrice?: number;
  finalPrice?: number;
  images?: string[];
  scheduledDate?: string;
  createdAt: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'New Request', color: 'bg-yellow-100 text-yellow-700' },
  quoted: { label: 'Quote Sent', color: 'bg-blue-100 text-blue-700' },
  payment_pending: { label: 'Awaiting Payment', color: 'bg-orange-100 text-orange-700' },
  paid: { label: 'Paid - Ready to Start', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  confirmed: { label: 'Confirmed & Paid', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  declined: { label: 'Customer Declined', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
};

export default function ArtisanBookingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [quoteModal, setQuoteModal] = useState<{ bookingId: string; isOpen: boolean } | null>(null);
  const [quoteForm, setQuoteForm] = useState({ price: '', message: '' });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const token = Cookies.get('token');
    try {
      const response = await apiFetch<{ bookings: Booking[] }>('/bookings', { token });
      setBookings(response.data?.bookings || []);
    } catch (error) {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendQuote = async (bookingId: string) => {
    if (!quoteForm.price || parseInt(quoteForm.price) < 1000) {
      showToast('Please enter a valid price (minimum ₦1,000)', 'error');
      return;
    }

    setActionLoading(bookingId);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/quote`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          quotedPrice: parseInt(quoteForm.price),
          quoteMessage: quoteForm.message || undefined,
        }),
      });
      showToast('Quote sent successfully!', 'success');
      setQuoteModal(null);
      setQuoteForm({ price: '', message: '' });
      fetchBookings();
    } catch (error: any) {
      showToast(error.message || 'Failed to send quote', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to reject this booking request?')) return;

    setActionLoading(bookingId);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ status: 'rejected' }),
      });
      showToast('Booking rejected', 'success');
      fetchBookings();
    } catch (error: any) {
      showToast(error.message || 'Failed to reject booking', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const startWork = async (bookingId: string) => {
    setActionLoading(bookingId);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        token,
        body: JSON.stringify({ status: 'in_progress' }),
      });
      showToast('Work started!', 'success');
      fetchBookings();
    } catch (error: any) {
      showToast(error.message || 'Failed to start work', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const markComplete = async (bookingId: string) => {
    setActionLoading(bookingId);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/complete`, {
        method: 'POST',
        token,
      });
      showToast('Job marked as complete. Awaiting customer certification.', 'success');
      fetchBookings();
    } catch (error: any) {
      showToast(error.message || 'Failed to mark complete', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Booking Requests</h1>
            {pendingCount > 0 && (
              <p className="text-brand-green font-medium">
                {pendingCount} new request{pendingCount > 1 ? 's' : ''} awaiting your quote
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'pending', 'quoted', 'paid', 'in_progress', 'completed', 'confirmed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : statusLabels[status]?.label || status}
              {status === 'pending' && pendingCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500">No bookings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{booking.jobType}</h3>
                    <p className="text-gray-500 text-sm">
                      From: {booking.customer.firstName} {booking.customer.lastName}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[booking.status]?.color || 'bg-gray-100'}`}>
                    {statusLabels[booking.status]?.label || booking.status}
                  </span>
                </div>

                <p className="text-gray-600 mb-4">{booking.description}</p>

                {/* Show images if any */}
                {booking.images && booking.images.length > 0 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto">
                    {booking.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Job image ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-90"
                        onClick={() => window.open(img, '_blank')}
                      />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-4">
                  <div>
                    <span className="font-medium text-gray-700">Location:</span> {booking.location}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Address:</span> {booking.address}
                  </div>
                  {booking.scheduledDate && (
                    <div>
                      <span className="font-medium text-gray-700">Preferred Date:</span>{' '}
                      {new Date(booking.scheduledDate).toLocaleDateString()}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span> {booking.customer.phone}
                  </div>
                </div>

                {/* Action buttons based on status */}
                {booking.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setQuoteModal({ bookingId: booking._id, isOpen: true });
                        setQuoteForm({ price: '', message: '' });
                      }}
                      className="flex-1 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium"
                    >
                      Send Quote
                    </button>
                    <button
                      onClick={() => rejectBooking(booking._id)}
                      disabled={actionLoading === booking._id}
                      className="px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {booking.status === 'quoted' && booking.quotedPrice && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800">
                      Your quote: <span className="font-bold text-xl">₦{booking.quotedPrice.toLocaleString()}</span>
                    </p>
                    <p className="text-blue-600 text-sm mt-1">Waiting for customer response...</p>
                  </div>
                )}

                {booking.status === 'paid' && (
                  <button
                    onClick={() => startWork(booking._id)}
                    disabled={actionLoading === booking._id}
                    className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                  >
                    {actionLoading === booking._id ? 'Processing...' : 'Start Work'}
                  </button>
                )}

                {booking.status === 'in_progress' && (
                  <button
                    onClick={() => markComplete(booking._id)}
                    disabled={actionLoading === booking._id}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
                  >
                    {actionLoading === booking._id ? 'Processing...' : 'Mark as Complete'}
                  </button>
                )}

                {booking.status === 'completed' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-purple-800 font-medium">
                      Waiting for customer to certify completion...
                    </p>
                    <p className="text-purple-600 text-sm mt-1">
                      Payment will be released once the customer confirms.
                    </p>
                  </div>
                )}

                {booking.status === 'confirmed' && booking.finalPrice && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      Job completed! Earnings: ₦{Math.round(booking.finalPrice * 0.9).toLocaleString()}
                    </p>
                    <p className="text-green-600 text-sm mt-1">
                      Payment has been released to your account.
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-400 pt-4 border-t mt-4">
                  Received {new Date(booking.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quote Modal */}
      {quoteModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Send Price Quote</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Your Price (₦) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={quoteForm.price}
                  onChange={(e) => setQuoteForm({ ...quoteForm, price: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green"
                  placeholder="e.g., 15000"
                  min="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-green min-h-[100px]"
                  placeholder="Any notes about the quote, materials needed, etc."
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p>Platform fee: 10% will be deducted from your earnings</p>
                {quoteForm.price && parseInt(quoteForm.price) >= 1000 && (
                  <p className="mt-1 font-medium text-brand-green">
                    Your earnings: ₦{Math.round(parseInt(quoteForm.price) * 0.9).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setQuoteModal(null)}
                  className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendQuote(quoteModal.bookingId)}
                  disabled={actionLoading === quoteModal.bookingId}
                  className="flex-1 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                >
                  {actionLoading === quoteModal.bookingId ? 'Sending...' : 'Send Quote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
