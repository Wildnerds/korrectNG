'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import WarrantyClaimModal from './WarrantyClaimModal';

interface Props {
  artisanId: string;
  artisanName: string;
}

export default function WarrantyClaimButton({ artisanId, artisanName }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      showToast('Please sign in to submit a warranty claim', 'warning');
      return;
    }
    if (user.role !== 'customer') {
      showToast('Only customers can submit warranty claims', 'warning');
      return;
    }
    if (!user.isEmailVerified) {
      showToast('Please verify your email to submit warranty claims', 'warning');
      return;
    }
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    showToast('Warranty claim submitted successfully!', 'success');
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="block w-full text-center px-4 py-3 border-2 border-brand-orange text-brand-orange rounded-md hover:bg-brand-orange hover:text-white transition-colors font-semibold mt-3"
      >
        Report Issue / Warranty Claim
      </button>

      <WarrantyClaimModal
        artisanId={artisanId}
        artisanName={artisanName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
