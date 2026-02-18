'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { EscrowStatus, PaymentProgress, MilestoneApproval } from '@/components/escrow';
import Cookies from 'js-cookie';
import type { EscrowPayment, JobContract } from '@korrectng/shared';

export default function CustomerEscrowPage() {
  const { contractId } = useParams();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  const [escrow, setEscrow] = useState<EscrowPayment | null>(null);
  const [contract, setContract] = useState<JobContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const token = Cookies.get('token');

      // Fetch contract
      const contractRes = await apiFetch<JobContract>(`/contracts/${contractId}`, { token });
      if (contractRes.data) {
        setContract(contractRes.data);
      }

      // Fetch escrow
      const escrowRes = await apiFetch<EscrowPayment>(`/escrow/${contractId}/status`, { token });
      if (escrowRes.data) {
        setEscrow(escrowRes.data);
      }
    } catch (err: any) {
      // Escrow might not exist yet
      if (!err.message?.includes('not found')) {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [contractId]);

  // Refresh data after successful payment
  useEffect(() => {
    if (paymentSuccess) {
      const timer = setTimeout(() => {
        fetchData();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [paymentSuccess]);

  const handleFundEscrow = async () => {
    setFunding(true);
    setError('');

    try {
      const token = Cookies.get('token');
      const res = await apiFetch<{ authorization_url: string }>(`/escrow/${contractId}/fund`, {
        method: 'POST',
        token,
        body: JSON.stringify({}),
      });

      if (res.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
      setFunding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-10 text-brand-gray">Loading escrow details...</div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-10">
            <p className="text-red-500 mb-4">Contract not found</p>
            <Link href="/dashboard/customer/contracts" className="text-brand-green hover:underline">
              Back to Contracts
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
          href={`/dashboard/customer/contracts/${contractId}`}
          className="inline-flex items-center gap-2 text-brand-gray hover:text-brand-green mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Contract
        </Link>

        {/* Payment Success Message */}
        {paymentSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-800">Payment Successful!</p>
                <p className="text-sm text-green-700">
                  Your escrow has been funded. The artisan can now begin work.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h1 className="text-2xl font-bold mb-2">{contract.title}</h1>
          <p className="text-brand-gray">
            Escrow payment with {(contract.artisan as any)?.firstName} {(contract.artisan as any)?.lastName}
          </p>
        </div>

        {/* No Escrow Yet - Show Fund Button */}
        {!escrow && contract.status === 'signed' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">Fund Escrow to Start</h2>
            <p className="text-brand-gray mb-4">
              Both parties have signed the contract. Fund the escrow to allow the artisan to begin work.
              Your payment will be held securely and released in milestones as work progresses.
            </p>

            <div className="p-4 bg-gray-50 rounded-lg mb-6">
              <div className="flex justify-between mb-2">
                <span>Total Contract Value</span>
                <span className="font-semibold">₦{contract.totalAmount.toLocaleString()}</span>
              </div>
              <p className="text-sm text-brand-gray">
                Payments will be released in {contract.milestones.length} milestones:
                {contract.milestones.map((m, i) => ` ${m.percentage}%`).join(', ')}
              </p>
            </div>

            <button
              onClick={handleFundEscrow}
              disabled={funding}
              className="w-full py-4 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
            >
              {funding ? 'Redirecting to Payment...' : `Fund Escrow - ₦${contract.totalAmount.toLocaleString()}`}
            </button>

            <p className="text-sm text-center text-brand-gray mt-4">
              Secure payment via Paystack. Your funds are protected until you approve milestone releases.
            </p>
          </div>
        )}

        {/* Escrow Details */}
        {escrow && (
          <>
            <EscrowStatus escrow={escrow} />

            <div className="mt-6">
              <PaymentProgress escrow={escrow} milestones={contract.milestones} />
            </div>

            <div className="mt-6">
              <MilestoneApproval
                escrow={escrow}
                milestones={contract.milestones}
                userRole="customer"
                onUpdate={fetchData}
              />
            </div>

            {/* Dispute Option */}
            {['funded', 'milestone_1_pending', 'milestone_1_released', 'milestone_2_pending', 'milestone_2_released', 'milestone_3_pending'].includes(escrow.status) && (
              <div className="mt-6 text-center">
                <Link
                  href={`/dashboard/customer/disputes/new?contractId=${contractId}`}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Having issues? Open a dispute
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
