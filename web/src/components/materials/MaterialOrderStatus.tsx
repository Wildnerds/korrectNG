'use client';

import { MATERIAL_ORDER_STATUSES } from '@korrectng/shared';

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
}

interface MaterialOrderStatusProps {
  currentStatus: string;
  statusHistory?: StatusHistoryEntry[];
  showTimeline?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', icon: '⏳', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  confirmed: { label: 'Confirmed', icon: '✓', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  payment_pending: { label: 'Awaiting Payment', icon: '💳', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  paid: { label: 'Paid', icon: '✓', color: 'text-green-700', bgColor: 'bg-green-100' },
  preparing: { label: 'Preparing', icon: '📦', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  shipped: { label: 'Shipped', icon: '🚚', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  delivered: { label: 'Delivered', icon: '📍', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  received: { label: 'Received', icon: '✓', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  completed: { label: 'Completed', icon: '✅', color: 'text-green-700', bgColor: 'bg-green-100' },
  disputed: { label: 'Disputed', icon: '⚠️', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  cancelled: { label: 'Cancelled', icon: '✗', color: 'text-red-700', bgColor: 'bg-red-100' },
  refunded: { label: 'Refunded', icon: '↩', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

const STATUS_FLOW = ['pending', 'confirmed', 'paid', 'preparing', 'shipped', 'delivered', 'received', 'completed'];

export function MaterialOrderStatus({
  currentStatus,
  statusHistory = [],
  showTimeline = true,
}: MaterialOrderStatusProps) {
  const config = STATUS_CONFIG[currentStatus] || {
    label: currentStatus,
    icon: '?',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  };

  // Simplified progress for normal flow
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  const isTerminalStatus = ['cancelled', 'refunded', 'disputed'].includes(currentStatus);

  return (
    <div className="space-y-4">
      {/* Current Status Badge */}
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Progress Bar (for normal flow) */}
      {showTimeline && !isTerminalStatus && currentIndex >= 0 && (
        <div className="relative">
          <div className="flex justify-between mb-2">
            {STATUS_FLOW.slice(0, 6).map((status, idx) => {
              const stepConfig = STATUS_CONFIG[status];
              const isCompleted = idx <= currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={status} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      isCompleted
                        ? 'bg-brand-green text-white'
                        : 'bg-gray-200 text-gray-500'
                    } ${isCurrent ? 'ring-2 ring-brand-green ring-offset-2' : ''}`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs mt-1 ${isCompleted ? 'text-brand-green font-medium' : 'text-gray-400'}`}>
                    {stepConfig.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-10">
            <div
              className="h-full bg-brand-green transition-all duration-300"
              style={{ width: `${Math.min((currentIndex / 5) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Timeline */}
      {statusHistory.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Order Timeline</h4>
          <div className="space-y-3">
            {statusHistory.map((entry, idx) => {
              const entryConfig = STATUS_CONFIG[entry.status] || {
                label: entry.status,
                icon: '•',
                color: 'text-gray-700',
              };

              return (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${entryConfig.bgColor}`} />
                    {idx < statusHistory.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className={`text-sm font-medium ${entryConfig.color}`}>
                      {entryConfig.label}
                    </p>
                    <p className="text-xs text-brand-gray">
                      {new Date(entry.timestamp).toLocaleString('en-NG')}
                    </p>
                    {entry.note && (
                      <p className="text-xs text-brand-gray mt-1">{entry.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status-specific messages */}
      {currentStatus === 'pending' && (
        <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
          Waiting for merchant to confirm availability. They usually respond within 24 hours.
        </p>
      )}
      {currentStatus === 'confirmed' && (
        <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
          Merchant confirmed availability. Please complete payment to proceed.
        </p>
      )}
      {currentStatus === 'paid' && (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
          Payment received and held in escrow. Merchant is preparing your order.
        </p>
      )}
      {currentStatus === 'shipped' && (
        <p className="text-sm text-indigo-700 bg-indigo-50 p-3 rounded-lg">
          Your order is on the way! Please confirm receipt once delivered.
        </p>
      )}
      {currentStatus === 'delivered' && (
        <p className="text-sm text-teal-700 bg-teal-50 p-3 rounded-lg">
          Merchant marked as delivered. Please confirm receipt or report any issues within 72 hours.
        </p>
      )}
    </div>
  );
}

export default MaterialOrderStatus;
