import mongoose from 'mongoose';
import { ArtisanProfile, IArtisanProfile, TrustLevel, BadgeType } from '../models/ArtisanProfile';
import Booking from '../models/Booking';
import Dispute from '../models/Dispute';
import { BADGE_DEFINITIONS, BadgeDefinition } from '../data/badges';
import { createNotification } from './notifications';
import { log } from '../utils/logger';

// Trust score weights (must sum to ~100 when considering positive/negative)
const TRUST_WEIGHTS = {
  completionRate: 25,    // +25 for high completion
  cancellationRate: -15, // -15 for high cancellation
  disputeRate: -15,      // -15 for high disputes
  onTimeRate: 20,        // +20 for on-time delivery
  responseTime: 10,      // +10 for quick responses
  averageRating: 15,     // +15 for high ratings
};

// Trust level thresholds
const TRUST_LEVEL_THRESHOLDS: Record<TrustLevel, number> = {
  bronze: 0,
  silver: 50,
  gold: 75,
  platinum: 90,
};

/**
 * Recalculate all stats for an artisan
 */
export async function recalculateStats(artisanId: string): Promise<IArtisanProfile | null> {
  const artisan = await ArtisanProfile.findById(artisanId);
  if (!artisan) return null;

  // Get all bookings for this artisan
  const bookings = await Booking.find({ artisanProfile: artisanId });

  // Calculate stats
  const acceptedBookings = bookings.filter(b =>
    ['accepted', 'payment_pending', 'paid', 'in_progress', 'completed', 'confirmed'].includes(b.status)
  );
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const cancelledBookings = bookings.filter(b =>
    b.status === 'cancelled' && b.cancelledBy?.toString() === artisan.user.toString()
  );
  const disputedBookings = bookings.filter(b => b.status === 'disputed');

  // On-time calculation (completed by estimated end date)
  const onTimeBookings = confirmedBookings.filter(b => {
    if (!b.scheduledDate || !b.confirmedAt) return true; // If no deadline, count as on-time
    return b.confirmedAt <= b.scheduledDate;
  });

  // Update raw counts
  artisan.totalJobsAccepted = acceptedBookings.length;
  artisan.jobsCompleted = confirmedBookings.length;
  artisan.totalJobsCancelled = cancelledBookings.length;
  artisan.totalJobsDisputed = disputedBookings.length;
  artisan.totalJobsOnTime = onTimeBookings.length;

  // Calculate rates (avoid division by zero)
  if (artisan.totalJobsAccepted > 0) {
    artisan.completionRate = Math.round((artisan.jobsCompleted / artisan.totalJobsAccepted) * 100);
    artisan.cancellationRate = Math.round((artisan.totalJobsCancelled / artisan.totalJobsAccepted) * 100);
    artisan.disputeRate = Math.round((artisan.totalJobsDisputed / artisan.totalJobsAccepted) * 100);
  }

  if (artisan.jobsCompleted > 0) {
    artisan.onTimeRate = Math.round((artisan.totalJobsOnTime / artisan.jobsCompleted) * 100);
  }

  // Calculate average response time
  if (artisan.responseCount > 0) {
    artisan.responseTime = Math.round(artisan.totalResponseTimeMinutes / artisan.responseCount);
  }

  await artisan.save();

  // Recalculate trust score and level
  await calculateTrustScore(artisanId);

  // Check for badges
  await checkAndAwardBadges(artisanId);

  log.info('Artisan stats recalculated', {
    artisanId,
    jobsCompleted: artisan.jobsCompleted,
    trustScore: artisan.trustScore,
  });

  return artisan;
}

/**
 * Calculate trust score based on weighted metrics
 */
