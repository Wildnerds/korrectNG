'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { formatRating, getMerchantCategoryLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

interface MerchantProfile {
  _id: string;
  businessName: string;
  slug: string;
  category: string;
  location: string;
  verificationStatus: string;
  isPublished: boolean;
  averageRating: number;
  totalReviews: number;
  ordersCompleted: number;
  trustScore: number;
  trustLevel: string;
}

interface MerchantVerificationApplication {
  _id: string;
  status: string;
  adminNotes?: string;
}

interface RecentOrder {
  _id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface MerchantStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalEarnings: number;
  pendingEarnings: number;
}

export default function MerchantDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [verification, setVerification] = useState<MerchantVerificationApplication | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const token = Cookies.get('token');
      try {
        // Fetch merchant's own profile
        const profileRes = await apiFetch<MerchantProfile>('/merchants/my-profile', { token });
        if (profileRes.data) {
          setProfile(profileRes.data);
        }

        // Fetch verification status
        try {
          const verRes = await apiFetch<MerchantVerificationApplication>('/merchant-verification/my-application', { token });
          if (verRes.data) {
            setVerification(verRes.data);
          }
        } catch {
          // No application yet
        }

        // Fetch stats
        try {
          const statsRes = await apiFetch<MerchantStats>('/merchants/stats/overview', { token });
          if (statsRes.data) {
            setStats(statsRes.data);
          }
        } catch {
          // No stats
        }

        // Fetch recent orders
        try {
          const ordersRes = await apiFetch<{ data: RecentOrder[] }>('/material-orders?limit=5', { token });
          if (ordersRes.data?.data) {
            setRecentOrders(ordersRes.data.data);
          }
        } catch {
          // No orders
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-brand-green text-xl">Loading...</div>
      </div>
    );
  }

  // Determine the merchant's current status
  const verificationStatus = profile?.verificationStatus || verification?.status || 'pending';
  const isVerified = verificationStatus === 'approved';
  const isInReview = verificationStatus === 'in-review';
  const isRejected = verificationStatus === 'rejected';
  const hasProfile = !!profile;
  const isPublished = profile?.isPublished;

  // Show onboarding if no profile and no verification application
  if (!hasProfile && !verification) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-white rounded-xl p-10">
            <div className="text-6xl mb-6">🏪</div>
            <h1 className="text-3xl font-bold mb-4">Welcome to KorrectNG Marketplace!</h1>
            <p className="text-brand-gray mb-8 max-w-md mx-auto">
              Complete your verification to get listed and start selling materials to artisans and customers.
            </p>
            <Link
              href="/dashboard/merchant/verification"
              className="inline-block px-8 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
            >
              Start Verification
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show status card for in-review or rejected
  if (!isVerified && (isInReview || isRejected || verification)) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-xl p-10 text-center">
            {isInReview && (
              <>
                <div className="text-6xl mb-6">🔍</div>
                <h1 className="text-3xl font-bold mb-4">Verification In Progress</h1>
                <p className="text-brand-gray mb-6 max-w-md mx-auto">
                  Your business documents are being reviewed by our team. This usually takes 1-2 business days.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  Under Review
                </div>
              </>
            )}
            {isRejected && (
              <>
                <div className="text-6xl mb-6">❌</div>
                <h1 className="text-3xl font-bold mb-4">Verification Rejected</h1>
                <p className="text-brand-gray mb-4 max-w-md mx-auto">
                  Unfortunately, your verification was not approved.
                </p>
                {verification?.adminNotes && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">Reason:</span> {verification.adminNotes}
                    </p>
                  </div>
                )}
                <Link
                  href="/dashboard/merchant/verification"
                  className="inline-block px-8 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
                >
                  Resubmit Documents
                </Link>
              </>
            )}
            {!isInReview && !isRejected && verification?.status === 'pending' && (
              <>
                <div className="text-6xl mb-6">📝</div>
                <h1 className="text-3xl font-bold mb-4">Complete Your Verification</h1>
                <p className="text-brand-gray mb-6 max-w-md mx-auto">
                  You've started the verification process. Complete it to start selling.
                </p>
                <Link
                  href="/dashboard/merchant/verification"
                  className="inline-block px-8 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
                >
                  Continue Verification
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'confirmed':
        return 'bg-blue-100 text-blue-700';
      case 'paid':
      case 'preparing':
        return 'bg-purple-100 text-purple-700';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-700';
      case 'delivered':
      case 'received':
        return 'bg-teal-100 text-teal-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Verified merchant dashboard
  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Verified badge */}
        {isVerified && !isPublished && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-800">You're Verified!</p>
                <p className="text-sm text-green-700">
                  Your store is now live on KorrectNG Marketplace.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{profile?.businessName || 'Your Store'}</h1>
            <p className="text-brand-gray">
              {profile?.category ? getMerchantCategoryLabel(profile.category) : 'Category'} - {profile?.location || 'Location'}
            </p>
          </div>
          {profile?.slug && (
            <Link
              href={`/merchant/${profile.slug}`}
              className="px-4 py-2 border-2 border-brand-green text-brand-green rounded-md hover:bg-brand-green hover:text-white transition-colors font-medium"
            >
              View Store
            </Link>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-brand-gray mb-1">Rating</p>
            <p className="text-2xl sm:text-3xl font-bold text-brand-star">
              {formatRating(profile?.averageRating || 0)}
            </p>
            <p className="text-xs text-brand-gray">{profile?.totalReviews || 0} reviews</p>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-brand-gray mb-1">Orders Completed</p>
            <p className="text-2xl sm:text-3xl font-bold text-brand-green">{stats?.completedOrders || profile?.ordersCompleted || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-brand-gray mb-1">Total Earnings</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              NGN{(stats?.totalEarnings || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-brand-gray mb-1">Store Status</p>
            <p
              className={`text-base sm:text-lg font-bold ${
                isPublished ? 'text-green-600' : 'text-orange-500'
              }`}
            >
              {isPublished ? 'Live' : 'Not Published'}
            </p>
            <p className="text-xs text-brand-gray">
              Trust: {profile?.trustLevel || 'New'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/merchant/orders"
                className="block w-full px-4 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors text-center font-semibold"
              >
                View Orders {stats?.pendingOrders ? `(${stats.pendingOrders} pending)` : ''}
              </Link>
              <Link
                href="/dashboard/merchant/products/new"
                className="block w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center font-semibold"
              >
                Add New Product
              </Link>
              <Link
                href="/dashboard/merchant/products"
                className="block w-full px-4 py-3 bg-brand-light-gray rounded-md hover:bg-gray-200 transition-colors text-center font-medium"
              >
                Manage Products
              </Link>
              <Link
                href="/dashboard/merchant/profile"
                className="block w-full px-4 py-3 bg-brand-light-gray rounded-md hover:bg-gray-200 transition-colors text-center font-medium"
              >
                Edit Store Profile
              </Link>
              <Link
                href="/dashboard/merchant/earnings"
                className="block w-full px-4 py-3 bg-brand-light-gray rounded-md hover:bg-gray-200 transition-colors text-center font-medium"
              >
                Earnings & Payouts
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Orders</h2>
              <Link href="/dashboard/merchant/orders" className="text-brand-green text-sm hover:underline">
                View All
              </Link>
            </div>
            {recentOrders.length > 0 ? (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {recentOrders.map((order) => (
                  <Link
                    key={order._id}
                    href={`/dashboard/merchant/orders/${order._id}`}
                    className="block border-b pb-3 last:border-0 hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{order.orderNumber}</p>
                        <p className="text-xs text-brand-gray">
                          NGN{order.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-brand-gray text-sm">No orders yet. Start adding products to attract customers!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
