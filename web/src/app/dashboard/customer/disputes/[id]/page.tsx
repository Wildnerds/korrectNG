'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { DisputeTimeline, EvidenceUploader } from '@/components/disputes';
import { FormTextarea } from '@/components/FormInput';
import Cookies from 'js-cookie';
import type { Dispute } from '@korrectng/shared';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  opened: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Opened' },
  artisan_response_pending: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Awaiting Artisan Response' },
  customer_counter_pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Your Response Needed' },
  under_review: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Under Admin Review' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Resolved' },
  escalated: { bg: 'bg-red-100', text: 'text-red-700', label: 'Escalated' },
};

export default function CustomerDisputeDetailPage() {
  const { id } = useParams();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counter, setCounter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDispute = async () => {
    try {
      const token = Cookies.get('token');
      const res = await apiFetch<Dispute>(`/disputes/${id}`, { token });
      setDispute(res.data || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dispute');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispute();
  }, [id]);

  const handleSubmitCounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (counter.length < 20) return;

    setSubmitting(true);

    try {
      const token = Cookies.get('token');
      await apiFetch(`/disputes/${id}/customer-counter`, {
        method: 'POST',
        token,
        body: JSON.stringify({ counter }),
      });
      fetchDispute();
      setCounter('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit counter');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-10 text-brand-gray">Loading dispute...</div>
        </div>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-10">
            <p className="text-red-500 mb-4">{error || 'Dispute not found'}</p>
            <Link href="/dashboard/customer/disputes" className="text-brand-green hover:underline">
              Back to Disputes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statusStyle = statusColors[dispute.status] || statusColors.opened;
  const canUploadEvidence = !['resolved'].includes(dispute.status);
  const canSubmitCounter = dispute.status === 'customer_counter_pending';

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href="/dashboard/customer/disputes"
          className="inline-flex items-center gap-2 text-brand-gray hover:text-brand-green mb-6"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Disputes
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">{(dispute.contract as any)?.title || 'Dispute'}</h1>
              <p className="text-brand-gray capitalize">Category: {dispute.category.replace(/_/g, ' ')}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>

          {/* Deadlines */}
          {dispute.status === 'artisan_response_pending' && (
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-700">
                Artisan must respond by: {new Date(dispute.artisanResponseDeadline).toLocaleString()}
              </p>
            </div>
          )}

          {dispute.status === 'customer_counter_pending' && dispute.customerCounterDeadline && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                You can respond by: {new Date(dispute.customerCounterDeadline).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Your Complaint */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-3">Your Complaint</h3>
          <p className="text-brand-gray whitespace-pre-wrap">{dispute.description}</p>
        </div>

        {/* Artisan Response */}
        {dispute.artisanResponse && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border-l-4 border-orange-400">
            <h3 className="text-lg font-semibold mb-2">Artisan&apos;s Response</h3>
            <p className="text-xs text-brand-gray mb-3">
              {new Date(dispute.artisanResponse.respondedAt).toLocaleString()}
            </p>
            <p className="text-brand-gray whitespace-pre-wrap">{dispute.artisanResponse.content}</p>
          </div>
        )}

        {/* Customer Counter Form */}
        {canSubmitCounter && (
          <form onSubmit={handleSubmitCounter} className="bg-white rounded-xl p-6 shadow-sm mb-6 border-l-4 border-blue-400">
            <h3 className="text-lg font-semibold mb-4">Your Response</h3>
            <p className="text-sm text-brand-gray mb-4">
              Review the artisan&apos;s response and provide any additional information or clarification.
              After submitting, the dispute will be sent to an admin for review.
            </p>

            <FormTextarea
              label="Your counter/response"
              value={counter}
              onChange={(e) => setCounter(e.target.value)}
              placeholder="Provide any additional details or clarification..."
              rows={5}
              required
            />

            <button
              type="submit"
              disabled={submitting || counter.length < 20}
              className="mt-4 w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Response'}
            </button>
          </form>
        )}

        {/* Customer Counter (if submitted) */}
        {dispute.customerCounter && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border-l-4 border-blue-400">
            <h3 className="text-lg font-semibold mb-2">Your Counter</h3>
            <p className="text-xs text-brand-gray mb-3">
              {new Date(dispute.customerCounter.submittedAt).toLocaleString()}
            </p>
            <p className="text-brand-gray whitespace-pre-wrap">{dispute.customerCounter.content}</p>
          </div>
        )}

        {/* Resolution */}
        {dispute.decision && dispute.decisionDetails && (
          <div className="bg-green-50 rounded-xl p-6 shadow-sm mb-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Resolution</h3>
            <p className="font-medium text-green-700 capitalize mb-2">
              Decision: {dispute.decision.replace(/_/g, ' ')}
            </p>
            {dispute.decisionDetails.notes && (
              <p className="text-brand-gray">{dispute.decisionDetails.notes}</p>
            )}
            {dispute.decisionDetails.customerRefundAmount !== undefined && dispute.decisionDetails.customerRefundAmount > 0 && (
              <p className="mt-2 text-green-700">
                Your Refund: ₦{dispute.decisionDetails.customerRefundAmount.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Evidence */}
        <div className="mb-6">
          <EvidenceUploader
            disputeId={dispute._id}
            evidence={dispute.customerEvidence}
            canUpload={canUploadEvidence}
            onUpload={fetchDispute}
          />
        </div>

        {/* Artisan Evidence */}
        {dispute.artisanEvidence && dispute.artisanEvidence.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <h3 className="text-lg font-semibold mb-4">Artisan&apos;s Evidence</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {dispute.artisanEvidence.map((item, index) => (
                <div key={index}>
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.description || `Evidence ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-brand-gray text-sm">{item.type}</span>
                    </div>
                  )}
                  {item.description && (
                    <p className="text-xs text-brand-gray mt-1">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <DisputeTimeline timeline={dispute.timeline} />

        {/* Contract Snapshot */}
        {dispute.contractSnapshot && (
          <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Contract Details at Time of Dispute</h3>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-brand-gray mb-1">Scope of Work</p>
                <p className="text-sm">{dispute.contractSnapshot.scopeOfWork}</p>
              </div>
              <div>
                <p className="font-medium text-brand-gray mb-1">Deliverables</p>
                <ul className="list-disc list-inside text-sm">
                  {dispute.contractSnapshot.deliverables.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
