import type { BadgeType } from '../models/ArtisanProfile';

export interface BadgeDefinition {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  condition: {
    metric: string;
    operator: '>=' | '>' | '==' | '<=' | '<';
    value: number;
    secondaryMetric?: string;
    secondaryValue?: number;
  };
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: 'first_job',
    name: 'First Job',
    description: 'Completed your first job on KorrectNG',
    icon: '🎉',
    condition: {
      metric: 'jobsCompleted',
      operator: '>=',
      value: 1,
    },
  },
  {
    type: 'jobs_10',
    name: '10 Jobs',
    description: 'Completed 10 jobs on the platform',
    icon: '⭐',
    condition: {
      metric: 'jobsCompleted',
      operator: '>=',
      value: 10,
    },
  },
  {
    type: 'jobs_50',
    name: '50 Jobs',
    description: 'Completed 50 jobs on the platform',
    icon: '🌟',
    condition: {
      metric: 'jobsCompleted',
      operator: '>=',
      value: 50,
    },
  },
  {
    type: 'jobs_100',
    name: '100 Jobs',
    description: 'Completed 100 jobs on the platform',
    icon: '💯',
    condition: {
      metric: 'jobsCompleted',
      operator: '>=',
      value: 100,
    },
  },
  {
    type: 'five_star_average',
    name: 'Five Star Service',
    description: 'Maintained a 5.0 average rating with at least 10 reviews',
    icon: '⭐⭐⭐⭐⭐',
    condition: {
      metric: 'averageRating',
      operator: '==',
      value: 5,
      secondaryMetric: 'totalReviews',
      secondaryValue: 10,
    },
  },
  {
    type: 'quick_responder',
    name: 'Quick Responder',
    description: 'Average response time under 1 hour (with 10+ responses)',
    icon: '⚡',
    condition: {
      metric: 'responseTime',
      operator: '<',
      value: 60, // 60 minutes
      secondaryMetric: 'responseCount',
      secondaryValue: 10,
    },
  },
  {
    type: 'dispute_free',
    name: 'Dispute Free',
    description: 'Completed 50+ jobs with zero disputes',
    icon: '🏆',
    condition: {
      metric: 'totalJobsDisputed',
      operator: '==',
      value: 0,
      secondaryMetric: 'jobsCompleted',
      secondaryValue: 50,
    },
  },
  {
    type: 'always_on_time',
    name: 'Always On Time',
    description: '100% on-time delivery rate with 20+ jobs',
    icon: '⏰',
    condition: {
      metric: 'onTimeRate',
      operator: '==',
      value: 100,
      secondaryMetric: 'jobsCompleted',
      secondaryValue: 20,
    },
  },
];

/**
 * Get badge definition by type
 */
export function getBadgeDefinition(type: BadgeType): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.type === type);
}

/**
 * Get all badge definitions
 */
export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return BADGE_DEFINITIONS;
}

export default BADGE_DEFINITIONS;
