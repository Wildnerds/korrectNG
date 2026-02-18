'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import type { VerificationApplication } from '@korrectng/shared';
import { getTradeLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

export default function VerificationsPage() {
  const { showToast } = useToast();
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('in-review');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  async function fetchApplications() {
    const token = Cookies.get('token');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: VerificationApplication[] }>(
        `/admin/verifications?status=${filter}`,
        { token }
      );
      setApplications(res.data?.data || []);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(id: string, status: 'approved' | 'rejected', notes?: string) {
    const token = Cookies.get('token');
    try {
      await apiFetch(`/admin/verifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes: notes }),
        token,
      });
      showToast(`Application ${status}`, 'success');
      fetchApplications();
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error');
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Verification Queue</h1>

      <div className="flex gap-2 mb-6">
        {['in-review', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === s
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            {s.replace('-', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app) => {
            const artisan = app.artisan as any;
            const user = artisan?.user as any;
            return (
              <div key={app._id} className="bg-white rounded-xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{artisan?.businessName || 'Unknown'}</h3>
                    <p className="text-brand-gray text-sm">
                      {artisan?.trade ? getTradeLabel(artisan.trade) : ''} - {artisan?.location}
                    </p>
                    <p className="text-sm text-brand-gray mt-1">
                      {user?.firstName} {user?.lastName} - {user?.email}
                    </p>
                    <div className="mt-3 space-y-3">
                      {app.documents.map((doc: any) => (
                        <div key={doc.publicId} className="border-l-2 border-gray-200 pl-3">
                          <div className="flex items-center gap-3">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-brand-green hover:underline font-medium"
                            >
                              View {doc.type}
                            </a>
                            {doc.validationResult && (
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  doc.validationResult.isValid
                                    ? doc.validationResult.confidence === 'high'
                                      ? 'bg-green-100 text-green-700'
                                      : doc.validationResult.confidence === 'medium'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-orange-100 text-orange-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {doc.validationResult.isValid
                                  ? `Valid (${doc.validationResult.confidence} confidence)`
                                  : 'Needs Review'}
                              </span>
                            )}
                          </div>
                          {doc.validationResult?.aiAnalysis && (
                            <div className="mt-1 text-xs text-brand-gray">
                              <span className="font-medium">AI Analysis:</span>{' '}
                              {doc.validationResult.aiAnalysis.isDocument ? (
                                <>
                                  {doc.validationResult.aiAnalysis.documentType && (
                                    <span className="text-brand-green">
                                      {doc.validationResult.aiAnalysis.documentType}
                                    </span>
                                  )}
                                  {doc.validationResult.aiAnalysis.description && (
                                    <span> - {doc.validationResult.aiAnalysis.description}</span>
                                  )}
                                  <span className="ml-2 text-gray-400">
                                    ({Math.round((doc.validationResult.aiAnalysis.confidence || 0) * 100)}% confidence)
                                  </span>
                                </>
                              ) : (
                                <span className="text-red-600">
                                  Not recognized as a valid document
                                </span>
                              )}
                            </div>
                          )}
                          {doc.validationResult?.warnings?.length > 0 && (
                            <div className="mt-1">
                              {doc.validationResult.warnings.map((w: string, i: number) => (
                                <p key={i} className="text-xs text-yellow-600">⚠️ {w}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {filter === 'in-review' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecision(app._id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Reason for rejection:');
                          if (notes) handleDecision(app._id, 'rejected', notes);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-brand-gray">No applications found</div>
      )}
    </div>
  );
}
