'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { getMerchantCategoryLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface MerchantVerification {
  _id: string;
  merchant: {
    _id: string;
    businessName: string;
    category: string;
    location: string;
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  documents: {
    type: string;
    url: string;
    publicId: string;
    validationResult?: {
      isValid: boolean;
      confidence: string;
      aiAnalysis?: {
        isDocument: boolean;
        documentType?: string;
        description?: string;
        confidence?: number;
      };
      warnings?: string[];
    };
  }[];
  status: string;
  currentStep: string;
  adminNotes?: string;
  createdAt: string;
}

export default function MerchantVerificationsPage() {
  const { showToast } = useToast();
  const [applications, setApplications] = useState<MerchantVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('in-review');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  async function fetchApplications() {
    const token = Cookies.get('token');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: MerchantVerification[] }>(
        `/admin/merchant-verifications?status=${filter}`,
        { token }
      );
      setApplications(res.data?.data || []);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(id: string, action: 'approve' | 'reject', notes?: string) {
    const token = Cookies.get('token');
    try {
      await apiFetch(`/admin/merchant-verifications/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ adminNotes: notes }),
        token,
      });
      showToast(`Application ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
      fetchApplications();
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error');
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Merchant Verifications</h1>

      <div className="flex gap-2 mb-6">
        {['in-review', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === s
                ? 'bg-brand-orange text-white'
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
            const merchant = app.merchant;
            const user = merchant?.user;
            return (
              <div key={app._id} className="bg-white rounded-xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{merchant?.businessName || 'Unknown'}</h3>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                        Merchant
                      </span>
                    </div>
                    <p className="text-brand-gray text-sm">
                      {merchant?.category ? getMerchantCategoryLabel(merchant.category) : ''} - {merchant?.location}
                    </p>
                    <p className="text-sm text-brand-gray mt-1">
                      {user?.firstName} {user?.lastName} - {user?.email}
                    </p>
                    <p className="text-xs text-brand-gray mt-1">
                      Applied: {new Date(app.createdAt).toLocaleDateString()}
                    </p>

                    <div className="mt-3 space-y-3">
                      <h4 className="text-sm font-medium">Documents:</h4>
                      {app.documents.map((doc, idx) => (
                        <div key={idx} className="border-l-2 border-gray-200 pl-3">
                          <div className="flex items-center gap-3">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-brand-orange hover:underline font-medium"
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
                                    <span className="text-brand-orange">
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
                          {doc.validationResult?.warnings?.length ? (
                            <div className="mt-1">
                              {doc.validationResult.warnings.map((w: string, i: number) => (
                                <p key={i} className="text-xs text-yellow-600">⚠️ {w}</p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {app.adminNotes && (
                      <div className="mt-3 p-2 bg-gray-100 rounded text-sm">
                        <span className="font-medium">Admin Notes:</span> {app.adminNotes}
                      </div>
                    )}
                  </div>

                  {filter === 'in-review' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecision(app._id, 'approve')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Reason for rejection:');
                          if (notes) handleDecision(app._id, 'reject', notes);
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
        <div className="text-center py-10 text-brand-gray">No merchant applications found</div>
      )}
    </div>
  );
}
