import mongoose from 'mongoose';
import { MerchantProfile, IMerchantProfile, TrustLevel, MerchantBadgeType } from '../models/MerchantProfile';
import { MaterialOrder } from '../models/MaterialOrder';
import { createNotification } from './notifications';
import { log } from '../utils/logger';

// Trust score weights (must sum to ~100 when considering positive/negative)
const TRUST_WEIGHTS = {
  fulfillmentRate: 25,     // +25 for high fulfillment
  cancellationRate: -15,   // -15 for high cancellation
  defectRate: -15,         // -15 for high defects
  onTimeRate: 20,          // +20 for on-time delivery
  responseTime: 10,        // +10 for quick responses
  averageRating: 15,       // +15 for high ratings
};

// Trust level thresholds
const TRUST_LEVEL_THRESHOLDS: Record<TrustLevel, number> = {
  bronze: 0,
  silver: 50,
  gold: 75,
  platinum: 90,
};

// Badge definitions for merchants
interface MerchantBadgeDefinition {
  type: MerchantBadgeType;
  name: string;
  description: string;
  icon: string;
  condition: {
    metric: keyof IMerchantProfile;
    operator: '>=' | '>' | '==' | '<=' | '<';
    value: number;
    secondaryMetric?: keyof IMerchantProfile;
    secondaryValue?: number;
  };
}

const MERCHANT_BADGE_DEFINITIONS: MerchantBadgeDefinition[] = [
  {
    type: 'first_order',
    name: 'First Sale',
    description: 'Completed your first order',
    icon: '🎯',
    condition: { metric: 'ordersCompleted', operator: '>=', value: 1 },
  },
  {
    type: 'orders_10',
    name: 'Rising Seller',
    description: 'Completed 10 orders',
    icon: '📈',
    condition: { metric: 'ordersCompleted', operator: '>=', value: 10 },
  },
  {
    type: 'orders_50',
    name: 'Established Seller',
    description: 'Completed 50 orders',
    icon: '🏪',
    condition: { metric: 'ordersCompleted', operator: '>=', value: 50 },
  },
  {
    type: 'orders_100',
    name: 'Power Seller',
    description: 'Completed 100 orders',
    icon: '🏆',
    condition: { metric: 'ordersCompleted', operator: '>=', value: 100 },
  },
  {
    type: 'five_star_average',
    name: 'Top Rated',
    description: 'Maintain 5-star average rating with at least 10 reviews',
    icon: '⭐',
    condition: { metric: 'averageRating', operator: '==', value: 5, secondaryMetric: 'totalReviews', secondaryValue: 10 },
  },
  {
    type: 'quick_responder',
    name: 'Quick Responder',
    description: 'Average response time under 30 minutes',
    icon: '⚡',
    condition: { metric: 'responseTime', operator: '<=', value: 30, secondaryMetric: 'responseCount', secondaryValue: 10 },
  },
  {
    type: 'defect_free',
    name: 'Quality Champion',
    description: 'Zero defect rate with at least 20 completed orders',
    icon: '✅',
    condition: { metric: 'defectRate', operator: '==', value: 0, secondaryMetric: 'ordersCompleted', secondaryValue: 20 },
  },
  {
    type: 'always_on_time',
    name: 'Punctual Delivery',
    description: '100% on-time delivery rate with at least 20 completed orders',
    icon: '🚀',
    condition: { metric: 'onTimeDeliveryRate', operator: '==', value: 100, secondaryMetric: 'ordersCompleted', secondaryValue: 20 },
  },
];

/**
 * Recalculate all stats for a merchant
 */
