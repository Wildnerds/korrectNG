'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';
import type { JobContract } from '@korrectng/shared';

interface ContractSignerProps {
  contract: JobContract;
  userRole: 'customer' | 'artisan';
  onSigned?: () => void;
}

export default function ContractSigner({ contract, userRole, onSigned }: ContractSignerProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const alreadySigned = userRole === 'customer'
    ? !!contract.customerSignature
    : !!contract.artisanSignature;

  const otherPartySigned = userRole === 'customer'
    ? !!contract.artisanSignature
    : !!contract.customerSignature;

  const handleSign = async () => {
    if (!agreed) {
      setError('You must agree to the contract terms before signing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = Cookies.get('token');
      await apiFetch(`/contracts/${contract._id}/sign`, {
        method: 'POST',
        token,
        body: JSON.stringify({ agreementConfirmed: true }),
      });

      if (onSigned) {
        onSigned();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign contract');
    } finally {
      setLoading(false);
    }
  };

  if (contract.status !== 'pending_signatures') {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-brand-gray">
          {contract.status === 'signed' && 'This contract has been fully executed.'}
          {contract.status === 'draft' && 'This contract is still in draft mode.'}
          {contract.status === 'active' && 'This contract is currently active.'}
          {contract.status === 'completed' && 'This contract has been completed.'}
          {contract.status === 'cancelled' && 'This contract has been cancelled.'}
          {contract.status === 'disputed' && 'This contract is under dispute.'}
        </p>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">You have signed this contract</span>
        </div>
        {!otherPartySigned && (
          <p className="mt-2 text-sm text-green-600">
            Waiting for the other party to sign...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-brand-green">
      <h3 className="text-lg font-semibold mb-4">Sign Contract</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Contract Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Contract Summary</h4>
        <ul className="text-sm text-brand-gray space-y-1">
          <li>Total Amount: ₦{contract.totalAmount.toLocaleString()}</li>
          <li>Start Date: {new Date(contract.startDate).toLocaleDateString()}</li>
          <li>Expected Completion: {new Date(contract.estimatedEndDate).toLocaleDateString()}</li>
          <li>Payment Milestones: {contract.milestones.length}</li>
        </ul>
      </div>

      {/* Signature Status */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg ${contract.customerSignature ? 'bg-green-50' : 'bg-gray-50'}`}>
          <p className="text-sm font-medium">Customer</p>
          <p className="text-xs text-brand-gray">
            {contract.customerSignature
              ? `Signed on ${new Date(contract.customerSignature.signedAt).toLocaleDateString()}`
              : 'Pending signature'}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${contract.artisanSignature ? 'bg-green-50' : 'bg-gray-50'}`}>
          <p className="text-sm font-medium">Artisan</p>
          <p className="text-xs text-brand-gray">
            {contract.artisanSignature
              ? `Signed on ${new Date(contract.artisanSignature.signedAt).toLocaleDateString()}`
              : 'Pending signature'}
          </p>
        </div>
      </div>

      {/* Agreement Checkbox */}
      <label className="flex items-start gap-3 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 w-5 h-5 text-brand-green rounded border-gray-300 focus:ring-brand-green"
        />
        <span className="text-sm text-brand-gray">
          I have read and understood all terms of this contract. I agree to the scope of work,
          deliverables, payment milestones, and timeline specified. I understand that signing
          this contract creates a legally binding agreement.
        </span>
      </label>

      {/* Sign Button */}
      <button
        onClick={handleSign}
        disabled={!agreed || loading}
        className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing...' : 'Sign Contract'}
      </button>

      <p className="mt-4 text-xs text-center text-brand-gray">
        Your IP address and timestamp will be recorded for verification purposes.
      </p>
    </div>
  );
}
