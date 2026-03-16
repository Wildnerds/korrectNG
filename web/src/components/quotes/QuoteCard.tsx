'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface QuoteCardProps {
  quote: {
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
  };
  onAccept?: (quoteId: string) => void;
  onReject?: (quoteId: string) => void;
  onChat?: (quoteId: string) => void;
  actionLoading?: boolean;
  isSelected?: boolean;
  showActions?: boolean;
}

export default function QuoteCard({
  quote,
  onAccept,
  onReject,
  onChat,
  actionLoading = false,
  isSelected = false,
  showActions = true,
}: QuoteCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const timeAgo = formatDistanceToNow(new Date(quote.createdAt), {
    addSuffix: true,
  });

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden border-2 transition-all ${
        isSelected
          ? 'border-brand-green shadow-lg'
          : 'border-transparent hover:border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {quote.artisan.avatar ? (
            <img
              src={quote.artisan.avatar}
              alt={`${quote.artisan.firstName} ${quote.artisan.lastName}`}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand-green text-white flex items-center justify-center font-semibold text-lg">
              {getInitials(quote.artisan.firstName, quote.artisan.lastName)}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link
              href={`/artisan/${quote.artisanProfile.slug}`}
              className="font-semibold text-brand-black hover:text-brand-green transition-colors"
            >
              {quote.artisanProfile.businessName ||
                `${quote.artisan.firstName} ${quote.artisan.lastName}`}
            </Link>
            <p className="text-sm text-gray-500">
              {quote.artisanProfile.trade}
            </p>

            {/* Rating */}
            {quote.artisanProfile.rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-brand-star">★</span>
                <span className="text-sm font-medium">
                  {quote.artisanProfile.rating.toFixed(1)}
                </span>
                {quote.artisanProfile.reviewCount && (
                  <span className="text-xs text-gray-400">
                    ({quote.artisanProfile.reviewCount} reviews)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className="flex flex-col items-end gap-1">
            {quote.status === 'accepted' && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Accepted
              </span>
            )}
            {quote.version > 1 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                Revised v{quote.version}
              </span>
            )}
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="p-4 bg-gray-50">
        <div className="text-center mb-3">
          <p className="text-3xl font-bold text-brand-green">
            {formatCurrency(quote.totalAmount)}
          </p>
          <p className="text-xs text-gray-500">Total Quote</p>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Labour</span>
            <span className="font-medium">{formatCurrency(quote.labourCharge)}</span>
          </div>
          {quote.materialsEstimate && quote.materialsEstimate > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Materials (estimate)</span>
              <span className="font-medium">
                {formatCurrency(quote.materialsEstimate)}
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
            <span>Platform fee (10% of labour)</span>
            <span>{formatCurrency(quote.platformFee)}</span>
          </div>
        </div>

        {/* Duration */}
        {quote.estimatedDuration && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Estimated: {quote.estimatedDuration}</span>
          </div>
        )}

        {/* External sourcing notice */}
        {quote.externalSourcingRequired && (
          <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Materials need external sourcing</span>
          </div>
        )}
      </div>

      {/* Message */}
      {quote.message && (
        <div className="p-4 border-t border-gray-100">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {quote.message}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
        {quote.artisanProfile.completedJobs && (
          <div className="flex items-center gap-1">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{quote.artisanProfile.completedJobs} jobs completed</span>
          </div>
        )}
        {quote.artisanProfile.averageResponseTime && (
          <div className="flex items-center gap-1">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>
              ~{quote.artisanProfile.averageResponseTime}min response
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && quote.status === 'pending' && (
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onAccept?.(quote._id)}
            disabled={actionLoading}
            className="flex-1 py-2.5 px-4 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50"
          >
            {actionLoading ? 'Processing...' : 'Accept Quote'}
          </button>
          <button
            onClick={() => onChat?.(quote._id)}
            disabled={actionLoading}
            className="py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Chat
          </button>
          <button
            onClick={() => onReject?.(quote._id)}
            disabled={actionLoading}
            className="py-2.5 px-4 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}
