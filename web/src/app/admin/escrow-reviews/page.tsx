'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';
import { formatDistanceToNow, format } from 'date-fns';

interface EscrowReview {
  _id: string;
  booking: {
    _id: string;
    jobType: string;
    description: string;
    location: string;
    status: string;
  };
  quote?: {
    totalAmount: number;
    labourCharge: number;
    materialsEstimate?: number;
    message?: string;
  };
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  totalAmount: number;
  platformFee: number;
  status: string;
  adminReviewReason?: string;
  adminReviewRequestedAt?: string;
  releaseRequestedAt?: string;
  releaseNotes?: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

export default function EscrowReviewsPage() {
  const { showToast } = useToast();
  const [escrows, setEscrows] = useState<EscrowReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowReview | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState<number | null>(null);

  useEffect(() => {
    fetchEscrows();
  }, []);

  const fetchEscrows = async () => {
    const token = Cookies.get('token');
    try {
      const res = await apiFetch<{ data: { escrows: EscrowReview[] } }>(
        '/escrow/admin/pending-reviews',
        { token }
      );
      if (res.data?.data?.escrows) {
        setEscrows(res.data.data.escrows);
      }
    } catch (error) {
      console.error('Failed to fetch escrows:', error);
      showToast('Failed to load pending reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (
    escrowId: string,
    action: 'release' | 'partial_refund' | 'full_refund'
  ) => {
    const token = Cookies.get('token');
    setActionLoading(escrowId);

    const escrow = escrows.find((e) => e._id === escrowId);
    if (!escrow) return;

    try {
      const body: any = {
        action,
        notes: resolutionNotes,
      };

      if (action === 'partial_refund' && refundAmount) {
        body.refundAmount = refundAmount;
      }

      const res = await apiFetch(`/escrow/booking/${escrow.booking._id}/admin-resolve`, {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });

      if (res.success) {
        showToast(
          action === 'release'
            ? 'Payment released to artisan'
            : action === 'partial_refund'
            ? 'Partial refund processed'
            : 'Full refund processed',
          'success'
        );
        setEscrows((prev) => prev.filter((e) => e._id !== escrowId));
        setSelectedEscrow(null);
        setResolutionNotes('');
        setRefundAmount(null);
      } else {
        showToast(res.error || 'Failed to resolve', 'error');
      }
    } catch (error) {
      console.error('Failed to resolve escrow:', error);
      showToast('Failed to resolve escrow', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Escrow Reviews</h1>
        <div className="text-center py-10">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Escrow Reviews</h1>
          <p className="text-gray-500">
            {escrows.length} pending review{escrows.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {escrows.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-gray-500">No pending escrow reviews</p>
          <p className="text-sm text-gray-400">
            All escrows are resolved. Great job!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {escrows.map((escrow) => {
            const isSelected = selectedEscrow?._id === escrow._id;
            const waitTime = escrow.adminReviewRequestedAt
              ? formatDistanceToNow(new Date(escrow.adminReviewRequestedAt), {
                  addSuffix: true,
                })
              : '';

            return (
              <div
                key={escrow._id}
                className="bg-white rounded-xl overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setSelectedEscrow(isSelected ? null : escrow)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {escrow.booking.jobType}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {escrow.booking.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-green">
                        {formatCurrency(escrow.totalAmount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Escalated {waitTime}
                      </p>
                    </div>
                  </div>

                  {/* Parties */}
                  <div className="flex gap-8 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Customer:</span>{' '}
                      <span className="font-medium">
                        {escrow.customer.firstName} {escrow.customer.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Artisan:</span>{' '}
                      <span className="font-medium">
                        {escrow.artisan.firstName} {escrow.artisan.lastName}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  {escrow.adminReviewReason && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Escalation Reason:</strong>{' '}
                        {escrow.adminReviewReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isSelected && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {/* Contact info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-medium mb-2">Customer Contact</p>
                        <p className="text-sm text-gray-600">
                          {escrow.customer.email}
                        </p>
                        {escrow.customer.phone && (
                          <p className="text-sm text-gray-600">
                            {escrow.customer.phone}
                          </p>
                        )}
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-medium mb-2">Artisan Contact</p>
                        <p className="text-sm text-gray-600">
                          {escrow.artisan.email}
                        </p>
                        {escrow.artisan.phone && (
                          <p className="text-sm text-gray-600">
                            {escrow.artisan.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quote breakdown */}
                    {escrow.quote && (
                      <div className="bg-white p-3 rounded-lg mb-4">
                        <p className="font-medium mb-2">Quote Details</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Labour</p>
                            <p className="font-medium">
                              {formatCurrency(escrow.quote.labourCharge)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Materials</p>
                            <p className="font-medium">
                              {formatCurrency(escrow.quote.materialsEstimate || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Platform Fee</p>
                            <p className="font-medium">
                              {formatCurrency(escrow.platformFee)}
                            </p>
                          </div>
                        </div>
                        {escrow.quote.message && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            "{escrow.quote.message}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Status history */}
                    <div className="bg-white p-3 rounded-lg mb-4">
                      <p className="font-medium mb-2">Status History</p>
                      <div className="space-y-2 text-sm">
                        {escrow.statusHistory.slice(-5).reverse().map((h, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-gray-400 w-32 flex-shrink-0">
                              {format(new Date(h.timestamp), 'MMM d, h:mm a')}
                            </span>
                            <span className="font-medium">{h.status}</span>
                            {h.note && (
                              <span className="text-gray-500">- {h.note}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Artisan notes */}
                    {escrow.releaseNotes && (
                      <div className="bg-white p-3 rounded-lg mb-4">
                        <p className="font-medium mb-1">Artisan Notes</p>
                        <p className="text-sm text-gray-600">
                          {escrow.releaseNotes}
                        </p>
                      </div>
                    )}

                    {/* Resolution form */}
                    <div className="bg-white p-4 rounded-lg">
                      <p className="font-medium mb-3">Resolve This Escrow</p>

                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Add resolution notes (visible to both parties)..."
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:border-brand-green"
                        rows={2}
                      />

                      {/* Partial refund amount */}
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-1">
                          Refund Amount (for partial refund)
                        </label>
                        <input
                          type="number"
                          value={refundAmount || ''}
                          onChange={(e) =>
                            setRefundAmount(
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          placeholder={`Max: ${formatCurrency(escrow.totalAmount)}`}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-green"
                          max={escrow.totalAmount}
                          min={0}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(escrow._id, 'release')}
                          disabled={actionLoading === escrow._id}
                          className="flex-1 py-2 px-4 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                        >
                          {actionLoading === escrow._id
                            ? 'Processing...'
                            : 'Release to Artisan'}
                        </button>
                        <button
                          onClick={() =>
                            handleResolve(escrow._id, 'partial_refund')
                          }
                          disabled={actionLoading === escrow._id || !refundAmount}
                          className="flex-1 py-2 px-4 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                          Partial Refund
                        </button>
                        <button
                          onClick={() =>
                            handleResolve(escrow._id, 'full_refund')
                          }
                          disabled={actionLoading === escrow._id}
                          className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          Full Refund
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
