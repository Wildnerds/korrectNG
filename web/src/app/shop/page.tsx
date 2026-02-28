'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { MERCHANT_CATEGORIES, LOCATIONS, getMerchantCategoryLabel, getProductUnitLabel } from '@korrectng/shared';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  stockQuantity: number;
  images: { url: string; publicId: string }[];
  merchant: {
    _id: string;
    businessName: string;
    slug: string;
    location: string;
    averageRating: number;
    isVerified: boolean;
  };
}

interface Merchant {
  _id: string;
  businessName: string;
  slug: string;
  location: string;
  businessLogo?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type ViewMode = 'products' | 'merchants';

export default function ShopPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (viewMode === 'products') {
      fetchProducts();
    } else {
      fetchMerchants();
    }
  }, [currentPage, categoryFilter, locationFilter, sortBy, viewMode]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(categoryFilter && { category: categoryFilter }),
        ...(locationFilter && { location: locationFilter }),
        ...(searchQuery && { q: searchQuery }),
        ...(sortBy && { sort: sortBy }),
      });

      const res = await apiFetch<{ data: Product[]; pagination: Pagination }>(
        `/products?${params}`
      );

      if (res.data) {
        setProducts(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }

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
    if (viewMode === 'products') {
      fetchProducts();
    } else {
      fetchMerchants();
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-brand-light-gray">
      {/* Header */}
      <div className="bg-brand-green text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Shop Materials</h1>
          <p className="text-green-100 mb-6">
            Browse building materials, electrical supplies, plumbing equipment and more from verified merchants
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={viewMode === 'products' ? 'Search products...' : 'Search merchants...'}
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
        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleViewModeChange('products')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'products'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            Browse Products
          </button>
          <button
            onClick={() => handleViewModeChange('merchants')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              viewMode === 'merchants'
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            Shop by Merchant
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
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

          {viewMode === 'products' && (
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-brand-green focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setCategoryFilter('');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !categoryFilter
                ? 'bg-brand-green text-white'
                : 'bg-white text-brand-gray hover:bg-gray-100'
            }`}
          >
            All
          </button>
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
        ) : viewMode === 'products' ? (
          /* Products Grid */
          products.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-xl font-bold mb-2">No Products Found</h2>
              <p className="text-brand-gray">
                Try adjusting your filters or search query
              </p>
            </div>
          ) : (
            <>
              <p className="text-brand-gray mb-4">
                {pagination?.total || 0} products found
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <Link
                    key={product._id}
                    href={`/merchant/${product.merchant.slug}?product=${product.slug}`}
                    className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
                  >
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {product.images?.[0]?.url ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
                          📦
                        </div>
                      )}
                      {product.stockQuantity <= 5 && product.stockQuantity > 0 && (
                        <span className="absolute top-2 right-2 px-2 py-1 bg-orange-500 text-white text-xs rounded">
                          Low Stock
                        </span>
                      )}
                      {product.stockQuantity === 0 && (
                        <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
                      <p className="text-brand-green font-bold text-xl mb-2">
                        NGN{product.price.toLocaleString()}/{getProductUnitLabel(product.unit)}
                      </p>
                      <p className="text-sm text-brand-gray line-clamp-2 mb-3">
                        {product.description}
                      </p>

                      {/* Merchant Info */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <div className="w-6 h-6 bg-brand-light-gray rounded-full flex items-center justify-center text-xs">
                          🏪
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.merchant.businessName}</p>
                          <p className="text-xs text-brand-gray">{product.merchant.location}</p>
                        </div>
                        {product.merchant.isVerified && (
                          <span className="text-green-500 text-sm">✓</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )
        ) : (
          /* Merchants Grid */
          merchants.length === 0 ? (
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
                {pagination?.total || 0} verified merchants
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {merchants.map((merchant) => (
                  <Link
                    key={merchant._id}
                    href={`/merchant/${merchant.slug}`}
                    className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-brand-light-gray rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {merchant.businessLogo ? (
                          <img
                            src={merchant.businessLogo}
                            alt={merchant.businessName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">🏪</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{merchant.businessName}</h3>
                        <p className="text-sm text-brand-gray">{merchant.location}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-brand-green font-medium">
                      View Products &rarr;
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )
        )}

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
      </div>
    </div>
  );
}
