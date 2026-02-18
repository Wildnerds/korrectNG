'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';
import type { EscrowPayment, ContractMilestone } from '@korrectng/shared';

interface MilestoneApprovalProps {
  escrow: EscrowPayment;
  milestones: ContractMilestone[];
  userRole: 'customer' | 'artisan';
  onUpdate?: () => void;
}

export default function MilestoneApproval({
  escrow,
  milestones,
  userRole,
  onUpdate,
}: MilestoneApprovalProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Determine which milestone is actionable
  const getActionableMilestone = (): number | null => {
    if (escrow.status === 'funded') return 1;
    if (escrow.status === 'milestone_1_released') return 2;
    if (escrow.status === 'milestone_2_released') return 3;
    return null;
  };

  const isPendingApproval = (milestoneNum: number): boolean => {
    const pendingStatuses: Record<number, string> = {
      1: 'milestone_1_pending',
      2: 'milestone_2_pending',
      3: 'milestone_3_pending',
    };
    return escrow.status === pendingStatuses[milestoneNum];
  };

  const handleRequestRelease = async (milestoneNum: number) => {
    setLoading(milestoneNum);
    setError('');

    try {
      const token = Cookies.get('token');
      await apiFetch(`/escrow/${escrow._id}/request-release/${milestoneNum}`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          milestone: milestoneNum,
          notes: `Milestone ${milestoneNum} completed`,
        }),
      });

      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to request release');
    } finally {
      setLoading(null);
    }
  };

  const handleApproveRelease = async (milestoneNum: number, approve: boolean) => {
    setLoading(milestoneNum);
    setError('');

    try {
      const token = Cookies.get('token');
      await apiFetch(`/escrow/${escrow._id}/approve-release/${milestoneNum}`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          milestone: milestoneNum,
          approved: approve,
          notes: approve ? 'Approved' : 'Rejected',
        }),
      });

      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to process approval');
    } finally {
      setLoading(null);
    }
  };

  const actionableMilestone = getActionableMilestone();

  // Check if escrow is in a terminal or inactive state
  if (['completed', 'cancelled', 'resolved', 'partial_refund', 'created'].includes(escrow.status)) {
    if (escrow.status === 'created') {
      return (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Milestone Actions</h3>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700">
              {userRole === 'customer'
                ? 'Please fund the escrow to start the project.'
                : 'Waiting for customer to fund the escrow.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Milestone Actions</h3>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-brand-gray">
            {escrow.status === 'completed'
              ? 'All milestones have been completed and paid.'
              : `This escrow is ${escrow.status.replace(/_/g, ' ')}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Milestone Actions</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {milestones.map((milestone, index) => {
          const milestoneNum = index + 1;
          const isPending = isPendingApproval(milestoneNum);
          const canRequest = userRole === 'artisan' && actionableMilestone === milestoneNum && !isPending;
          const canApprove = userRole === 'customer' && isPending;
          const isReleased = escrow.releases?.some(r => r.milestone === milestoneNum);

          if (!canRequest && !canApprove && !isPending) {
            return null;
          }

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                isPending ? 'border-yellow-300 bg-yellow-50' :
                canRequest ? 'border-brand-green bg-green-50' :
                'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold">
                    Milestone {milestoneNum}: {milestone.name}
                  </h4>
                  <p className="text-sm text-brand-gray">{milestone.description}</p>
                </div>
                <span className="font-semibold text-brand-green">
                  ₦{milestone.amount.toLocaleString()}
                </span>
              </div>

              {/* Artisan: Request Release */}
              {canRequest && (
                <button
                  onClick={() => handleRequestRelease(milestoneNum)}
                  disabled={loading === milestoneNum}
                  className="w-full py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
                >
                  {loading === milestoneNum ? 'Requesting...' : 'Request Payment Release'}
                </button>
              )}

              {/* Customer: Approve/Reject */}
              {canApprove && (
                <div>
                  <p className="text-sm text-yellow-700 mb-3">
                    The artisan has marked this milestone as complete. Please review the work
                    and approve or reject the payment release.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveRelease(milestoneNum, true)}
                      disabled={loading === milestoneNum}
                      className="flex-1 py-3 bg-brand-green text-white rounded-md hover:bg-brand-green-dark transition-colors font-semibold disabled:opacity-50"
                    >
                      {loading === milestoneNum ? 'Processing...' : 'Approve & Release'}
                    </button>
                    <button
                      onClick={() => handleApproveRelease(milestoneNum, false)}
                      disabled={loading === milestoneNum}
                      className="flex-1 py-3 border-2 border-red-400 text-red-500 rounded-md hover:bg-red-50 transition-colors font-semibold disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Pending Status (for artisan waiting) */}
              {isPending && userRole === 'artisan' && (
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    Waiting for customer to approve payment release...
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disputed State */}
      {escrow.status === 'disputed' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-700">Dispute in Progress</h4>
          <p className="text-sm text-red-600 mt-1">
            This escrow is under dispute. Milestone actions are suspended until the dispute is resolved.
          </p>
        </div>
      )}
    </div>
  );
}