export async function recalculateStats(merchantProfileId: string): Promise<IMerchantProfile | null> {
  const merchant = await MerchantProfile.findById(merchantProfileId);
  if (!merchant) return null;

  // Get all orders for this merchant
  const orders = await MaterialOrder.find({ merchantProfile: merchantProfileId });

  // Calculate stats
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const defectOrders = orders.filter(o => o.hasDefect);

  // On-time calculation
  const onTimeOrders = completedOrders.filter(o => {
    if (!o.scheduledDeliveryDate || !o.deliveredAt) return true;
    return o.deliveredAt <= o.scheduledDeliveryDate;
  });

  // Update raw counts
  merchant.totalOrdersReceived = orders.length;
  merchant.ordersCompleted = completedOrders.length;
  merchant.totalOrdersCancelled = cancelledOrders.length;
  merchant.totalDefectsReported = defectOrders.length;
  merchant.totalOnTimeDeliveries = onTimeOrders.length;

  // Calculate rates (avoid division by zero)
  if (merchant.totalOrdersReceived > 0) {
    merchant.fulfillmentRate = Math.round((merchant.ordersCompleted / merchant.totalOrdersReceived) * 100);
  }

  if (merchant.ordersCompleted > 0) {
    merchant.defectRate = Math.round((merchant.totalDefectsReported / merchant.ordersCompleted) * 100);
    merchant.onTimeDeliveryRate = Math.round((merchant.totalOnTimeDeliveries / merchant.ordersCompleted) * 100);
  }

  // Calculate average response time
  if (merchant.responseCount > 0) {
    merchant.responseTime = Math.round(merchant.totalResponseTimeMinutes / merchant.responseCount);
  }

  await merchant.save();

  // Recalculate trust score and level
  await calculateTrustScore(merchantProfileId);

  // Check for badges
  await checkAndAwardBadges(merchantProfileId);

  log.info('Merchant stats recalculated', {
    merchantProfileId,
    ordersCompleted: merchant.ordersCompleted,
    trustScore: merchant.trustScore,
  });

  return merchant;
}

/**
 * Calculate trust score based on weighted metrics
 */
export async function calculateTrustScore(merchantProfileId: string): Promise<number> {
  const merchant = await MerchantProfile.findById(merchantProfileId);
  if (!merchant) return 0;

  let score = 50; // Start at neutral

  // Fulfillment rate contribution (0-100% -> 0-25 points)
  score += (merchant.fulfillmentRate / 100) * TRUST_WEIGHTS.fulfillmentRate;

  // Cancellation penalty (calculate cancellation rate)
  const cancellationRate = merchant.totalOrdersReceived > 0
    ? (merchant.totalOrdersCancelled / merchant.totalOrdersReceived) * 100
    : 0;
  score += (cancellationRate / 100) * TRUST_WEIGHTS.cancellationRate;

  // Defect rate penalty (0-100% -> 0 to -15 points)
  score += (merchant.defectRate / 100) * TRUST_WEIGHTS.defectRate;

  // On-time rate contribution (0-100% -> 0-20 points)
  score += (merchant.onTimeDeliveryRate / 100) * TRUST_WEIGHTS.onTimeRate;

  // Response time contribution (faster is better, max 10 points)
  if (merchant.responseCount > 0) {
    if (merchant.responseTime <= 30) {
      score += 10;
    } else if (merchant.responseTime <= 60) {
      score += 7;
    } else if (merchant.responseTime <= 120) {
      score += 4;
    }
  }

  // Rating contribution (1-5 -> 0-15 points)
  if (merchant.totalReviews > 0) {
    score += ((merchant.averageRating - 1) / 4) * TRUST_WEIGHTS.averageRating;
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  merchant.trustScore = score;
  await merchant.save();

  // Update trust level
  await updateTrustLevel(merchantProfileId);

  return score;
}

/**
 * Update trust level based on score
 */
export async function updateTrustLevel(merchantProfileId: string): Promise<TrustLevel> {
  const merchant = await MerchantProfile.findById(merchantProfileId);
  if (!merchant) return 'bronze';

  const oldLevel = merchant.trustLevel;
  let newLevel: TrustLevel = 'bronze';

  if (merchant.trustScore >= TRUST_LEVEL_THRESHOLDS.platinum) {
    newLevel = 'platinum';
  } else if (merchant.trustScore >= TRUST_LEVEL_THRESHOLDS.gold) {
    newLevel = 'gold';
  } else if (merchant.trustScore >= TRUST_LEVEL_THRESHOLDS.silver) {
    newLevel = 'silver';
  }

  if (newLevel !== oldLevel) {
    merchant.trustLevel = newLevel;
    await merchant.save();

    // Notify merchant of level change
    if (TRUST_LEVEL_THRESHOLDS[newLevel] > TRUST_LEVEL_THRESHOLDS[oldLevel]) {
      await createNotification(merchant.user.toString(), {
        type: 'trust_level_changed' as any,
        title: 'Trust Level Upgraded!',
        message: `Congratulations! You've reached ${newLevel.charAt(0).toUpperCase() + newLevel.slice(1)} trust level.`,
        link: '/dashboard/merchant',
        data: { oldLevel, newLevel, trustScore: merchant.trustScore },
      });
    }

    log.info('Merchant trust level changed', {
      merchantProfileId,
      oldLevel,
      newLevel,
      trustScore: merchant.trustScore,
    });
  }

  return newLevel;
}

/**
 * Check and award badges
 */
export async function checkAndAwardBadges(merchantProfileId: string): Promise<MerchantBadgeType[]> {
  const merchant = await MerchantProfile.findById(merchantProfileId);
  if (!merchant) return [];

  const existingBadges = new Set(merchant.badges.map(b => b.type));
  const newBadges: MerchantBadgeType[] = [];

  for (const badge of MERCHANT_BADGE_DEFINITIONS) {
    // Skip if already earned
    if (existingBadges.has(badge.type)) continue;

    // Check condition
    const meetsCondition = checkBadgeCondition(merchant, badge);

    if (meetsCondition) {
      merchant.badges.push({
        type: badge.type,
        earnedAt: new Date(),
        details: badge.description,
      });
      newBadges.push(badge.type);

      // Notify merchant
      await createNotification(merchant.user.toString(), {
        type: 'badge_earned' as any,
        title: 'New Badge Earned!',
        message: `You've earned the "${badge.name}" badge: ${badge.description}`,
        link: '/dashboard/merchant',
        data: { badgeType: badge.type, badgeName: badge.name },
      });

      log.info('Merchant badge awarded', {
        merchantProfileId,
        badge: badge.type,
      });
    }
  }

  if (newBadges.length > 0) {
    await merchant.save();
  }

  return newBadges;
}

/**
 * Check if merchant meets badge condition
 */
function checkBadgeCondition(merchant: IMerchantProfile, badge: MerchantBadgeDefinition): boolean {
  const { metric, operator, value, secondaryMetric, secondaryValue } = badge.condition;

  const metricValue = (merchant as any)[metric];

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
    const secondaryMetricValue = (merchant as any)[secondaryMetric];
    return secondaryMetricValue >= secondaryValue;
  }

  return true;
}

