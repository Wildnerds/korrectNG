'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ContractView from '@/components/contracts/ContractView';
import ContractSigner from '@/components/contracts/ContractSigner';
import Cookies from 'js-cookie';
import type { JobContract } from '@korrectng/shared';

export default function CustomerContractDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [contract, setContract] = useState<JobContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchContract = async () => {
    try {
      const token = Cookies.get('token');
      const res = await apiFetch<JobContract>(`/contracts/${id}`, { token });
      setContract(res.data || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-10 text-brand-gray">Loading contract...</div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-10">
            <p className="text-red-500 mb-4">{error || 'Contract not found'}</p>
            <Link
              href="/dashboard/customer/contracts"
              className="text-brand-green hover:underline"
            >
              Back to Contracts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const needsSignature = contract.status === 'pending_signatures' && !contract.customerSignature;

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <Link
          href="/dashboard/customer/contracts"
          className="inline-flex items-center gap-2 text-brand-gray hover:text-brand-green mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Contracts
        </Link>

        {/* Signature Section (if needed) */}
        {needsSignature && (
          <div className="mb-6">
            <ContractSigner
              contract={contract}
              userRole="customer"
              onSigned={() => fetchContract()}
            />
          </div>
        )}

        {/* Contract Details */}
        <ContractView contract={contract} />

        {/* Actions */}
        {contract.status === 'signed' && (
          <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
            <p className="text-brand-gray mb-4">
              Both parties have signed the contract. You can now proceed to fund the escrow
              to begin the work.
            </p>
            <Link
              href={`/dashboard/customer/escrow/${contract._id}`}
              className="inline-block px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
            >
              Fund Escrow
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
