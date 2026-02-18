'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { DisputeForm } from '@/components/disputes';
import Cookies from 'js-cookie';
import type { JobContract } from '@korrectng/shared';

export default function NewDisputePage() {
  const searchParams = useSearchParams();
  const contractId = searchParams.get('contractId');

  const [contract, setContract] = useState<JobContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchContract() {
      if (!contractId) {
        setError('No contract specified');
        setLoading(false);
        return;
      }

      try {
        const token = Cookies.get('token');
        const res = await apiFetch<JobContract>(`/contracts/${contractId}`, { token });
        if (res.data) {
          setContract(res.data);
        } else {
          setError('Contract not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load contract');
      } finally {
        setLoading(false);
      }
    }

    fetchContract();
  }, [contractId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center py-10 text-brand-gray">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center py-10">
            <p className="text-red-500 mb-4">{error || 'Contract not found'}</p>
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
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href={`/dashboard/customer/escrow/${contractId}`}
          className="inline-flex items-center gap-2 text-brand-gray hover:text-brand-green mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Escrow
        </Link>

        <h1 className="text-2xl font-bold mb-6">Open a Dispute</h1>

        <DisputeForm
          contractId={contractId!}
          contractTitle={contract.title}
        />
      </div>
    </div>
  );
}
