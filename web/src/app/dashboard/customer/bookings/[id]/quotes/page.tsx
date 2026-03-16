'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { QuoteComparison } from '@/components/quotes';
import Cookies from 'js-cookie';

interface Quote {
  _id: string;
  labourCharge: number;
  materialsEstimate?: number;
  totalAmount: number;
  platformFee: number;
  message?: string;
  estimatedDuration?: string;
  externalSourcingRequired: boolean;
  version: number;
  status: string;
  createdAt: string;
  conversation: string;
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  artisanProfile: {
    _id: string;
    businessName: string;
    slug: string;
    trade: string;
    rating?: number;
    reviewCount?: number;
    averageResponseTime?: number;
    completedJobs?: number;
  };
}

interface Booking {
  _id: string;
  jobType: string;
  description: string;
  location: string;
  status: string;
  bookingVersion: string;
}

export default function QuotesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    const token = Cookies.get('token');
    try {
      const [bookingRes, quotesRes] = await Promise.all([
        apiFetch<{ data: Booking }>(`/bookings/${bookingId}`, { token }),
        apiFetch<{ data: { quotes: Quote[] } }>(
          `/bookings/${bookingId}/quotes`,
          { token }
        ),
      ]);

      if (bookingRes.data?.data) {
        setBooking(bookingRes.data.data);
      }

      if (quotesRes.data?.data?.quotes) {
        setQuotes(quotesRes.data.data.quotes);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showToast('Failed to load quotes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    const token = Cookies.get('token');
    setActionLoading(quoteId);

    try {
      const res = await apiFetch(`/quotes/${quoteId}/accept`, {
        method: 'POST',
        token,
      });

      if (res.success) {
        showToast('Quote accepted! Redirecting to payment...', 'success');
        // Redirect to booking detail page for payment
        router.push(`/dashboard/customer/bookings/${bookingId}`);
      } else {
        showToast(res.error || 'Failed to accept quote', 'error');
      }
    } catch (error) {
      console.error('Failed to accept quote:', error);
      showToast('Failed to accept quote', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    const token = Cookies.get('token');
    setActionLoading(quoteId);

    try {
      const res = await apiFetch(`/quotes/${quoteId}/reject`, {
        method: 'POST',
        token,
      });

      if (res.success) {
        showToast('Quote declined', 'info');
        // Remove from list
        setQuotes((prev) => prev.filter((q) => q._id !== quoteId));
      } else {
        showToast(res.error || 'Failed to decline quote', 'error');
      }
    } catch (error) {
      console.error('Failed to reject quote:', error);
      showToast('Failed to decline quote', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChat = (quoteId: string) => {
    const quote = quotes.find((q) => q._id === quoteId);
    if (quote?.conversation) {
      router.push(`/dashboard/messages/${quote.conversation}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-96 mb-8" />
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500">Booking not found</p>
            <Link
              href="/dashboard/customer/bookings"
              className="text-brand-green hover:underline mt-2 inline-block"
            >
              Back to Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if booking is not open for quotes
  if (booking.bookingVersion !== 'v2') {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">
              This booking doesn't support multiple quotes.
            </p>
            <Link
              href={`/dashboard/customer/bookings/${bookingId}`}
              className="text-brand-green hover:underline"
            >
              View Booking Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/dashboard/customer/bookings/${bookingId}`}
            className="text-brand-green hover:underline text-sm flex items-center gap-1 mb-2"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Booking
          </Link>
          <h1 className="text-2xl font-bold text-brand-black mb-1">
            Quotes for {booking.jobType}
          </h1>
          <p className="text-gray-500">
            {booking.location} • {booking.description.substring(0, 100)}
            {booking.description.length > 100 && '...'}
          </p>
        </div>

        {/* Status banner */}
        {booking.status === 'open' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
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
                Your booking is open for quotes
              </p>
              <p className="text-sm text-blue-600">
                Artisans can see your request and send quotes. Compare and
                choose the best one.
              </p>
            </div>
          </div>
        )}

        {booking.status === 'payment_pending' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800">
                Quote accepted! Proceed to payment
              </p>
              <p className="text-sm text-green-600">
                Complete your payment to begin the job.
              </p>
            </div>
            <Link
              href={`/dashboard/customer/bookings/${bookingId}`}
              className="px-4 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark transition-colors"
            >
              Pay Now
            </Link>
          </div>
        )}

        {/* Quote comparison */}
        <QuoteComparison
          quotes={quotes}
          onAccept={handleAcceptQuote}
          onReject={handleRejectQuote}
          onChat={handleChat}
          actionLoading={actionLoading}
        />
      </div>
    </div>
  );
}
