'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { BookingRequestModal } from '@/components/BookingRequestModal';

interface BookingButtonProps {
  artisanProfileId: string;
  artisanName: string;
  trade: string;
}

export default function BookingButton({ artisanProfileId, artisanName, trade }: BookingButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      showToast('Please sign in to request a booking', 'warning');
      return;
    }

    if (!user.isEmailVerified) {
      showToast('Please verify your email to request bookings', 'warning');
      return;
    }

    if (user.role === 'artisan') {
      showToast('Artisans cannot book other artisans', 'warning');
      return;
    }

    // Check if profile is complete
    if (!user.firstName || !user.lastName || !user.phone) {
      showToast('Please complete your profile to request bookings', 'warning');
      return;
    }

    setIsModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full py-3 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark transition-all duration-200 font-semibold flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Request Booking
      </button>

      <BookingRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        artisanProfileId={artisanProfileId}
        artisanName={artisanName}
        trade={trade}
      />
    </>
  );
}
