'use client';

import type { Badge, BadgeType } from '@korrectng/shared';

interface Props {
  badges: Badge[];
  size?: 'sm' | 'md' | 'lg';
  showAll?: boolean;
  maxDisplay?: number;
}

const badgeConfig: Record<BadgeType, { icon: string; name: string; description: string }> = {
  first_job: {
    icon: '1',
    name: 'First Job',
    description: 'Completed first job on KorrectNG',
  },
  jobs_10: {
    icon: '10',
    name: '10 Jobs',
    description: 'Completed 10 jobs on the platform',
  },
  jobs_50: {
    icon: '50',
    name: '50 Jobs',
    description: 'Completed 50 jobs on the platform',
  },
  jobs_100: {
    icon: '100',
    name: '100 Jobs',
    description: 'Completed 100 jobs on the platform',
  },
  five_star_average: {
    icon: '5',
    name: 'Five Star Service',
    description: 'Maintained a 5.0 average rating with at least 10 reviews',
  },
  quick_responder: {
    icon: 'QR',
    name: 'Quick Responder',
    description: 'Average response time under 1 hour',
  },
  dispute_free: {
    icon: 'DF',
    name: 'Dispute Free',
    description: 'Completed 50+ jobs with zero disputes',
  },
  always_on_time: {
    icon: 'OT',
    name: 'Always On Time',
    description: '100% on-time delivery rate with 20+ jobs',
  },
};

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function BadgeDisplay({ badges, size = 'md', showAll = false, maxDisplay = 5 }: Props) {
  if (!badges || badges.length === 0) {
    return null;
  }

  const displayBadges = showAll ? badges : badges.slice(0, maxDisplay);
  const remainingCount = badges.length - displayBadges.length;

  return (
    <div className="flex flex-wrap gap-2">
      {displayBadges.map((badge, index) => {
        const config = badgeConfig[badge.type];
        if (!config) return null;

        return (
          <div
            key={`${badge.type}-${index}`}
            className={`${sizeClasses[size]} bg-brand-green text-white rounded-full flex items-center justify-center font-bold cursor-help`}
            title={`${config.name}: ${config.description}`}
          >
            {config.icon}
          </div>
        );
      })}
      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} bg-gray-200 text-brand-gray rounded-full flex items-center justify-center font-bold`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export function BadgeList({ badges }: { badges: Badge[] }) {
  if (!badges || badges.length === 0) {
    return (
      <p className="text-brand-gray text-sm">No badges earned yet. Complete jobs to earn badges!</p>
    );
  }

  return (
    <div className="space-y-3">
      {badges.map((badge, index) => {
        const config = badgeConfig[badge.type];
        if (!config) return null;

        return (
          <div
            key={`${badge.type}-${index}`}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className="w-12 h-12 bg-brand-green text-white rounded-full flex items-center justify-center font-bold text-sm">
              {config.icon}
            </div>
            <div>
              <h4 className="font-semibold">{config.name}</h4>
              <p className="text-sm text-brand-gray">{config.description}</p>
              <p className="text-xs text-brand-gray mt-1">
                Earned: {new Date(badge.earnedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
