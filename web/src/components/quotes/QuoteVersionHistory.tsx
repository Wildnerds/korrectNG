'use client';

import { format } from 'date-fns';

interface QuoteVersion {
  labourCharge: number;
  materialsEstimate?: number;
  totalAmount: number;
  platformFee: number;
  artisanEarnings: number;
  message?: string;
  createdAt: string;
}

interface QuoteVersionHistoryProps {
  currentVersion: number;
  currentAmount: number;
  previousVersions: QuoteVersion[];
}

export default function QuoteVersionHistory({
  currentVersion,
  currentAmount,
  previousVersions,
}: QuoteVersionHistoryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (previousVersions.length === 0) {
    return null;
  }

  // Combine current and previous versions for timeline display
  const allVersions = [
    ...previousVersions.map((v, i) => ({
      ...v,
      version: i + 1,
      isCurrent: false,
    })),
    {
      totalAmount: currentAmount,
      version: currentVersion,
      isCurrent: true,
      createdAt: new Date().toISOString(),
    },
  ].reverse(); // Most recent first

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-gray-400"
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
        Quote History
      </h4>

      <div className="space-y-3">
        {allVersions.map((version, index) => (
          <div
            key={version.version}
            className={`relative pl-6 pb-3 ${
              index !== allVersions.length - 1
                ? 'border-l-2 border-gray-200'
                : ''
            }`}
          >
            {/* Timeline dot */}
            <div
              className={`absolute left-0 top-0 w-3 h-3 rounded-full transform -translate-x-[7px] ${
                version.isCurrent ? 'bg-brand-green' : 'bg-gray-300'
              }`}
            />

            {/* Version info */}
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-sm font-medium ${
                  version.isCurrent ? 'text-brand-green' : 'text-gray-600'
                }`}
              >
                Version {version.version}
                {version.isCurrent && (
                  <span className="ml-2 px-2 py-0.5 bg-brand-green text-white text-xs rounded-full">
                    Current
                  </span>
                )}
              </span>
              <span className="text-sm font-semibold">
                {formatCurrency(version.totalAmount)}
              </span>
            </div>

            {/* Date and change indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{format(new Date(version.createdAt), 'MMM d, yyyy h:mm a')}</span>
              {index < allVersions.length - 1 && (
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    version.totalAmount < allVersions[index + 1].totalAmount
                      ? 'bg-green-100 text-green-600'
                      : version.totalAmount > allVersions[index + 1].totalAmount
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {version.totalAmount < allVersions[index + 1].totalAmount
                    ? '↓ Reduced'
                    : version.totalAmount > allVersions[index + 1].totalAmount
                    ? '↑ Increased'
                    : 'No change'}
                </span>
              )}
            </div>

            {/* Message if available */}
            {'message' in version && version.message && (
              <p className="mt-2 text-sm text-gray-600 italic">
                "{version.message}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
