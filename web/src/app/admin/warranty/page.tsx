'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { getTradeLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface WarrantyClaim {
  _id: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  artisan: {
    _id: string;
    businessName: string;
    trade: string;
    slug: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
  };
  jobDescription: string;
  issueDescription: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  artisanResponse?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  'in-progress': 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

export default function WarrantyClaimsPage() {
  const { showToast } = useToast();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);

  useEffect(() => {
    fetchClaims();
  }, [filter]);

  async function fetchClaims() {
    const token = Cookies.get('token');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: WarrantyClaim[] }>(
        `/admin/warranty?status=${filter}`,
        { token }
      );
      setClaims(res.data?.data ?? []);
    } catch {
      showToast('Failed to load warranty claims', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(id: string, status: string, resolution?: string) {
    const token = Cookies.get('token');
    try {
      await apiFetch(`/admin/warranty/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, resolution }),
        token,
      });
      showToast(`Claim updated to ${status}`, 'success');
      setSelectedClaim(null);
      fetchClaims();
    } catch (err: any) {
      showToast(err.message || 'Failed to update claim', 'error');
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Warranty Claims</h1>

      <div className="flex gap-2 mb-6">
        {['open', 'in-progress', 'resolved', 'closed', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
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
      ) : claims.length > 0 ? (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim._id} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[claim.status]}`}>
                      {claim.status.replace('-', ' ')}
                    </span>
                    <span className="text-sm text-brand-gray">
                      {formatDate(claim.createdAt)}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm text-brand-gray mb-2">Customer</h4>
                      <p className="font-medium">{claim.customer.firstName} {claim.customer.lastName}</p>
                      <p className="text-sm text-brand-gray">{claim.customer.email}</p>
                      {claim.customer.phone && (
                        <p className="text-sm text-brand-gray">{claim.customer.phone}</p>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm text-brand-gray mb-2">Artisan</h4>
                      <p className="font-medium">{claim.artisan.businessName}</p>
                      <p className="text-sm text-brand-green">{getTradeLabel(claim.artisan.trade)}</p>
                      <p className="text-sm text-brand-gray">{claim.artisan.user.email}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-semibold text-sm text-brand-gray mb-1">Job Description</h4>
                    <p className="text-sm">{claim.jobDescription}</p>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-semibold text-sm text-brand-gray mb-1">Issue Reported</h4>
                    <p className="text-sm bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                      {claim.issueDescription}
                    </p>
                  </div>

                  {claim.artisanResponse && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm text-brand-gray mb-1">Artisan Response</h4>
                      <p className="text-sm bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                        {claim.artisanResponse}
                      </p>
                    </div>
                  )}

                  {claim.resolution && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm text-brand-gray mb-1">Resolution</h4>
                      <p className="text-sm bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                        {claim.resolution}
                      </p>
                    </div>
                  )}
                </div>

                {(claim.status === 'open' || claim.status === 'in-progress') && (
                  <div className="flex flex-col gap-2 ml-4">
                    {claim.status === 'open' && (
                      <button
                        onClick={() => handleStatusUpdate(claim._id, 'in-progress')}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-medium text-sm"
                      >
                        Mark In Progress
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedClaim(claim)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(claim._id, 'closed')}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium text-sm"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-brand-gray">
          No warranty claims found
        </div>
      )}

      {/* Resolution Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Resolve Warranty Claim</h3>
            <p className="text-sm text-brand-gray mb-4">
              Claim from {selectedClaim.customer.firstName} {selectedClaim.customer.lastName} against {selectedClaim.artisan.businessName}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const resolution = formData.get('resolution') as string;
                if (resolution) {
                  handleStatusUpdate(selectedClaim._id, 'resolved', resolution);
                }
              }}
            >
              <textarea
                name="resolution"
                placeholder="Enter resolution details..."
                className="w-full p-3 border rounded-lg mb-4 h-32 focus:outline-none focus:ring-2 focus:ring-brand-green"
                required
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="px-4 py-2 text-brand-gray hover:bg-gray-100 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  Resolve Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
