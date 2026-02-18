'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';
import type { Dispute } from '@korrectng/shared';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  opened: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Opened' },
  artisan_response_pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Awaiting Artisan' },
  customer_counter_pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Your Response Needed' },
  under_review: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Under Review' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Resolved' },
  escalated: { bg: 'bg-red-100', text: 'text-red-700', label: 'Escalated' },
};

export default function CustomerDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchDisputes() {
      try {
        const token = Cookies.get('token');
        const endpoint = filter === 'all' ? '/disputes' : `/disputes?status=${filter}`;
        const res = await apiFetch<{ disputes: Dispute[] }>(endpoint, { token });
        setDisputes(res.data?.disputes || []);
      } catch {
        // Handle silently
      } finally {
        setLoading(false);
      }
    }
    fetchDisputes();
  }, [filter]);

  const activeDisputes = disputes.filter(d => !['resolved'].includes(d.status));
  const actionRequired = disputes.filter(d => d.status === 'customer_counter_pending');

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Disputes</h1>
            <p className="text-brand-gray">Track and manage your dispute cases</p>
          </div>
        </div>

        {/* Action Required Alert */}
        {actionRequired.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-blue-800">
                  {actionRequired.length} dispute{actionRequired.length > 1 ? 's' : ''} need{actionRequired.length === 1 ? 's' : ''} your response
                </p>
                <p className="text-sm text-blue-700">
                  The artisan has responded. Review and submit your counter if needed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'artisan_response_pending', 'customer_counter_pending', 'under_review', 'resolved'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-brand-gray hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : statusColors[status]?.label || status}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-brand-gray">Loading disputes...</div>
        ) : disputes.length > 0 ? (
          <div className="space-y-4">
            {disputes.map(dispute => {
              const statusStyle = statusColors[dispute.status] || statusColors.opened;
              const needsAction = dispute.status === 'customer_counter_pending';

              return (
                <Link key={dispute._id} href={`/dashboard/customer/disputes/${dispute._id}`}>
                  <div className={`bg-white rounded-xl p-5 hover:shadow-lg transition-shadow ${
                    needsAction ? 'border-2 border-blue-300' : ''
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">
                            {(dispute.contract as any)?.title || 'Contract Dispute'}
                          </h3>
                          {needsAction && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              Action Required
                            </span>
                          )}
                        </div>
                        <p className="text-brand-gray text-sm mb-2 capitalize">
                          Category: {dispute.category.replace(/_/g, ' ')}
                        </p>
                        <p className="text-brand-gray text-sm line-clamp-2">
                          {dispute.description}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </div>

                    <div className="mt-4 flex justify-between items-center text-sm text-brand-gray">
                      <span>
                        Opened: {new Date(dispute.createdAt).toLocaleDateString()}
                      </span>
                      {dispute.decision && (
                        <span className="capitalize">
                          Decision: {dispute.decision.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-xl text-brand-gray mb-4">No disputes</p>
            <p className="text-brand-gray">
              You haven&apos;t opened any disputes. If you have issues with a contract,
              you can open a dispute from the escrow page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