/**
 * Record response time when merchant confirms order
 */
export async function recordResponseTime(
  merchantProfileId: string,
  responseTimeMinutes: number
): Promise<void> {
  const merchant = await MerchantProfile.findById(merchantProfileId);
  if (!merchant) return;

  merchant.totalResponseTimeMinutes += responseTimeMinutes;
  merchant.responseCount += 1;
  merchant.responseTime = Math.round(merchant.totalResponseTimeMinutes / merchant.responseCount);

  await merchant.save();

  log.info('Merchant response time recorded', {
    merchantProfileId,
    responseTimeMinutes,
    averageResponseTime: merchant.responseTime,
  });
}

/**
 * Called when an order is completed
 */
export async function onOrderCompleted(merchantProfileId: string, wasOnTime: boolean = true): Promise<void> {
  const merchant = await MerchantProfile.findById(merchantProfileId);
  if (!merchant) return;

  merchant.ordersCompleted += 1;
  if (wasOnTime) {
    merchant.totalOnTimeDeliveries += 1;
  }

  await merchant.save();
  await recalculateStats(merchantProfileId);
}

/**
 * Called when an order is cancelled
 */
export async function onOrderCancelled(merchantProfileId: string): Promise<void> {
  const merchant = await MerchantProfile.findById(merchantProfileId);
  if (!merchant) return;

  merchant.totalOrdersCancelled += 1;
  await merchant.save();
  await recalculateStats(merchantProfileId);
}

/**
 * Called when a defect is reported
 */
export async function onDefectReported(merchantProfileId: string): Promise<void> {
  const merchant = await MerchantProfile.findById(merchantProfileId);
  if (!merchant) return;

  merchant.totalDefectsReported += 1;
  await merchant.save();
  await recalculateStats(merchantProfileId);
}

export default {
  recalculateStats,
  calculateTrustScore,
  updateTrustLevel,
  checkAndAwardBadges,
  recordResponseTime,
  onOrderCompleted,
  onOrderCancelled,
  onDefectReported,
};
