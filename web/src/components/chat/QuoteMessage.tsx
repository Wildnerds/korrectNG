'use client';

import { formatDistanceToNow } from 'date-fns';

interface QuoteMessageProps {
  content: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  isOwn: boolean;
  type: 'quote_sent' | 'quote_revised' | 'quote_accepted' | 'quote_rejected';
  metadata?: {
    quoteId?: string;
    totalAmount?: number;
    labourCharge?: number;
    materialsEstimate?: number;
    estimatedDuration?: string;
    version?: number;
    previousTotalAmount?: number;
    reason?: string;
  };
  onAccept?: (quoteId: string) => void;
  onReject?: (quoteId: string) => void;
  showActions?: boolean;
  actionLoading?: boolean;
}

export default function QuoteMessage({
  content,
  sender,
  createdAt,
  isOwn,
  type,
  metadata,
  onAccept,
  onReject,
  showActions = false,
  actionLoading = false,
}: QuoteMessageProps) {
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Quote accepted/rejected system messages
  if (type === 'quote_accepted' || type === 'quote_rejected') {
    const isAccepted = type === 'quote_accepted';
    return (
      <div className="flex justify-center my-4">
        <div
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            isAccepted
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {isAccepted ? '✓ Quote Accepted' : '✗ Quote Declined'}
          {metadata?.totalAmount && ` - ${formatCurrency(metadata.totalAmount)}`}
        </div>
      </div>
    );
  }

  const isRevision = type === 'quote_revised';

  return (
    <div className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender name for non-own messages */}
        {!isOwn && (
          <p className="text-xs text-gray-500 mb-1 ml-2">
            {sender.firstName} {sender.lastName}
          </p>
        )}

        {/* Quote card */}
        <div
          className={`rounded-xl overflow-hidden border ${
            isOwn ? 'border-brand-green' : 'border-gray-200'
          }`}
        >
          {/* Header */}
          <div
            className={`px-4 py-2 ${
              isOwn ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">
                {isRevision ? 'Revised Quote' : 'Quote'}
                {metadata?.version && metadata.version > 1 && (
                  <span className="ml-2 text-xs opacity-75">
                    v{metadata.version}
                  </span>
                )}
              </span>
              {isRevision && metadata?.previousTotalAmount && (
                <span className="text-xs line-through opacity-75">
                  {formatCurrency(metadata.previousTotalAmount)}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="bg-white p-4">
            {/* Total amount */}
            <div className="text-center mb-3">
              <p className="text-2xl font-bold text-brand-green">
                {metadata?.totalAmount
                  ? formatCurrency(metadata.totalAmount)
                  : 'Price TBD'}
              </p>
              <p className="text-xs text-gray-500">Total Amount</p>
            </div>

            {/* Breakdown */}
            {(metadata?.labourCharge || metadata?.materialsEstimate) && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                {metadata?.labourCharge && (
                  <div className="flex justify-between text-gray-600">
                    <span>Labour</span>
                    <span>{formatCurrency(metadata.labourCharge)}</span>
                  </div>
                )}
                {metadata?.materialsEstimate && metadata.materialsEstimate > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Materials (est.)</span>
                    <span>{formatCurrency(metadata.materialsEstimate)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Estimated duration */}
            {metadata?.estimatedDuration && (
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Duration:</span>{' '}
                {metadata.estimatedDuration}
              </p>
            )}

            {/* Message */}
            {content && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {content}
              </p>
            )}

            {/* Action buttons */}
            {showActions && metadata?.quoteId && (
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => onAccept?.(metadata.quoteId!)}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 bg-brand-green text-white rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Accept Quote'}
                </button>
                <button
                  onClick={() => onReject?.(metadata.quoteId!)}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <p
          className={`text-xs text-gray-400 mt-1 ${
            isOwn ? 'text-right mr-2' : 'ml-2'
          }`}
        >
          {timeAgo}
        </p>
      </div>
    </div>
  );
}
