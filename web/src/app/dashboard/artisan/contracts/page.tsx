'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';
import type { JobContract } from '@korrectng/shared';

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  pending_signatures: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  signed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  active: { bg: 'bg-brand-green/10', text: 'text-brand-green' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  disputed: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

export default function ArtisanContractsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<JobContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchContracts() {
      try {
        const token = Cookies.get('token');
        const endpoint = filter === 'all' ? '/contracts' : `/contracts?status=${filter}`;
        const res = await apiFetch<{ contracts: JobContract[] }>(endpoint, { token });
        setContracts(res.data?.contracts || []);
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }
    fetchContracts();
  }, [filter]);

  const draftContracts = contracts.filter(c => c.status === 'draft');
  const pendingSignature = contracts.filter(
    c => c.status === 'pending_signatures' && !c.artisanSignature
  );

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Contracts</h1>
            <p className="text-brand-gray">Manage your service contracts with customers</p>
          </div>
        </div>

        {/* Action Alerts */}
        {(draftContracts.length > 0 || pendingSignature.length > 0) && (
          <div className="mb-6 space-y-4">
            {draftContracts.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800">
                      {draftContracts.length} draft contract{draftContracts.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-blue-700">
                      Complete and send to customers for signing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {pendingSignature.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-800">
                      {pendingSignature.length} contract{pendingSignature.length > 1 ? 's' : ''} awaiting your signature
                    </p>
                    <p className="text-sm text-yellow-700">
                      Sign to finalize the contract.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'draft', 'pending_signatures', 'signed', 'active', 'completed', 'disputed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-brand-gray hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-brand-gray">Loading contracts...</div>
        ) : contracts.length > 0 ? (
          <div className="space-y-4">
            {contracts.map(contract => {
              const statusStyle = statusColors[contract.status] || statusColors.draft;
              const needsSignature = contract.status === 'pending_signatures' && !contract.artisanSignature;
              const isDraft = contract.status === 'draft';

              return (
                <Link key={contract._id} href={`/dashboard/artisan/contracts/${contract._id}`}>
                  <div className={`bg-white rounded-xl p-5 hover:shadow-lg transition-shadow ${
                    needsSignature || isDraft ? 'border-2 border-yellow-300' : ''
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{contract.title}</h3>
                          {needsSignature && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                              Sign Required
                            </span>
                          )}
                          {isDraft && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              Draft
                            </span>
                          )}
                        </div>
                        <p className="text-brand-gray text-sm mb-2">
                          for {(contract.customer as any)?.firstName} {(contract.customer as any)?.lastName}
                        </p>
                        <div className="flex gap-4 text-sm">
                          <span className="text-brand-green font-semibold">
                            ₦{contract.artisanEarnings.toLocaleString()} earnings
                          </span>
                          <span className="text-brand-gray">
                            {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.estimatedEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                        {contract.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Milestone Progress */}
                    <div className="mt-4">
                      <div className="flex gap-1">
                        {contract.milestones.map((m, i) => (
                          <div
                            key={i}
                            className={`h-2 rounded-full ${
                              m.status === 'approved' ? 'bg-green-500' :
                              m.status === 'completed' ? 'bg-yellow-500' :
                              m.status === 'in_progress' ? 'bg-blue-500' :
                              'bg-gray-200'
                            }`}
                            style={{ width: `${m.percentage}%` }}
                            title={`${m.name} (${m.percentage}%) - ${m.status}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-brand-gray mt-1">
                        {contract.milestones.filter(m => m.status === 'approved').length} of {contract.milestones.length} milestones completed
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-xl text-brand-gray mb-4">No contracts yet</p>
            <p className="text-brand-gray mb-6">
              When you accept a booking, you can create a contract to formalize the agreement.
            </p>
            <Link
              href="/dashboard/artisan/bookings"
              className="inline-block px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
            >
              View Bookings
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
