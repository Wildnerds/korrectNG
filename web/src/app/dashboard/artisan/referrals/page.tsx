'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import Cookies from 'js-cookie';
import { formatDistanceToNow } from 'date-fns';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalBonusEarned: number;
  totalCommissionEarned: number;
  pendingBonus: number;
}

interface Referral {
  _id: string;
  merchant: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  merchantProfile: {
    _id: string;
    businessName: string;
    verificationStatus: string;
    ordersCompleted: number;
  };
  status: string;
  signupBonusAmount: number;
  signupBonusPaid: boolean;
  signupBonusPaidAt?: string;
  totalCommissionEarned: number;
  merchantFirstSaleAt?: string;
  merchantTotalSales: number;
  merchantOrderCount: number;
  createdAt: string;
}

interface ReferralCodeData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
  };
}

export default function ArtisanReferralsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [codeData, setCodeData] = useState<ReferralCodeData | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = Cookies.get('token');
    try {
      // Fetch referral code
      const codeRes = await apiFetch<{ data: ReferralCodeData }>('/referrals/my-code', {
        token,
      });
      if (codeRes.data?.data) {
        setCodeData(codeRes.data.data);
      }

      // Fetch referral stats
      const statsRes = await apiFetch<{ data: { stats: ReferralStats; referrals: Referral[] } }>(
        '/referrals/stats',
        { token }
      );
      if (statsRes.data?.data) {
        setStats(statsRes.data.data.stats);
        setReferrals(statsRes.data.data.referrals);
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      showToast('Failed to load referral data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(`${type === 'code' ? 'Referral code' : 'Referral link'} copied!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const shareLink = async () => {
    if (!codeData) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join KorrectNG as a Merchant',
          text: `Join KorrectNG and sell your products to artisans! Use my referral code: ${codeData.referralCode}`,
          url: codeData.referralLink,
        });
      } catch {
        // User cancelled share
      }
    } else {
      copyToClipboard(codeData.referralLink, 'link');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string, bonusPaid: boolean) => {
    if (bonusPaid) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          Bonus Paid
        </span>
      );
    }
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            Pending First Sale
          </span>
        );
      case 'inactive':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
            Inactive
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6" />
            <div className="h-48 bg-gray-200 rounded-xl mb-6" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-black">Refer Merchants</h1>
          <p className="text-gray-500">
            Refer merchants and earn when they make sales on KorrectNG
          </p>
        </div>

        {/* Referral Code Card */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg mb-1">Your Referral Code</h2>
              <p className="text-sm text-gray-500">
                Share this code with merchants to earn bonuses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-brand-green/10 text-brand-green text-sm font-medium rounded-full">
                {formatCurrency(2000)} per referral
              </span>
            </div>
          </div>

          {codeData && (
            <>
              {/* Code display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Referral Code</p>
                    <p className="text-2xl font-bold font-mono tracking-wider">
                      {codeData.referralCode}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(codeData.referralCode, 'code')}
                    className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => copyToClipboard(codeData.referralLink, 'link')}
                  className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Copy Link
                </button>
                <button
                  onClick={shareLink}
                  className="flex-1 py-2.5 px-4 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </button>
              </div>
            </>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Total Referrals</p>
              <p className="text-2xl font-bold">{stats.totalReferrals}</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Active</p>
              <p className="text-2xl font-bold text-brand-green">{stats.activeReferrals}</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Bonus Earned</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalBonusEarned)}</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Commission</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalCommissionEarned)}</p>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-2">How it works</h3>
          <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
            <li>Share your referral code or link with merchants you know</li>
            <li>They sign up as a merchant using your code</li>
            <li>When they complete their first sale, you earn {formatCurrency(2000)} bonus</li>
            <li>Plus 1% commission on all their future sales!</li>
          </ol>
        </div>

        {/* Referrals List */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold">Your Referrals</h2>
          </div>

          {referrals.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="text-gray-500 mb-2">No referrals yet</p>
              <p className="text-sm text-gray-400">
                Share your code with merchants to start earning
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {referrals.map((referral) => (
                <div key={referral._id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">
                        {referral.merchantProfile?.businessName || 'Pending Setup'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {referral.merchant.firstName} {referral.merchant.lastName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Joined {formatDistanceToNow(new Date(referral.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(referral.status, referral.signupBonusPaid)}
                      {referral.merchantFirstSaleAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          First sale:{' '}
                          {formatDistanceToNow(new Date(referral.merchantFirstSaleAt), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-6 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Orders:</span>{' '}
                      <span className="font-medium">{referral.merchantOrderCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Sales:</span>{' '}
                      <span className="font-medium">
                        {formatCurrency(referral.merchantTotalSales)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Your Commission:</span>{' '}
                      <span className="font-medium text-brand-green">
                        {formatCurrency(referral.totalCommissionEarned)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
