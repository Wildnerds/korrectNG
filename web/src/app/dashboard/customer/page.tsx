'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { ArtisanProfile, WarrantyClaim } from '@korrectng/shared';
import { getTradeLabel, formatRating } from '@korrectng/shared';
import Cookies from 'js-cookie';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'claims'>('bookmarks');
  const [bookmarks, setBookmarks] = useState<ArtisanProfile[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const token = Cookies.get('token');
      try {
        // Fetch bookmarked artisans
        if (user?.bookmarkedArtisans?.length) {
          const bookmarkPromises = user.bookmarkedArtisans.map((id) =>
            apiFetch<ArtisanProfile>(`/artisans/${id}`, { token }).catch(() => null)
          );
          const results = await Promise.all(bookmarkPromises);
          setBookmarks(results.filter((r) => r?.data).map((r) => r!.data!) as ArtisanProfile[]);
        }

        // Fetch warranty claims
        const claimsRes = await apiFetch<WarrantyClaim[]>('/warranty/my-claims', { token });
        setClaims(claimsRes.data || []);
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-brand-light-gray py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {user?.firstName}!</h1>
            <p className="text-brand-gray">Manage your bookmarks and warranty claims</p>
          </div>
          <Link
            href="/dashboard/customer/profile"
            className="px-4 py-2 border-2 border-brand-green text-brand-green rounded-md hover:bg-brand-green hover:text-white transition-colors font-medium"
          >
            Edit Profile
          </Link>
        </div>

        {/* Email verification notice */}
        {user && !user.isEmailVerified && (
          <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 text-lg">Verify your email</h3>
                <p className="text-amber-700 text-sm mt-1 leading-relaxed">
                  Some features are restricted until you verify your email address.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a.5.5 0 000 1h5a.5.5 0 000-1h-5zm0 2a.5.5 0 000 1h5a.5.5 0 000-1h-5z"/></svg>
                    Save Artisans
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    Leave Reviews
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2A11.954 11.954 0 0110 1.944z" clipRule="evenodd"/></svg>
                    Warranty Claims
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            Saved Artisans ({bookmarks.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              activeTab === 'claims'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            Warranty Claims ({claims.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-brand-gray">Loading...</div>
        ) : activeTab === 'bookmarks' ? (
          bookmarks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarks.map((artisan) => (
                <Link key={artisan._id} href={`/artisan/${artisan.slug}`}>
                  <div className="bg-white rounded-xl p-5 hover:shadow-lg transition-shadow">
                    <h3 className="font-bold text-lg mb-1">{artisan.businessName}</h3>
                    <p className="text-brand-gray text-sm mb-2">
                      {getTradeLabel(artisan.trade)} - {artisan.location}
                    </p>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-brand-star">★</span>
                      <span>{formatRating(artisan.averageRating)}</span>
                      <span className="text-brand-gray">({artisan.totalReviews} reviews)</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl">
              <p className="text-xl text-brand-gray mb-4">No saved artisans yet</p>
              <Link
                href="/search"
                className="inline-block px-6 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold"
              >
                Find Artisans
              </Link>
            </div>
          )
        ) : claims.length > 0 ? (
          <div className="space-y-4">
            {claims.map((claim) => (
              <div key={claim._id} className="bg-white rounded-xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">
                      {(claim.artisan as any)?.businessName || 'Artisan'}
                    </h3>
                    <p className="text-sm text-brand-gray">{claim.jobDescription}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                <p className="text-brand-gray text-sm">{claim.issueDescription}</p>
                {claim.artisanResponse && (
                  <div className="mt-3 pl-4 border-l-2 border-brand-green">
                    <p className="text-sm font-medium text-brand-green">Artisan Response:</p>
                    <p className="text-sm text-brand-gray">{claim.artisanResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-xl text-brand-gray">No warranty claims</p>
          </div>
        )}
      </div>
    </div>
  );
}
