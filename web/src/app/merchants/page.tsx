'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { MERCHANT_CATEGORIES, LOCATIONS, getMerchantCategoryLabel, getMerchantCategoryIcon, formatRating } from '@korrectng/shared';

interface Merchant {
  _id: string;
  businessName: string;
  slug: string;
  category: string;
  location: string;
  description: string;
  businessLogo?: string;
  averageRating: number;
  totalReviews: number;
  trustLevel: string;
  isVerified: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMerchants();
  }, [currentPage, categoryFilter, locationFilter]);

  async function fetchMerchants() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(categoryFilter && { category: categoryFilter }),
        ...(locationFilter && { location: locationFilter }),
        ...(searchQuery && { q: searchQuery }),
      });

      const res = await apiFetch<{ data: Merchant[]; pagination: Pagination }>(
        `/merchants?${params}`
      );

      if (res.data) {
        setMerchants(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchMerchants();
  };

  return (
    <div className="min-h-screen bg-brand-light-gray">
      {/* Header */}
      <div className="bg-brand-green text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">KorrectNG Marketplace</h1>
          <p className="text-green-100 mb-6">
            Find verified suppliers for building materials, electrical supplies, and more
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchants or products..."
              className="flex-1 px-4 py-3 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-brand-green rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
          >
            <option value="">All Categories</option>
            {MERCHANT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
          >
            <option value="">All Locations</option>
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {MERCHANT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategoryFilter(cat.value === categoryFilter ? '' : cat.value);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-brand-gray hover:bg-gray-100'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-brand-green text-xl">Loading...</div>
          </div>
        ) : merchants.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center">
            <div className="text-6xl mb-4">🏪</div>
            <h2 className="text-xl font-bold mb-2">No Merchants Found</h2>
            <p className="text-brand-gray">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <>
            <p className="text-brand-gray mb-4">
              {pagination?.total || 0} verified merchants found
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchants.map((merchant) => (
                <Link
                  key={merchant._id}
                  href={`/merchant/${merchant.slug}`}
                  className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-brand-light-gray rounded-lg flex items-center justify-center flex-shrink-0">
                        {merchant.businessLogo ? (
                          <img
                            src={merchant.businessLogo}
                            alt={merchant.businessName}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-3xl">{getMerchantCategoryIcon(merchant.category)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{merchant.businessName}</h3>
                        <p className="text-sm text-brand-gray">
                          {getMerchantCategoryLabel(merchant.category)}
                        </p>
                        <p className="text-sm text-brand-gray">{merchant.location}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-4 text-sm text-brand-gray line-clamp-2">
                      {merchant.description}
                    </p>

                    {/* Stats */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-brand-star">★</span>
                        <span className="font-semibold">{formatRating(merchant.averageRating)}</span>
                        <span className="text-sm text-brand-gray">
                          ({merchant.totalReviews} reviews)
                        </span>
                      </div>
                      {merchant.isVerified && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {currentPage} of {pagination.pages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={currentPage === pagination.pages}
                  className="px-4 py-2 bg-white rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
