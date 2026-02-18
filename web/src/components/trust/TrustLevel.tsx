'use client';

import type { TrustLevel as TrustLevelType } from '@korrectng/shared';

interface Props {
  level: TrustLevelType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const levelConfig: Record<TrustLevelType, { color: string; bg: string; border: string; icon: string; label: string }> = {
  bronze: {
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    icon: 'B',
    label: 'Bronze',
  },
  silver: {
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-400',
    icon: 'S',
    label: 'Silver',
  },
  gold: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    border: 'border-yellow-400',
    icon: 'G',
    label: 'Gold',
  },
  platinum: {
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    border: 'border-purple-400',
    icon: 'P',
    label: 'Platinum',
  },
};

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

export default function TrustLevel({ level, size = 'md', showLabel = false }: Props) {
  const config = levelConfig[level];

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} ${config.bg} ${config.color} ${config.border} border-2 rounded-full flex items-center justify-center font-bold`}
        title={`${config.label} Trust Level`}
      >
        {config.icon}
      </div>
      {showLabel && (
        <span className={`${config.color} font-medium ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
