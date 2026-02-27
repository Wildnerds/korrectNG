'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@korrectng/shared';
import type { AdminDashboardStats } from '@korrectng/shared';
import Cookies from 'js-cookie';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const token = Cookies.get('token');
      try {
        const res = await apiFetch<AdminDashboardStats>('/admin/dashboard', { token });
        setStats(res.data || null);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Admin Dashboard</h1>

      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Total Users</p>
          <p className="text-2xl sm:text-3xl font-bold text-brand-black">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Total Artisans</p>
          <p className="text-2xl sm:text-3xl font-bold text-brand-green">{stats?.totalArtisans || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Total Merchants</p>
          <p className="text-2xl sm:text-3xl font-bold text-brand-orange">{(stats as any)?.totalMerchants || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Monthly Revenue</p>
          <p className="text-xl sm:text-3xl font-bold text-green-600">
            {formatNaira(stats?.revenue || 0)}
          </p>
        </div>
      </div>

      {/* Pending Actions */}
      <h2 className="text-xl font-bold mb-4">Pending Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Artisan Verifications</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-500">{stats?.pendingVerifications || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Merchant Verifications</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-500">{(stats as any)?.pendingMerchantVerifications || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Product Approvals</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-500">{(stats as any)?.pendingProducts || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Open Warranty Claims</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-500">{stats?.openWarrantyClaims || 0}</p>
        </div>
      </div>

      {/* Business Stats */}
      <h2 className="text-xl font-bold mb-4">Business Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Total Reviews</p>
          <p className="text-2xl sm:text-3xl font-bold text-brand-star">{stats?.totalReviews || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Active Subscriptions</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats?.activeSubscriptions || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Material Orders</p>
          <p className="text-2xl sm:text-3xl font-bold text-brand-orange">{(stats as any)?.totalMaterialOrders || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-brand-gray mb-1">Merchant Revenue</p>
          <p className="text-xl sm:text-3xl font-bold text-brand-orange">
            {formatNaira((stats as any)?.merchantRevenue || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
