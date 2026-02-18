'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import type { ArtisanProfile, Subscription, WarrantyClaim, VerificationApplication } from '@korrectng/shared';
import { formatRating, formatNaira, getTradeLabel } from '@korrectng/shared';
import Cookies from 'js-cookie';

export default function ArtisanDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ArtisanProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [verification, setVerification] = useState<VerificationApplication | null>(null);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const token = Cookies.get('token');
      try {
        // Fetch artisan's own profile (includes unpublished)
        const profileRes = await apiFetch<ArtisanProfile>('/artisans/my-profile', { token });
        if (profileRes.data) {
          setProfile(profileRes.data);
        }

        // Fetch verification status
        try {
          const verRes = await apiFetch<VerificationApplication>('/verification/my-application', { token });
          if (verRes.data) {
            setVerification(verRes.data);
          }
        } catch {
          // No application yet
        }

        // Fetch subscription
        try {
          const subRes = await apiFetch<Subscription>('/payments/subscription', { token });
          setSubscription(subRes.data || null);
        } catch {
          // No subscription
        }

        // Fetch warranty claims
        try {
          const claimsRes = await apiFetch<WarrantyClaim[]>('/warranty/claims-against-me', { token });
          setClaims(claimsRes.data || []);
        } catch {
          // No claims
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

  // Determine the artisan's current status
  const verificationStatus = profile?.verificationStatus || verification?.status || 'pending';
  const isVerified = verificationStatus === 'approved';
  const isInReview = verificationStatus === 'in-review';
  const isRejected = verificationStatus === 'rejected';
  const hasProfile = !!profile;
  const hasSubscription = subscription?.status === 'active';
  const isPublished = profile?.isPublished && hasSubscription;

  // Show onboarding if no profile and no verification application
  if (!hasProfile && !verification) {
    return (
      <div className="min-h-screen bg-brand-light-gray py-8">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="bg-white rounded-xl p-10">
            <div className="text-6xl mb-6">🚀</div>
            <h1 className="text-3xl font-bold mb-4">Welcome to KorrectNG!</h1>
            <p className="text-brand-gray mb-8 max-w-md mx-auto">
              Complete your verification to get listed and start receiving customers.
            </p>
            <Link
              href="/dashboard/artisan/verification"
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
                <div className="text-6xl mb-6">⏳</div>
                <h1 className="text-3xl font-bold mb-4">Verification In Progress</h1>
                <p className="text-brand-gray mb-6 max-w-md mx-auto">
                  Your documents are being reviewed by our team. This usually takes 1-2 business days.
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
                  href="/dashboard/artisan/verification"
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
                  You've started the verification process. Complete it to get listed.
                </p>
                <Link
                  href="/dashboard/artisan/verification"
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

  // Verified artisan dashboard
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
                  {hasSubscription
                    ? 'Your profile is now live on KorrectNG.'
                    : 'Subscribe to get your profile published and start receiving customers.'}
                </p>
              </div>
            </div>
            {!hasSubscription && (
              <button
                onClick={async () => {
                  const token = Cookies.get('token');
                  try {
                    const res = await apiFetch<{ authorization_url: string }>('/payments/subscribe', {
                      method: 'POST',
                      token,
                    });
                    if (res.data?.authorization_url) {
                      window.location.href = res.data.authorization_url;
                    }
                  } catch (err: any) {
                    showToast(err.message || 'Failed to start subscription', 'error');
                  }
                }}
                className="px-6 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold whitespace-nowrap"
              >
                Subscribe Now
              </button>
            )}
          </div>
        )}

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{profile?.businessName || 'Your Business'}</h1>
            <p className="text-brand-gray">
              {profile?.trade ? getTradeLabel(profile.trade) : 'Trade'} - {profile?.location || 'Location'}
            </p>
          </div>
          {profile?.slug && (
            <Link
              href={`/artisan/${profile.slug}`}
              className="px-4 py-2 border-2 border-brand-green text-brand-green rounded-md hover:bg-brand-green hover:text-white transition-colors font-medium"
            >
              View Public Profile
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
            <p className="text-xs sm:text-sm text-brand-gray mb-1">Jobs Completed</p>
            <p className="text-2xl sm:text-3xl font-bold text-brand-green">{profile?.jobsCompleted || 0}+</p>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-brand-gray mb-1">Profile Status</p>
            <p
              className={`text-base sm:text-lg font-bold ${
                isPublished ? 'text-green-600' : 'text-orange-500'
              }`}
            >
              {isPublished ? 'Live' : 'Not Published'}
            </p>
            <p className="text-xs text-brand-gray">
              {isVerified ? '✓ Verified' : verificationStatus}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-brand-gray mb-1">Subscription</p>
            <p
              className={`text-base sm:text-lg font-bold ${
                hasSubscription ? 'text-green-600' : 'text-orange-500'
              }`}
            >
              {hasSubscription ? 'Active' : 'Inactive'}
            </p>
            {subscription && (
              <p className="text-xs text-brand-gray">{formatNaira(subscription.amount)}/month</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/artisan/profile"
                className="block w-full px-4 py-3 bg-brand-light-gray rounded-md hover:bg-gray-200 transition-colors text-center font-medium"
              >
                Edit Profile
              </Link>
              <Link
                href="/dashboard/artisan/gallery"
                className="block w-full px-4 py-3 bg-brand-light-gray rounded-md hover:bg-gray-200 transition-colors text-center font-medium"
              >
                Manage Gallery ({profile?.galleryImages?.length || 0} photos)
              </Link>
              {!hasSubscription && isVerified && (
                <button
                  onClick={async () => {
                    const token = Cookies.get('token');
                    try {
                      const res = await apiFetch<{ authorization_url: string }>('/payments/subscribe', {
                        method: 'POST',
                        token,
                      });
                      if (res.data?.authorization_url) {
                        window.location.href = res.data.authorization_url;
                      }
                    } catch (err: any) {
                      showToast(err.message || 'Failed to start subscription', 'error');
                    }
                  }}
                  className="block w-full px-4 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors text-center font-semibold"
                >
                  Subscribe ({formatNaira(5000)}/month)
                </button>
              )}
            </div>
          </div>

          {/* Warranty Claims */}
          <div className="bg-white rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Warranty Claims ({claims.length})</h2>
            {claims.length > 0 ? (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {claims.map((claim) => (
                  <div key={claim._id} className="border-b pb-3 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{claim.jobDescription}</p>
                        <p className="text-xs text-brand-gray">{claim.issueDescription}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          claim.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : claim.status === 'in-progress'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-brand-gray text-sm">No warranty claims - great job!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
