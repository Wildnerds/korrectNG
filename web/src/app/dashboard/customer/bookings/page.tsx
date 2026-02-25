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
  quoteMessage?: string;
  finalPrice?: number;
  images?: string[];
  scheduledDate?: string;
  createdAt: string;
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  artisanProfile: {
    _id: string;
    businessName: string;
    slug: string;
    trade: string;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Awaiting Quote', color: 'bg-yellow-100 text-yellow-700' },
  quoted: { label: 'Quote Received', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  payment_pending: { label: 'Awaiting Payment', color: 'bg-orange-100 text-orange-700' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  declined: { label: 'Declined', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
  disputed: { label: 'Disputed', color: 'bg-red-100 text-red-700' },
};

export default function CustomerBookingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

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

  const acceptQuote = async (bookingId: string) => {
    setActionLoading(bookingId);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/accept-quote`, {
        method: 'POST',
        token,
      });
      showToast('Quote accepted! Proceed to payment.', 'success');
      fetchBookings();
    } catch (error: any) {
      showToast(error.message || 'Failed to accept quote', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const declineQuote = async (bookingId: string) => {
    if (!confirm('Are you sure you want to decline this quote?')) return;

    setActionLoading(bookingId);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/decline-quote`, {
        method: 'POST',
        token,
      });
      showToast('Quote declined', 'success');
      fetchBookings();
    } catch (error: any) {
      showToast(error.message || 'Failed to decline quote', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const initiatePayment = async (bookingId: string) => {
    setActionLoading(bookingId);
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
      setActionLoading(null);
    }
  };

  const certifyJob = async (bookingId: string) => {
    if (!confirm('Are you satisfied with the job? This will release payment to the artisan.')) return;

    setActionLoading(bookingId);
    const token = Cookies.get('token');
    try {
      await apiFetch(`/bookings/${bookingId}/certify`, {
        method: 'POST',
        token,
      });
      showToast('Job certified! Payment has been released.', 'success');
      fetchBookings();
    } catch (error: any) {
      showToast(error.message || 'Failed to certify job', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

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
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <Link
            href="/search"
            className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium"
          >
            Find Artisans
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'pending', 'quoted', 'payment_pending', 'in_progress', 'completed'].map((status) => (
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
            </button>
          ))}
        </div>

        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">No bookings found</p>
            <Link
              href="/search"
              className="inline-block px-6 py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium"
            >
              Find an Artisan
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Link
                      href={`/artisan/${booking.artisanProfile.slug}`}
                      className="text-lg font-semibold hover:text-brand-green"
                    >
                      {booking.artisanProfile.businessName}
                    </Link>
                    <p className="text-gray-500 text-sm">{booking.jobType}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[booking.status]?.color || 'bg-gray-100'}`}>
                    {statusLabels[booking.status]?.label || booking.status}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4">{booking.description}</p>

                {/* Show images if any */}
                {booking.images && booking.images.length > 0 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto">
                    {booking.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Job image ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    ))}
                  </div>
                )}

                <div className="text-sm text-gray-500 mb-4">
                  <span>{booking.location}</span>
                  {booking.scheduledDate && (
                    <span className="ml-4">
                      Scheduled: {new Date(booking.scheduledDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Quote section */}
                {booking.status === 'quoted' && booking.quotedPrice && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-blue-800">Quote Received</span>
                      <span className="text-2xl font-bold text-blue-800">
                        ₦{booking.quotedPrice.toLocaleString()}
                      </span>
                    </div>
                    {booking.quoteMessage && (
                      <p className="text-blue-700 text-sm">{booking.quoteMessage}</p>
                    )}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => acceptQuote(booking._id)}
                        disabled={actionLoading === booking._id}
                        className="flex-1 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                      >
                        {actionLoading === booking._id ? 'Processing...' : 'Accept Quote'}
                      </button>
                      <button
                        onClick={() => declineQuote(booking._id)}
                        disabled={actionLoading === booking._id}
                        className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Payment button */}
                {booking.status === 'payment_pending' && booking.finalPrice && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-orange-800">Payment Required</span>
                      <span className="text-2xl font-bold text-orange-800">
                        ₦{booking.finalPrice.toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => initiatePayment(booking._id)}
                      disabled={actionLoading === booking._id}
                      className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                    >
                      {actionLoading === booking._id ? 'Processing...' : 'Pay Now (Escrow)'}
                    </button>
                    <p className="text-xs text-orange-600 mt-2 text-center">
                      Payment is held securely until you confirm the job is complete
                    </p>
                  </div>
                )}

                {/* Certify button */}
                {booking.status === 'completed' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <p className="text-purple-800 font-medium mb-3">
                      The artisan has marked this job as complete. Please review and certify.
                    </p>
                    <button
                      onClick={() => certifyJob(booking._id)}
                      disabled={actionLoading === booking._id}
                      className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark font-medium disabled:opacity-50"
                    >
                      {actionLoading === booking._id ? 'Processing...' : 'Certify Job Complete'}
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t">
                  <span>Created {new Date(booking.createdAt).toLocaleDateString()}</span>
                  <Link
                    href={`/dashboard/customer/bookings/${booking._id}`}
                    className="text-brand-green hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
