'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatRating, getMerchantCategoryIcon } from '@korrectng/shared';

interface MerchantQuote {
  merchant: {
    _id: string;
    businessName: string;
    slug: string;
    category: string;
    location: string;
    businessLogo?: string;
    averageRating: number;
    totalReviews: number;
    trustLevel: string;
    deliveryAreas: string[];
    defaultDeliveryFee: number;
    freeDeliveryThreshold?: number;
  };
  items: {
    materialName: string;
    product: {
      _id: string;
      name: string;
      price: number;
      unit: string;
      stockQuantity: number;
      images?: { url: string }[];
    };
    quantity: number;
    totalPrice: number;
    available: boolean;
  }[];
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  allItemsAvailable: boolean;
  priceRank: 'lowest' | 'competitive' | 'higher';
}

interface MerchantComparisonProps {
  quotes: MerchantQuote[];
  onSelectMerchant: (quote: MerchantQuote) => void;
  selectedMerchantId?: string;
  loading?: boolean;
  onAlternativeSelected?: (option: 'customer_sources' | 'artisan_sources') => void;
  selectedAlternative?: 'customer_sources' | 'artisan_sources' | null;
}

export function MerchantComparison({
  quotes,
  onSelectMerchant,
  selectedMerchantId,
  loading = false,
  onAlternativeSelected,
  selectedAlternative,
}: MerchantComparisonProps) {
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'reviews'>('price');

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <div className="animate-pulse">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-brand-gray">Finding merchants with your materials...</p>
        </div>
      </div>
    );
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="font-semibold text-lg mb-2">No Merchants Found</h3>
            <p className="text-brand-gray text-sm">
              No verified merchants currently have all the materials you need in stock.
              Choose how you'd like to proceed:
            </p>
          </div>

          <div className="space-y-3">
            {/* Customer Sources Materials */}
            <button
              onClick={() => onAlternativeSelected?.('customer_sources')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedAlternative === 'customer_sources'
                  ? 'border-brand-green bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">🛒</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">I'll source the materials myself</h4>
                  <p className="text-sm text-brand-gray">
                    Purchase materials from your preferred vendor. Share receipts with the artisan for transparency.
                  </p>
                  {selectedAlternative === 'customer_sources' && (
                    <div className="mt-2 text-sm text-brand-green font-medium flex items-center gap-1">
                      <span>✓</span> Selected
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Artisan Sources Materials */}
            <button
              onClick={() => onAlternativeSelected?.('artisan_sources')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedAlternative === 'artisan_sources'
                  ? 'border-brand-orange bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔧</div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Let the artisan source materials</h4>
                  <p className="text-sm text-brand-gray">
                    The artisan will purchase materials and add the cost to your total.
                    Receipts will be provided for transparency.
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Note: This cost is outside of our escrow protection
                  </p>
                  {selectedAlternative === 'artisan_sources' && (
                    <div className="mt-2 text-sm text-brand-orange font-medium flex items-center gap-1">
                      <span>✓</span> Selected
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Why no merchants?</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Materials may be specialized or uncommon</li>
            <li>• Local merchants may not have registered yet</li>
            <li>• Stock may be temporarily unavailable</li>
          </ul>
          <p className="text-sm text-blue-700 mt-2">
            <Link href="/merchants" className="underline font-medium">
              Browse all merchants
            </Link>
            {' '}to see what's available
          </p>
        </div>
      </div>
    );
  }

  const sortedQuotes = [...quotes].sort((a, b) => {
    if (sortBy === 'price') return a.totalPrice - b.totalPrice;
    if (sortBy === 'rating') return b.merchant.averageRating - a.merchant.averageRating;
    if (sortBy === 'reviews') return b.merchant.totalReviews - a.merchant.totalReviews;
    return 0;
  });

  const lowestPrice = Math.min(...quotes.map(q => q.totalPrice));

  const getPriceLabel = (quote: MerchantQuote) => {
    if (quote.totalPrice === lowestPrice) {
      return { text: 'Lowest Price', color: 'bg-green-100 text-green-700' };
    }
    const diff = ((quote.totalPrice - lowestPrice) / lowestPrice) * 100;
    if (diff <= 10) {
      return { text: 'Competitive', color: 'bg-blue-100 text-blue-700' };
    }
    return { text: `+${diff.toFixed(0)}%`, color: 'bg-gray-100 text-gray-600' };
  };

  return (
    <div className="space-y-4">
      {/* Header with sorting */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-lg">Compare Merchants</h3>
          <p className="text-sm text-brand-gray">
            {quotes.length} merchant{quotes.length !== 1 ? 's' : ''} have your materials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-gray">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-brand-green focus:border-transparent"
          >
            <option value="price">Price (Low to High)</option>
            <option value="rating">Rating (High to Low)</option>
            <option value="reviews">Most Reviews</option>
          </select>
        </div>
      </div>

      {/* Anti-collusion notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        <strong>Price Transparency:</strong> All merchants with matching products are shown.
        Prices are set independently by each merchant - compare to find the best deal.
      </div>

      {/* Merchant Cards */}
      <div className="space-y-4">
        {sortedQuotes.map((quote) => {
          const priceLabel = getPriceLabel(quote);
          const isSelected = selectedMerchantId === quote.merchant._id;

          return (
            <div
              key={quote.merchant._id}
              className={`bg-white rounded-xl border-2 transition-colors ${
                isSelected
                  ? 'border-brand-green'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Merchant Header */}
              <div className="p-4 border-b">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-brand-light-gray rounded-lg flex items-center justify-center flex-shrink-0">
                    {quote.merchant.businessLogo ? (
                      <img
                        src={quote.merchant.businessLogo}
                        alt={quote.merchant.businessName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-2xl">
                        {getMerchantCategoryIcon(quote.merchant.category)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/merchant/${quote.merchant.slug}`}
                          className="font-semibold hover:text-brand-green"
                        >
                          {quote.merchant.businessName}
                        </Link>
                        <p className="text-sm text-brand-gray">{quote.merchant.location}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priceLabel.color}`}>
                        {priceLabel.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <span className="text-brand-star">★</span>
                        {formatRating(quote.merchant.averageRating)}
                        <span className="text-brand-gray">({quote.merchant.totalReviews})</span>
                      </span>
                      <span className="text-brand-gray capitalize">
                        {quote.merchant.trustLevel} seller
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="p-4 bg-gray-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-3">
                  {quote.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={item.available ? 'text-green-500' : 'text-red-500'}>
                        {item.available ? '✓' : '✗'}
                      </span>
                      <span className="truncate">{item.materialName}</span>
                    </div>
                  ))}
                  {quote.items.length > 3 && (
                    <span className="text-brand-gray">
                      +{quote.items.length - 3} more items
                    </span>
                  )}
                </div>

                {!quote.allItemsAvailable && (
                  <p className="text-xs text-orange-600 mb-2">
                    Some items may be out of stock or unavailable
                  </p>
                )}
              </div>

              {/* Price & Action */}
              <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-brand-green">
                      NGN{quote.totalPrice.toLocaleString()}
                    </span>
                    <span className="text-sm text-brand-gray">total</span>
                  </div>
                  <p className="text-xs text-brand-gray">
                    Materials: NGN{quote.subtotal.toLocaleString()} +
                    Delivery: {quote.deliveryFee > 0 ? `NGN${quote.deliveryFee.toLocaleString()}` : 'Free'}
                  </p>
                </div>

                <button
                  onClick={() => onSelectMerchant(quote)}
                  disabled={!quote.allItemsAvailable}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    isSelected
                      ? 'bg-brand-green text-white'
                      : quote.allItemsAvailable
                        ? 'bg-brand-green text-white hover:bg-brand-green-dark'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Select Merchant'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MerchantComparison;
