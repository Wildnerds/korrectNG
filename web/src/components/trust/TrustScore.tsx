'use client';

import type { TrustLevel as TrustLevelType } from '@korrectng/shared';
import TrustLevel from './TrustLevel';

interface Props {
  score: number;
  level: TrustLevelType;
  showDetails?: boolean;
  completionRate?: number;
  onTimeRate?: number;
  responseTime?: number;
  averageRating?: number;
}

export default function TrustScore({
  score,
  level,
  showDetails = false,
  completionRate,
  onTimeRate,
  responseTime,
  averageRating,
}: Props) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-purple-600';
    if (s >= 75) return 'text-yellow-600';
    if (s >= 50) return 'text-gray-600';
    return 'text-amber-700';
  };

  const getProgressColor = (s: number) => {
    if (s >= 90) return 'bg-purple-500';
    if (s >= 75) return 'bg-yellow-500';
    if (s >= 50) return 'bg-gray-500';
    return 'bg-amber-500';
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <TrustLevel level={level} size="lg" showLabel />
          <div>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
            <span className="text-brand-gray text-sm">/100</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {completionRate !== undefined && (
            <div className="flex justify-between">
              <span className="text-brand-gray">Completion</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
          )}
          {onTimeRate !== undefined && (
            <div className="flex justify-between">
              <span className="text-brand-gray">On-Time</span>
              <span className="font-medium">{onTimeRate}%</span>
            </div>
          )}
          {responseTime !== undefined && (
            <div className="flex justify-between">
              <span className="text-brand-gray">Avg Response</span>
              <span className="font-medium">
                {responseTime < 60 ? `${responseTime}m` : `${Math.round(responseTime / 60)}h`}
              </span>
            </div>
          )}
          {averageRating !== undefined && (
            <div className="flex justify-between">
              <span className="text-brand-gray">Rating</span>
              <span className="font-medium">{averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
