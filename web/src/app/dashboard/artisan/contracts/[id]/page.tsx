'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ContractView from '@/components/contracts/ContractView';
import ContractSigner from '@/components/contracts/ContractSigner';
import Cookies from 'js-cookie';
import type { JobContract } from '@korrectng/shared';

export default function ArtisanContractDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [contract, setContract] = useState<JobContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

  const handleSend = async () => {
    if (!confirm('Send this contract to the customer for review and signature?')) return;

    setSending(true);
    try {
      const token = Cookies.get('token');
      await apiFetch(`/contracts/${id}/send`, {
        method: 'POST',
        token,
      });
      fetchContract();
    } catch (err: any) {
      alert(err.message || 'Failed to send contract');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return; // User clicked cancel

    setCancelling(true);
    try {
      const token = Cookies.get('token');
      await apiFetch(`/contracts/${id}/cancel`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      });
      router.push('/dashboard/artisan/contracts');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel contract');
    } finally {
      setCancelling(false);
    }
  };

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
              href="/dashboard/artisan/contracts"
              className="text-brand-green hover:underline"
            >
              Back to Contracts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDraft = contract.status === 'draft';
  const needsSignature = contract.status === 'pending_signatures' && !contract.artisanSignature;
  const canCancel = ['draft', 'pending_signatures'].includes(contract.status);

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <Link
          href="/dashboard/artisan/contracts"
          className="inline-flex items-center gap-2 text-brand-gray hover:text-brand-green mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Contracts
        </Link>

        {/* Draft Actions */}
        {isDraft && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Draft Contract</h3>
            <p className="text-blue-700 mb-4">
              This contract is still in draft mode. Review the details and send it to
              the customer when ready.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-6 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-medium disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send to Customer'}
              </button>
              <Link
                href={`/dashboard/artisan/contracts/${id}/edit`}
                className="px-6 py-2 border-2 border-brand-green text-brand-green rounded-md hover:bg-brand-green hover:text-white transition-colors font-medium"
              >
                Edit Contract
              </Link>
            </div>
          </div>
        )}

        {/* Signature Section (if needed) */}
        {needsSignature && (
          <div className="mb-6">
            <ContractSigner
              contract={contract}
              userRole="artisan"
              onSigned={() => fetchContract()}
            />
          </div>
        )}

        {/* Contract Details */}
        <ContractView contract={contract} />

        {/* Status-based Actions */}
        {contract.status === 'signed' && (
          <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
            <p className="text-brand-gray mb-4">
              Both parties have signed the contract. The customer needs to fund the escrow
              before work can begin. You&apos;ll be notified when the escrow is funded.
            </p>
          </div>
        )}

        {contract.status === 'active' && (
          <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Active Contract</h3>
            <p className="text-brand-gray mb-4">
              Work is in progress. Track milestone completion and request payment releases
              as you complete each phase.
            </p>
            <Link
              href={`/dashboard/artisan/escrow/${contract._id}`}
              className="inline-block px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
            >
              Manage Milestones
            </Link>
          </div>
        )}

        {/* Cancel Action */}
        {canCancel && (
          <div className="mt-6 text-center">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Contract'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