export async function calculateTrustScore(artisanId: string): Promise<number> {
  const artisan = await ArtisanProfile.findById(artisanId);
  if (!artisan) return 0;

  let score = 50; // Start at neutral

  // Completion rate contribution (0-100% -> 0-25 points)
  score += (artisan.completionRate / 100) * TRUST_WEIGHTS.completionRate;

  // Cancellation rate penalty (0-100% -> 0 to -15 points)
  score += (artisan.cancellationRate / 100) * TRUST_WEIGHTS.cancellationRate;

  // Dispute rate penalty (0-100% -> 0 to -15 points)
  score += (artisan.disputeRate / 100) * TRUST_WEIGHTS.disputeRate;

  // On-time rate contribution (0-100% -> 0-20 points)
  score += (artisan.onTimeRate / 100) * TRUST_WEIGHTS.onTimeRate;

  // Response time contribution (faster is better, max 10 points)
  // Under 30 min = 10 points, 30-60 min = 7 points, 60-120 min = 4 points, >120 min = 0 points
  if (artisan.responseCount > 0) {
    if (artisan.responseTime <= 30) {
      score += 10;
    } else if (artisan.responseTime <= 60) {
      score += 7;
    } else if (artisan.responseTime <= 120) {
      score += 4;
    }
  }

  // Rating contribution (1-5 -> 0-15 points)
  if (artisan.totalReviews > 0) {
    score += ((artisan.averageRating - 1) / 4) * TRUST_WEIGHTS.averageRating;
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  artisan.trustScore = score;
  await artisan.save();

  // Update trust level
  await updateTrustLevel(artisanId);

  return score;
}

/**
 * Update trust level based on score
 */
export async function updateTrustLevel(artisanId: string): Promise<TrustLevel> {
  const artisan = await ArtisanProfile.findById(artisanId);
  if (!artisan) return 'bronze';

  const oldLevel = artisan.trustLevel;
  let newLevel: TrustLevel = 'bronze';

  if (artisan.trustScore >= TRUST_LEVEL_THRESHOLDS.platinum) {
    newLevel = 'platinum';
  } else if (artisan.trustScore >= TRUST_LEVEL_THRESHOLDS.gold) {
    newLevel = 'gold';
  } else if (artisan.trustScore >= TRUST_LEVEL_THRESHOLDS.silver) {
    newLevel = 'silver';
  }

  if (newLevel !== oldLevel) {
    artisan.trustLevel = newLevel;
    await artisan.save();

    // Notify artisan of level change
    if (TRUST_LEVEL_THRESHOLDS[newLevel] > TRUST_LEVEL_THRESHOLDS[oldLevel]) {
      await createNotification(artisan.user.toString(), {
        type: 'trust_level_changed' as any,
        title: 'Trust Level Upgraded!',
        message: `Congratulations! You've reached ${newLevel.charAt(0).toUpperCase() + newLevel.slice(1)} trust level.`,
        link: '/dashboard/artisan',
        data: { oldLevel, newLevel, trustScore: artisan.trustScore },
      });
    }

    log.info('Artisan trust level changed', {
      artisanId,
      oldLevel,
      newLevel,
      trustScore: artisan.trustScore,
    });
  }

  return newLevel;
}

/**
 * Check and award badges
 */
export async function checkAndAwardBadges(artisanId: string): Promise<BadgeType[]> {
  const artisan = await ArtisanProfile.findById(artisanId);
  if (!artisan) return [];

  const existingBadges = new Set(artisan.badges.map(b => b.type));
  const newBadges: BadgeType[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    // Skip if already earned
    if (existingBadges.has(badge.type)) continue;

    // Check condition
    const meetsCondition = checkBadgeCondition(artisan, badge);

    if (meetsCondition) {
      artisan.badges.push({
        type: badge.type,
        earnedAt: new Date(),
        details: badge.description,
      });
      newBadges.push(badge.type);

      // Notify artisan
      await createNotification(artisan.user.toString(), {
        type: 'badge_earned' as any,
        title: 'New Badge Earned!',
        message: `You've earned the "${badge.name}" badge: ${badge.description}`,
        link: '/dashboard/artisan',
        data: { badgeType: badge.type, badgeName: badge.name },
      });

      log.info('Badge awarded', {
        artisanId,
        badge: badge.type,
      });
    }
  }

  if (newBadges.length > 0) {
    await artisan.save();
  }

  return newBadges;
}

/**
 * Check if artisan meets badge condition
 */
function checkBadgeCondition(artisan: IArtisanProfile, badge: BadgeDefinition): boolean {
  const { metric, operator, value, secondaryMetric, secondaryValue } = badge.condition;

  const metricValue = (artisan as any)[metric];

  let primaryConditionMet = false;
  switch (operator) {
    case '>=':
      primaryConditionMet = metricValue >= value;
      break;
    case '>':
      primaryConditionMet = metricValue > value;
      break;
    case '==':
      primaryConditionMet = metricValue === value;
      break;
    case '<=':
      primaryConditionMet = metricValue <= value;
      break;
    case '<':
      primaryConditionMet = metricValue < value;
      break;
  }

  if (!primaryConditionMet) return false;

  // Check secondary condition if exists
  if (secondaryMetric && secondaryValue !== undefined) {
    const secondaryMetricValue = (artisan as any)[secondaryMetric];
    return secondaryMetricValue >= secondaryValue;
  }

  return true;
}

/**
 * Record response time when artisan accepts/rejects booking
 */
export async function recordResponseTime(
  artisanId: string,
  responseTimeMinutes: number
): Promise<void> {
  const artisan = await ArtisanProfile.findById(artisanId);
  if (!artisan) return;

  artisan.totalResponseTimeMinutes += responseTimeMinutes;
  artisan.responseCount += 1;
  artisan.responseTime = Math.round(artisan.totalResponseTimeMinutes / artisan.responseCount);

  await artisan.save();

  log.info('Response time recorded', {
    artisanId,
    responseTimeMinutes,
    averageResponseTime: artisan.responseTime,
  });
}

/**
 * Increment job completed and recalculate
 */
export async function onJobCompleted(artisanId: string, wasOnTime: boolean = true): Promise<void> {
  const artisan = await ArtisanProfile.findById(artisanId);
  if (!artisan) return;

  artisan.jobsCompleted += 1;
  if (wasOnTime) {
    artisan.totalJobsOnTime += 1;
  }

  await artisan.save();
  await recalculateStats(artisanId);
}

/**
 * Record cancellation by artisan
 */
export async function onJobCancelledByArtisan(artisanId: string): Promise<void> {
  const artisan = await ArtisanProfile.findById(artisanId);
  if (!artisan) return;

  artisan.totalJobsCancelled += 1;
  await artisan.save();
  await recalculateStats(artisanId);
}

/**
 * Record dispute on job
 */
export async function onDisputeOpened(artisanId: string): Promise<void> {
  const artisan = await ArtisanProfile.findById(artisanId);
  if (!artisan) return;

  artisan.totalJobsDisputed += 1;
  await artisan.save();
  await recalculateStats(artisanId);
}

export default {
  recalculateStats,
  calculateTrustScore,
  updateTrustLevel,
  checkAndAwardBadges,
  recordResponseTime,
  onJobCompleted,
  onJobCancelledByArtisan,
  onDisputeOpened,
};
