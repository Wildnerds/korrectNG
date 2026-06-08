'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { getTradeLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface Artisan {
  _id: string;
  businessName: string;
  trade: string;
  location: string;
  verificationStatus: 'pending' | 'in-review' | 'approved' | 'rejected';
  isPublished: boolean;
  averageRating: number;
  totalReviews: number;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
}

export default function AdminArtisansPage() {
  const { showToast } = useToast();
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetchArtisans();
  }, [filter]);

  async function fetchArtisans() {
    const token = Cookies.get('token');
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/admin/artisans'
        : `/admin/artisans?status=${filter}`;
      const res = await apiFetch<{ data: Artisan[] }>(url, { token });
      setArtisans(res.data?.data || []);
    } catch {
      showToast('Failed to load artisans', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(id: string) {
    const token = Cookies.get('token');
    setVerifying(id);
    try {
      await apiFetch(`/admin/artisans/${id}/verify`, {
        method: 'POST',
        token,
      });
      showToast('Artisan verified successfully', 'success');
      fetchArtisans();
    } catch (err: any) {
      showToast(err.message || 'Failed to verify artisan', 'error');
    } finally {
      setVerifying(null);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Verified</span>;
      case 'in-review':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">In Review</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Pending</span>;
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Artisans</h1>

      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'verified', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
              filter === s
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : artisans.length > 0 ? (
        <div className="bg-white rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {artisans.map((artisan) => (
                <tr key={artisan._id}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{artisan.businessName}</div>
                      {artisan.user && (
                        <div className="text-sm text-gray-500">
                          {artisan.user.firstName} {artisan.user.lastName} - {artisan.user.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getTradeLabel(artisan.trade)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {artisan.location}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(artisan.verificationStatus)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {artisan.averageRating > 0 ? (
                      <span>{artisan.averageRating.toFixed(1)} ({artisan.totalReviews})</span>
                    ) : (
                      <span className="text-gray-400">No reviews</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {artisan.verificationStatus !== 'approved' && (
                      <button
                        onClick={() => handleVerify(artisan._id)}
                        disabled={verifying === artisan._id}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {verifying === artisan._id ? 'Verifying...' : 'Verify'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 text-brand-gray">No artisans found</div>
      )}
    </div>
  );
}
