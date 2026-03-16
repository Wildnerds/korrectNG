'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';
import { formatDistanceToNow } from 'date-fns';

interface OpenBooking {
  _id: string;
  jobType: string;
  description: string;
  location: string;
  address: string;
  images?: string[];
  scheduledDate?: string;
  scheduledTime?: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    location?: string;
  };
}

export default function OpenBookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<OpenBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    trade: '',
    location: '',
  });

  useEffect(() => {
    fetchOpenBookings();
  }, []);

  const fetchOpenBookings = async () => {
    const token = Cookies.get('token');
    try {
      let url = '/bookings/open-jobs?limit=50';
      if (filter.trade) url += `&trade=${encodeURIComponent(filter.trade)}`;
      if (filter.location) url += `&location=${encodeURIComponent(filter.location)}`;

      const res = await apiFetch<{ data: { bookings: OpenBooking[] } }>(url, {
        token,
      });

      if (res.data?.data?.bookings) {
        setBookings(res.data.data.bookings);
      }
    } catch (error) {
      console.error('Failed to fetch open bookings:', error);
      showToast('Failed to load open jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuote = (bookingId: string) => {
    router.push(`/dashboard/artisan/bookings/${bookingId}?action=quote`);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-black">Open Jobs</h1>
            <p className="text-gray-500">
              Browse job requests and send quotes to customers
            </p>
          </div>
          <Link
            href="/dashboard/artisan/bookings"
            className="text-brand-green hover:underline text-sm"
          >
            My Bookings →
          </Link>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-blue-800">
                How it works
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Browse open job requests matching your trade. Send competitive quotes
                with your labour charge and estimated materials cost. Customers will
                compare quotes and choose the best artisan for their needs. Platform fee
                is only 10% of your labour charge.
              </p>
            </div>
          </div>
        </div>

        {/* Jobs list */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 mb-2">No open jobs found</p>
            <p className="text-sm text-gray-400">
              There are no job requests matching your trade right now.
              Check back later!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const timeAgo = formatDistanceToNow(new Date(booking.createdAt), {
                addSuffix: true,
              });
              const expiresIn = booking.expiresAt
                ? formatDistanceToNow(new Date(booking.expiresAt))
                : null;

              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        {/* Customer avatar */}
                        {booking.customer.avatar ? (
                          <img
                            src={booking.customer.avatar}
                            alt={`${booking.customer.firstName} ${booking.customer.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-semibold">
                            {getInitials(
                              booking.customer.firstName,
                              booking.customer.lastName
                            )}
                          </div>
                        )}

                        <div>
                          <h3 className="font-semibold text-lg text-brand-black">
                            {booking.jobType}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {booking.customer.firstName}{' '}
                            {booking.customer.lastName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Open for Quotes
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 mb-4">
                      {booking.description.length > 200
                        ? `${booking.description.substring(0, 200)}...`
                        : booking.description}
                    </p>

                    {/* Details */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>{booking.location}</span>
                      </div>

                      {booking.scheduledDate && (
                        <div className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>
                            {new Date(booking.scheduledDate).toLocaleDateString()}
                            {booking.scheduledTime && ` at ${booking.scheduledTime}`}
                          </span>
                        </div>
                      )}

                      {expiresIn && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>Expires in {expiresIn}</span>
                        </div>
                      )}
                    </div>

                    {/* Images preview */}
                    {booking.images && booking.images.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {booking.images.slice(0, 3).map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`Job image ${i + 1}`}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ))}
                        {booking.images.length > 3 && (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                            +{booking.images.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleSubmitQuote(booking._id)}
                        className="flex-1 py-2.5 px-4 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark transition-colors"
                      >
                        Submit Quote
                      </button>
                      <Link
                        href={`/dashboard/artisan/bookings/${booking._id}`}
                        className="py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
