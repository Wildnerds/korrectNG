'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { EscrowStatus, PaymentProgress, MilestoneApproval } from '@/components/escrow';
import Cookies from 'js-cookie';
import type { EscrowPayment, JobContract } from '@korrectng/shared';

export default function ArtisanEscrowPage() {
  const { contractId } = useParams();

  const [escrow, setEscrow] = useState<EscrowPayment | null>(null);
  const [contract, setContract] = useState<JobContract | null>(null);
  const [loading, setLoading] = useState(true);
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
            <Link href="/dashboard/artisan/contracts" className="text-brand-green hover:underline">
              Back to Contracts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const artisanEarnings = contract.totalAmount - contract.platformFee;

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <Link
          href={`/dashboard/artisan/contracts/${contractId}`}
          className="inline-flex items-center gap-2 text-brand-gray hover:text-brand-green mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Contract
        </Link>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h1 className="text-2xl font-bold mb-2">{contract.title}</h1>
          <p className="text-brand-gray">
            Contract with {(contract.customer as any)?.firstName} {(contract.customer as any)?.lastName}
          </p>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-brand-gray">Your Potential Earnings</span>
              <span className="text-2xl font-bold text-green-600">
                ₦{artisanEarnings.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-brand-gray mt-1">
              After 10% platform fee (₦{contract.platformFee.toLocaleString()})
            </p>
          </div>
        </div>

        {/* Waiting for Funding */}
        {!escrow && contract.status === 'signed' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Waiting for Customer to Fund Escrow</h2>
                <p className="text-brand-gray">
                  The contract has been signed. Work can begin once the customer funds the escrow.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Escrow Details */}
        {escrow && (
          <>
            {/* Escrow Funded Alert */}
            {escrow.status === 'funded' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">Escrow Funded - Ready to Start!</p>
                    <p className="text-sm text-green-700">
                      The customer has funded the escrow. You can now begin work on the first milestone.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <EscrowStatus escrow={escrow} />

            <div className="mt-6">
              <PaymentProgress escrow={escrow} milestones={contract.milestones} />
            </div>

            <div className="mt-6">
              <MilestoneApproval
                escrow={escrow}
                milestones={contract.milestones}
                userRole="artisan"
                onUpdate={fetchData}
              />
            </div>

            {/* Tips for Getting Approvals */}
            {['funded', 'milestone_1_released', 'milestone_2_released'].includes(escrow.status) && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-800 mb-2">Tips for Smooth Approvals</h3>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Communicate progress regularly with the customer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Document your work with photos before requesting release</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Ensure deliverables match the contract specifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Address any concerns before marking milestones complete</span>
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
