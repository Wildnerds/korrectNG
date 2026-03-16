'use client';

import { useState } from 'react';
import QuoteCard from './QuoteCard';

interface Quote {
  _id: string;
  labourCharge: number;
  materialsEstimate?: number;
  totalAmount: number;
  platformFee: number;
  message?: string;
  estimatedDuration?: string;
  externalSourcingRequired: boolean;
  version: number;
  status: string;
  createdAt: string;
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  artisanProfile: {
    _id: string;
    businessName: string;
    slug: string;
    trade: string;
    rating?: number;
    reviewCount?: number;
    averageResponseTime?: number;
    completedJobs?: number;
  };
}

interface QuoteComparisonProps {
  quotes: Quote[];
  onAccept: (quoteId: string) => void;
  onReject: (quoteId: string) => void;
  onChat: (quoteId: string) => void;
  actionLoading?: string | null;
}

type SortOption = 'price_low' | 'price_high' | 'rating' | 'response_time' | 'newest';

export default function QuoteComparison({
  quotes,
  onAccept,
  onReject,
  onChat,
  actionLoading,
}: QuoteComparisonProps) {
  const [sortBy, setSortBy] = useState<SortOption>('price_low');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'response_time', label: 'Fastest Response' },
    { value: 'newest', label: 'Most Recent' },
  ];

  const sortedQuotes = [...quotes].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return a.totalAmount - b.totalAmount;
      case 'price_high':
        return b.totalAmount - a.totalAmount;
      case 'rating':
        return (b.artisanProfile.rating || 0) - (a.artisanProfile.rating || 0);
      case 'response_time':
        return (
          (a.artisanProfile.averageResponseTime || 999) -
          (b.artisanProfile.averageResponseTime || 999)
        );
      case 'newest':
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return 0;
    }
  });

  // Find best values for highlighting
  const lowestPrice = Math.min(...quotes.map((q) => q.totalAmount));
  const highestRating = Math.max(
    ...quotes.map((q) => q.artisanProfile.rating || 0)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-brand-green">
            {quotes.length}
          </p>
          <p className="text-sm text-gray-500">Quotes Received</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-brand-black">
            {formatCurrency(lowestPrice)}
          </p>
          <p className="text-sm text-gray-500">Lowest Price</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-brand-star">
            {highestRating.toFixed(1)}★
          </p>
          <p className="text-sm text-gray-500">Highest Rating</p>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {quotes.filter((q) => q.status === 'pending').length} pending quotes
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-brand-green"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quotes grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedQuotes.map((quote) => (
          <div
            key={quote._id}
            onClick={() => setSelectedQuoteId(quote._id)}
            className="cursor-pointer"
          >
            {/* Best value badges */}
            {(quote.totalAmount === lowestPrice ||
              quote.artisanProfile.rating === highestRating) && (
              <div className="flex gap-2 mb-2">
                {quote.totalAmount === lowestPrice && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Best Price
                  </span>
                )}
                {quote.artisanProfile.rating === highestRating &&
                  highestRating > 0 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      Top Rated
                    </span>
                  )}
              </div>
            )}

            <QuoteCard
              quote={quote}
              onAccept={onAccept}
              onReject={onReject}
              onChat={onChat}
              actionLoading={actionLoading === quote._id}
              isSelected={selectedQuoteId === quote._id}
              showActions={quote.status === 'pending'}
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {quotes.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-gray-500 mb-2">No quotes yet</p>
          <p className="text-sm text-gray-400">
            Artisans will start sending quotes soon. Check back later!
          </p>
        </div>
      )}
    </div>
  );
}
