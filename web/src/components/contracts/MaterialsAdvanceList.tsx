'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { formatNaira } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface MaterialItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface AdvanceRequest {
  _id: string;
  items: MaterialItem[];
  totalAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'released';
  requestedAt: string;
  respondedAt?: string;
  responseNote?: string;
  releasedAt?: string;
  receiptUrl?: string;
}

interface Props {
  escrowId: string;
  userRole: 'customer' | 'artisan';
  onUpdate?: () => void;
}

export default function MaterialsAdvanceList({ escrowId, userRole, onUpdate }: Props) {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const token = Cookies.get('token');
      const res = await apiFetch<AdvanceRequest[]>(`/materials-advance/escrow/${escrowId}`, { token });
      setRequests(res.data || []);
    } catch {
      // Silently fail if no requests
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [escrowId]);

  const handleRespond = async (requestId: string, approved: boolean) => {
    const note = approved ? '' : prompt('Reason for rejection (optional):');
    if (note === null && !approved) return; // User cancelled

    setResponding(requestId);
    try {
      const token = Cookies.get('token');
      await apiFetch(`/materials-advance/${requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ approved, note }),
        token,
      });
      showToast(approved ? 'Materials advance approved and released' : 'Request rejected', 'success');
      fetchRequests();
      onUpdate?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to respond', 'error');
    } finally {
      setResponding(null);
    }
  };

  const handleReceiptUpload = async (requestId: string, file: File) => {
    setUploadingReceipt(requestId);
    try {
      const token = Cookies.get('token');

      // First upload the image
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'receipts');

      const uploadRes = await apiFetch<{ url: string }>('/upload/single', {
        method: 'POST',
        body: formData,
        token,
      });

      if (!uploadRes.data?.url) {
        throw new Error('Upload failed');
      }

      // Then submit the receipt URL
      await apiFetch(`/materials-advance/${requestId}/receipt`, {
        method: 'POST',
        body: JSON.stringify({ receiptUrl: uploadRes.data.url }),
        token,
      });

      showToast('Receipt uploaded successfully', 'success');
      fetchRequests();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload receipt', 'error');
    } finally {
      setUploadingReceipt(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Approved</span>;
      case 'released':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Released</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Rejected</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-sm text-brand-gray">Loading...</div>;
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <svg className="w-5 h-5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Materials Advance Requests
      </h3>

      {requests.map((request) => (
        <div key={request._id} className="bg-gray-50 rounded-lg p-4 border">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{formatNaira(request.totalAmount)}</span>
                {getStatusBadge(request.status)}
              </div>
              <p className="text-sm text-brand-gray">
                Requested {new Date(request.requestedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Items List */}
          <div className="mb-3">
            <p className="text-xs font-medium text-brand-gray mb-1">Items:</p>
            <div className="space-y-1">
              {request.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{formatNaira(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="mb-3">
            <p className="text-xs font-medium text-brand-gray">Reason:</p>
            <p className="text-sm">{request.reason}</p>
          </div>

          {/* Response Note (if rejected) */}
          {request.responseNote && (
            <div className="mb-3 p-2 bg-red-50 rounded text-sm">
              <p className="text-xs font-medium text-red-700">Rejection reason:</p>
              <p className="text-red-600">{request.responseNote}</p>
            </div>
          )}

          {/* Receipt */}
          {request.receiptUrl && (
            <div className="mb-3">
              <a
                href={request.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-green hover:underline flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Receipt
              </a>
            </div>
          )}

          {/* Actions */}
          {request.status === 'pending' && userRole === 'customer' && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              <button
                onClick={() => handleRespond(request._id, true)}
                disabled={responding === request._id}
                className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {responding === request._id ? 'Processing...' : 'Approve & Release'}
              </button>
              <button
                onClick={() => handleRespond(request._id, false)}
                disabled={responding === request._id}
                className="flex-1 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}

          {/* Upload Receipt (Artisan, after release) */}
          {request.status === 'released' && userRole === 'artisan' && !request.receiptUrl && (
            <div className="mt-3 pt-3 border-t">
              <label className="block">
                <span className="text-sm text-brand-gray mb-1 block">Upload receipt (proof of purchase):</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingReceipt === request._id}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleReceiptUpload(request._id, e.target.files[0]);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-green file:text-white hover:file:bg-brand-green-dark"
                />
                {uploadingReceipt === request._id && (
                  <p className="text-sm text-brand-gray mt-1">Uploading...</p>
                )}
              </label>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
