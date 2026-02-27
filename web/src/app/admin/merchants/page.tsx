'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getMerchantCategoryLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface Merchant {
  _id: string;
  businessName: string;
  slug: string;
  category: string;
  location: string;
  verificationStatus: string;
  isPublished: boolean;
  ordersCompleted: number;
  averageRating: number;
  totalReviews: number;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending'>('all');

  useEffect(() => {
    fetchMerchants();
  }, [filter]);

  async function fetchMerchants() {
    const token = Cookies.get('token');
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Merchant[] }>(
        `/admin/merchants?status=${filter}`,
        { token }
      );
      setMerchants(res.data?.data || []);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Verified</span>;
      case 'in-review':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">In Review</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Rejected</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Merchants</h1>

      <div className="flex gap-2 mb-6">
        {[
          { value: 'all', label: 'All Merchants' },
          { value: 'verified', label: 'Verified' },
          { value: 'pending', label: 'Pending Verification' },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value as any)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === s.value
                ? 'bg-brand-orange text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : merchants.length > 0 ? (
        <div className="bg-white rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Business</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Owner</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Orders</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Rating</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-brand-gray">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {merchants.map((merchant) => (
                <tr key={merchant._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{merchant.businessName}</p>
                    <p className="text-xs text-brand-gray">{merchant.location}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{merchant.user?.firstName} {merchant.user?.lastName}</p>
                    <p className="text-xs text-brand-gray">{merchant.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getMerchantCategoryLabel(merchant.category)}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(merchant.verificationStatus)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {merchant.ordersCompleted}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {merchant.averageRating > 0 ? (
                      <span>⭐ {merchant.averageRating.toFixed(1)} ({merchant.totalReviews})</span>
                    ) : (
                      <span className="text-brand-gray">No reviews</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/merchant/${merchant.slug}`}
                      target="_blank"
                      className="text-brand-orange hover:underline text-sm"
                    >
                      View Store
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 text-brand-gray">No merchants found</div>
      )}
    </div>
  );
}
