'use client';

import type { EscrowPayment, ContractMilestone } from '@korrectng/shared';

interface PaymentProgressProps {
  escrow: EscrowPayment;
  milestones: ContractMilestone[];
}

export default function PaymentProgress({ escrow, milestones }: PaymentProgressProps) {
  const getMilestoneStatus = (milestoneNum: number) => {
    const milestone = milestones[milestoneNum - 1];
    if (!milestone) return 'pending';

    // Check if this milestone has been released
    const release = escrow.releases?.find(r => r.milestone === milestoneNum);
    if (release) {
      return release.status === 'completed' ? 'paid' : 'processing';
    }

    // Check escrow status
    const pendingStatuses: Record<number, string> = {
      1: 'milestone_1_pending',
      2: 'milestone_2_pending',
      3: 'milestone_3_pending',
    };

    if (escrow.status === pendingStatuses[milestoneNum]) {
      return 'pending_approval';
    }

    // Check milestone status from contract
    if (milestone.status === 'approved') return 'paid';
    if (milestone.status === 'completed') return 'pending_approval';
    if (milestone.status === 'in_progress') return 'in_progress';

    return 'pending';
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-gray-200' },
    in_progress: { label: 'In Progress', color: 'bg-blue-400' },
    pending_approval: { label: 'Awaiting Approval', color: 'bg-yellow-400' },
    processing: { label: 'Processing', color: 'bg-yellow-400' },
    paid: { label: 'Released', color: 'bg-green-500' },
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Payment Progress</h2>

      {/* Visual Progress Bar */}
      <div className="mb-6">
        <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
          {milestones.map((milestone, index) => {
            const status = getMilestoneStatus(index + 1);
            const statusInfo = statusLabels[status];
            return (
              <div
                key={index}
                className={`${statusInfo.color} flex items-center justify-center transition-all`}
                style={{ width: `${milestone.percentage}%` }}
              >
                <span className="text-xs font-semibold text-white drop-shadow">
                  {milestone.percentage}%
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-brand-gray">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Milestone Details */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => {
          const milestoneNum = index + 1;
          const status = getMilestoneStatus(milestoneNum);
          const statusInfo = statusLabels[status];
          const release = escrow.releases?.find(r => r.milestone === milestoneNum);

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                status === 'paid' ? 'border-green-200 bg-green-50/50' :
                status === 'pending_approval' ? 'border-yellow-200 bg-yellow-50/50' :
                status === 'in_progress' ? 'border-blue-200 bg-blue-50/50' :
                'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      status === 'paid' ? 'bg-green-500' :
                      status === 'pending_approval' ? 'bg-yellow-500' :
                      status === 'in_progress' ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}>
                      {status === 'paid' ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold text-white">{milestoneNum}</span>
                      )}
                    </div>
                    <h3 className="font-semibold">{milestone.name}</h3>
                  </div>
                  <p className="text-sm text-brand-gray mt-1 ml-8">{milestone.description}</p>
                  <span className={`inline-block mt-2 ml-8 px-2 py-0.5 text-xs rounded-full ${
                    status === 'paid' ? 'bg-green-100 text-green-700' :
                    status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                    status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {statusInfo.label}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    ₦{milestone.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-brand-gray">{milestone.percentage}%</p>
                  {release && (
                    <p className="text-xs text-green-600 mt-1">
                      Released: {new Date(release.releasedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-brand-gray">Total Released</span>
          <span className="text-xl font-bold text-green-600">
            ₦{escrow.releasedAmount.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-brand-gray">Remaining in Escrow</span>
          <span className="text-xl font-bold">
            ₦{(escrow.fundedAmount - escrow.releasedAmount - escrow.refundedAmount).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
