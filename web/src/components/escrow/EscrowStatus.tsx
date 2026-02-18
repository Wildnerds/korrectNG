'use client';

import type { EscrowPayment } from '@korrectng/shared';

interface EscrowStatusProps {
  escrow: EscrowPayment;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  created: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Awaiting Funding' },
  funded: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Funded' },
  milestone_1_pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Milestone 1 Pending' },
  milestone_1_released: { bg: 'bg-green-100', text: 'text-green-700', label: 'Milestone 1 Released' },
  milestone_2_pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Milestone 2 Pending' },
  milestone_2_released: { bg: 'bg-green-100', text: 'text-green-700', label: 'Milestone 2 Released' },
  milestone_3_pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Milestone 3 Pending' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  disputed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Disputed' },
  resolved: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Resolved' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
  partial_refund: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partial Refund' },
};

export default function EscrowStatus({ escrow }: EscrowStatusProps) {
  const statusStyle = statusColors[escrow.status] || statusColors.created;

  const remainingBalance = escrow.fundedAmount - escrow.releasedAmount - escrow.refundedAmount;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold">Escrow Status</h2>
          <p className="text-sm text-brand-gray">Payment protection for both parties</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-brand-gray">Total Amount</p>
          <p className="text-xl font-bold">₦{escrow.totalAmount.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-brand-gray">In Escrow</p>
          <p className="text-xl font-bold text-blue-700">₦{remainingBalance.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-brand-gray">Released</p>
          <p className="text-xl font-bold text-green-700">₦{escrow.releasedAmount.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-brand-gray">Platform Fee</p>
          <p className="text-xl font-bold text-brand-gray">₦{escrow.platformFee.toLocaleString()}</p>
        </div>
      </div>

      {/* Status Timeline */}
      {escrow.statusHistory && escrow.statusHistory.length > 0 && (
        <div>
          <h3 className="font-medium mb-3">Payment History</h3>
          <div className="space-y-3">
            {escrow.statusHistory.slice().reverse().map((history, index) => {
              const historyStyle = statusColors[history.status] || statusColors.created;
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${historyStyle.bg}`} />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">
                        {history.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-brand-gray">
                        {new Date(history.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    {history.note && (
                      <p className="text-sm text-brand-gray">{history.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Release History */}
      {escrow.releases && escrow.releases.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium mb-3">Payment Releases</h3>
          <div className="space-y-2">
            {escrow.releases.map((release, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-green-50 rounded-lg"
              >
                <div>
                  <span className="font-medium">Milestone {release.milestone}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    release.status === 'completed' ? 'bg-green-200 text-green-700' :
                    release.status === 'processing' ? 'bg-yellow-200 text-yellow-700' :
                    release.status === 'failed' ? 'bg-red-200 text-red-700' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {release.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-700">₦{release.amount.toLocaleString()}</p>
                  <p className="text-xs text-brand-gray">
                    {new Date(release.releasedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
