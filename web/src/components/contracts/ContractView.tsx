'use client';

import type { JobContract } from '@korrectng/shared';

interface ContractViewProps {
  contract: JobContract;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  pending_signatures: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  signed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  active: { bg: 'bg-brand-green/10', text: 'text-brand-green' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  disputed: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const milestoneStatusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  completed: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  disputed: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function ContractView({ contract }: ContractViewProps) {
  const statusStyle = statusColors[contract.status] || statusColors.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{contract.title}</h1>
            <p className="text-brand-gray">Contract #{contract._id.slice(-8).toUpperCase()}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
            {contract.status.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-sm text-brand-gray">Total Value</p>
            <p className="font-semibold">₦{contract.totalAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-brand-gray">Start Date</p>
            <p className="font-semibold">{new Date(contract.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-brand-gray">End Date</p>
            <p className="font-semibold">{new Date(contract.estimatedEndDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-brand-gray">Materials</p>
            <p className="font-semibold capitalize">{contract.materialsResponsibility}</p>
          </div>
        </div>
      </div>

      {/* Scope of Work */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Scope of Work</h2>
        <p className="text-brand-gray whitespace-pre-wrap">{contract.scopeOfWork}</p>
      </div>

      {/* Deliverables */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Deliverables</h2>
        <ul className="space-y-2">
          {contract.deliverables.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <svg className="w-5 h-5 text-brand-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-brand-gray">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Exclusions */}
      {contract.exclusions && contract.exclusions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Exclusions</h2>
          <ul className="space-y-2">
            {contract.exclusions.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-brand-gray">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Materials List */}
      {contract.materialsList && contract.materialsList.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Materials</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Item</th>
                  <th className="text-left py-2 font-medium">Est. Cost</th>
                  <th className="text-left py-2 font-medium">Provided By</th>
                </tr>
              </thead>
              <tbody>
                {contract.materialsList.map((material, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2">{material.item}</td>
                    <td className="py-2">₦{material.estimatedCost.toLocaleString()}</td>
                    <td className="py-2 capitalize">{material.providedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Milestones */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Payment Milestones</h2>
        <div className="space-y-4">
          {contract.milestones.map((milestone, index) => {
            const msStatusStyle = milestoneStatusColors[milestone.status] || milestoneStatusColors.pending;
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  milestone.status === 'approved' ? 'border-green-200 bg-green-50/50' :
                  milestone.status === 'in_progress' ? 'border-blue-200 bg-blue-50/50' :
                  'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">
                      Milestone {milestone.order}: {milestone.name}
                    </h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${msStatusStyle.bg} ${msStatusStyle.text}`}>
                      {milestone.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-brand-green">
                      ₦{milestone.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-brand-gray">{milestone.percentage}%</p>
                  </div>
                </div>
                <p className="text-sm text-brand-gray">{milestone.description}</p>
                {milestone.triggerCondition && (
                  <p className="text-sm text-blue-600 mt-2">
                    Trigger: {milestone.triggerCondition}
                  </p>
                )}
                {milestone.dueDate && (
                  <p className="text-sm text-brand-gray mt-1">
                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Financial Summary</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Total Contract Value</span>
            <span className="font-semibold">₦{contract.totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-brand-gray">
            <span>Platform Fee (10%)</span>
            <span>- ₦{contract.platformFee.toLocaleString()}</span>
          </div>
          <div className="border-t pt-2 flex justify-between text-brand-green font-semibold">
            <span>Artisan Earnings</span>
            <span>₦{contract.artisanEarnings.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Signatures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${contract.customerSignature ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
            <p className="font-medium mb-1">Customer</p>
            {contract.customerSignature ? (
              <div className="text-sm text-green-700">
                <p>Signed by: {(contract.customer as any)?.firstName} {(contract.customer as any)?.lastName}</p>
                <p>Date: {new Date(contract.customerSignature.signedAt).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-sm text-brand-gray">Awaiting signature</p>
            )}
          </div>
          <div className={`p-4 rounded-lg ${contract.artisanSignature ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
            <p className="font-medium mb-1">Artisan</p>
            {contract.artisanSignature ? (
              <div className="text-sm text-green-700">
                <p>Signed by: {(contract.artisan as any)?.firstName} {(contract.artisan as any)?.lastName}</p>
                <p>Date: {new Date(contract.artisanSignature.signedAt).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-sm text-brand-gray">Awaiting signature</p>
            )}
          </div>
        </div>
      </div>

      {/* Status History */}
      {contract.statusHistory && contract.statusHistory.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Status History</h2>
          <div className="space-y-3">
            {contract.statusHistory.map((history, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-brand-green rounded-full mt-2" />
                <div>
                  <p className="font-medium capitalize">{history.status.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-brand-gray">
                    {new Date(history.timestamp).toLocaleString()}
                    {history.note && ` - ${history.note}`}
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
