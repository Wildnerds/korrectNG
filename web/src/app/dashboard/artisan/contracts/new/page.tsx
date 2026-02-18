'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ContractBuilder from '@/components/contracts/ContractBuilder';
import Cookies from 'js-cookie';

interface Booking {
  _id: string;
  jobType: string;
  description: string;
  finalPrice?: number;
  estimatedPrice: number;
  status: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  artisanProfile: {
    trade: string;
    businessName: string;
  };
}

export default function NewContractPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) {
        setError('No booking specified');
        setLoading(false);
        return;
      }

      try {
        const token = Cookies.get('token');
        const res = await apiFetch<Booking>(`/bookings/${bookingId}`, { token });

        if (!res.data) {
          setError('Booking not found');
          return;
        }

        // Check if booking is in valid state for contract creation
        if (!['accepted', 'payment_pending'].includes(res.data.status)) {
          setError('Contracts can only be created for accepted bookings');
          return;
        }

        setBooking(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-10 text-brand-gray">Loading booking details...</div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-10">
            <p className="text-red-500 mb-4">{error || 'Unable to create contract'}</p>
            <Link
              href="/dashboard/artisan/bookings"
              className="text-brand-green hover:underline"
            >
              Back to Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <Link
          href={`/dashboard/artisan/bookings/${bookingId}`}
          className="inline-flex items-center gap-2 text-brand-gray hover:text-brand-green mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Booking
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Contract</h1>
          <p className="text-brand-gray">
            Create a formal contract for {booking.customer.firstName} {booking.customer.lastName}
          </p>
        </div>

        {/* Booking Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold mb-4">Booking Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-brand-gray">Customer</p>
              <p className="font-medium">{booking.customer.firstName} {booking.customer.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-brand-gray">Service Type</p>
              <p className="font-medium">{booking.jobType}</p>
            </div>
            <div>
              <p className="text-sm text-brand-gray">Agreed Price</p>
              <p className="font-medium">₦{(booking.finalPrice || booking.estimatedPrice).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-brand-gray">Trade</p>
              <p className="font-medium capitalize">{booking.artisanProfile?.trade?.replace(/-/g, ' ')}</p>
            </div>
          </div>
        </div>

        {/* Contract Builder */}
        <ContractBuilder
          bookingId={booking._id}
          booking={booking}
          onSuccess={(contractId) => router.push(`/dashboard/artisan/contracts/${contractId}`)}
        />
      </div>
    </div>
  );
}
