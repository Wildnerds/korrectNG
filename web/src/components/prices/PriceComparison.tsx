'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Cookies from 'js-cookie';

interface PriceComparisonResult {
  itemName: string;
  found: boolean;
  quotedPrice: number;
  marketData?: {
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
    sourceCount: number;
    qualityTier: string;
    lastUpdated: string;
  };
  status: 'fair' | 'slightly_high' | 'high' | 'very_high' | 'below_market' | 'no_data';
  percentageDiff: number;
  recommendation: string;
}

interface ContractPriceAnalysis {
  totalQuoted: number;
  totalMarketAverage: number;
  totalMarketMin: number;
  totalMarketMax: number;
  overallStatus: 'fair' | 'caution' | 'overpriced';
  itemComparisons: PriceComparisonResult[];
  itemsWithNoData: string[];
  coveragePercentage: number;
}

interface Props {
  materials: { item: string; estimatedCost: number }[];
  trade?: string;
  showDetails?: boolean;
}

const statusConfig = {
  fair: {
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: '✓',
    label: 'Fair Price',
  },
  slightly_high: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    icon: '~',
    label: 'Slightly High',
  },
  high: {
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    icon: '!',
    label: 'Above Market',
  },
  very_high: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: '!!',
    label: 'Overpriced',
  },
  below_market: {
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: '?',
    label: 'Below Market',
  },
  no_data: {
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    icon: '-',
    label: 'No Data',
  },
};

const overallStatusConfig = {
  fair: {
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Prices Look Fair',
    description: 'The quoted prices are within expected market ranges.',
  },
  caution: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: 'Some Prices Higher Than Average',
    description: 'Consider asking the artisan to justify pricing or provide receipts.',
  },
  overpriced: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Prices Appear High',
    description: 'We recommend requesting receipts or getting a second quote.',
  },
};

export default function PriceComparison({ materials, trade, showDetails = true }: Props) {
  const [analysis, setAnalysis] = useState<ContractPriceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchAnalysis() {
      if (!materials || materials.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const token = Cookies.get('token');
        const res = await apiFetch<ContractPriceAnalysis>('/prices/analyze-contract', {
          method: 'POST',
          token,
          body: JSON.stringify({ materials, trade }),
        });

        if (res.data) {
          setAnalysis(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to analyze prices');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [materials, trade]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          <span className="text-brand-gray">Analyzing prices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!analysis || materials.length === 0) {
    return null;
  }

  const overallConfig = overallStatusConfig[analysis.overallStatus];

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header Summary */}
      <div className={`p-4 ${overallConfig.bg} ${overallConfig.border} border-b`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`font-semibold ${overallConfig.color}`}>
              {overallConfig.label}
            </h3>
            <p className="text-sm text-brand-gray mt-1">
              {overallConfig.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-brand-gray">Coverage</p>
            <p className="font-semibold">{analysis.coveragePercentage}%</p>
          </div>
        </div>

        {/* Price Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-brand-gray">Quoted Total</p>
            <p className="font-bold text-lg">₦{analysis.totalQuoted.toLocaleString()}</p>
          </div>
          {analysis.totalMarketAverage > 0 && (
            <>
              <div>
                <p className="text-brand-gray">Market Average</p>
                <p className="font-semibold">₦{analysis.totalMarketAverage.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-brand-gray">Market Range</p>
                <p className="font-semibold">
                  ₦{analysis.totalMarketMin.toLocaleString()} - ₦{analysis.totalMarketMax.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm text-brand-gray hover:bg-gray-50 transition-colors"
          >
            <span>View item-by-item breakdown</span>
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="border-t">
              {analysis.itemComparisons.map((item, index) => {
                const config = statusConfig[item.status];
                return (
                  <div
                    key={index}
                    className={`p-4 border-b last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.itemName}</h4>
                        <p className="text-sm text-brand-gray mt-1">
                          Quoted: ₦{item.quotedPrice.toLocaleString()}
                        </p>
                        {item.marketData && (
                          <p className="text-sm text-brand-gray">
                            Market: ₦{item.marketData.minPrice.toLocaleString()} - ₦{item.marketData.maxPrice.toLocaleString()}
                            <span className="text-xs ml-2">({item.marketData.sourceCount} sources)</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                          <span>{config.icon}</span>
                          <span>{config.label}</span>
                        </span>
                        {item.found && item.percentageDiff !== 0 && (
                          <p className={`text-xs mt-1 ${item.percentageDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.percentageDiff > 0 ? '+' : ''}{item.percentageDiff}% vs avg
                          </p>
                        )}
                      </div>
                    </div>
                    {item.recommendation && item.status !== 'fair' && item.status !== 'no_data' && (
                      <p className="text-xs text-brand-gray mt-2 italic">
                        {item.recommendation}
                      </p>
                    )}
                  </div>
                );
              })}

              {analysis.itemsWithNoData.length > 0 && (
                <div className="p-4 bg-gray-100">
                  <p className="text-sm text-brand-gray">
                    <span className="font-medium">Items without market data:</span>{' '}
                    {analysis.itemsWithNoData.join(', ')}
                  </p>
                  <p className="text-xs text-brand-gray mt-1">
                    Consider asking the artisan for receipts for these items.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
