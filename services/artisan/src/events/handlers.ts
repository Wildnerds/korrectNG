import { EventBus, EVENT_TYPES, Event } from '@korrect/event-bus';
import { Logger } from '@korrect/logger';
import { ArtisanProfile } from '../models';

/**
 * Setup event subscriptions for the Artisan service
 */
export async function setupEventHandlers(eventBus: EventBus, logger: Logger): Promise<void> {
  // Handle user deletion - clean up artisan profile
  await eventBus.subscribe(EVENT_TYPES.USER_DELETED, async (event: Event<{ userId: string; email: string }>) => {
    const { userId } = event.payload;
    logger.info('Handling user.deleted event', { userId, eventId: event.id });

    try {
      // Delete artisan profile if exists
      const deleted = await ArtisanProfile.findOneAndDelete({ user: userId });
      if (deleted) {
        logger.info('Deleted artisan profile for deleted user', { userId, profileId: deleted._id.toString() });
      }
    } catch (error) {
      logger.error('Error handling user.deleted event', {
        error: error instanceof Error ? error.message : error,
        userId,
      });
    }
  });

  // Handle booking confirmed - update artisan stats
  await eventBus.subscribe(EVENT_TYPES.BOOKING_CONFIRMED, async (event: Event<{
    bookingId: string;
    artisanId: string;
    onTime?: boolean;
  }>) => {
    const { artisanId, onTime } = event.payload;
    logger.info('Handling booking.confirmed event', { artisanId, eventId: event.id });

    try {
      const profile = await ArtisanProfile.findOne({ user: artisanId });
      if (profile) {
        profile.jobsCompleted += 1;
        profile.totalJobsAccepted += 1;
        if (onTime) profile.totalJobsOnTime += 1;

        // Recalculate rates
        if (profile.totalJobsAccepted > 0) {
          profile.completionRate = Math.round((profile.jobsCompleted / profile.totalJobsAccepted) * 100);
          profile.onTimeRate = Math.round((profile.totalJobsOnTime / profile.jobsCompleted) * 100) || 0;
        }

        // Check for badges
        await checkAndAwardBadges(profile, logger);

        await profile.save();
        logger.debug('Updated artisan stats for booking confirmation', { profileId: profile._id.toString() });
      }
    } catch (error) {
      logger.error('Error handling booking.confirmed event', {
        error: error instanceof Error ? error.message : error,
        artisanId,
      });
    }
  });

  // Handle booking cancelled
  await eventBus.subscribe(EVENT_TYPES.BOOKING_CANCELLED, async (event: Event<{
    bookingId: string;
    artisanId: string;
    cancelledBy: 'customer' | 'artisan';
  }>) => {
    const { artisanId, cancelledBy } = event.payload;
    logger.info('Handling booking.cancelled event', { artisanId, cancelledBy, eventId: event.id });

    try {
      if (cancelledBy === 'artisan') {
        const profile = await ArtisanProfile.findOne({ user: artisanId });
        if (profile) {
          profile.totalJobsCancelled += 1;

          // Recalculate cancellation rate
          if (profile.totalJobsAccepted > 0) {
            profile.cancellationRate = Math.round((profile.totalJobsCancelled / profile.totalJobsAccepted) * 100);
          }

          await profile.save();
          logger.debug('Updated artisan cancellation stats', { profileId: profile._id.toString() });
        }
      }
    } catch (error) {
      logger.error('Error handling booking.cancelled event', {
        error: error instanceof Error ? error.message : error,
        artisanId,
      });
    }
  });

  // Handle dispute opened
  await eventBus.subscribe(EVENT_TYPES.DISPUTE_OPENED, async (event: Event<{
    disputeId: string;
    artisanId: string;
  }>) => {
    const { artisanId } = event.payload;
    logger.info('Handling dispute.opened event', { artisanId, eventId: event.id });

    try {
      const profile = await ArtisanProfile.findOne({ user: artisanId });
      if (profile) {
        profile.totalJobsDisputed += 1;

        // Recalculate dispute rate
        if (profile.totalJobsAccepted > 0) {
          profile.disputeRate = Math.round((profile.totalJobsDisputed / profile.totalJobsAccepted) * 100);
        }

        await profile.save();
        logger.debug('Updated artisan dispute stats', { profileId: profile._id.toString() });
      }
    } catch (error) {
      logger.error('Error handling dispute.opened event', {
        error: error instanceof Error ? error.message : error,
        artisanId,
      });
    }
  });

  logger.info('Artisan event handlers setup complete');
}

/**
 * Check and award badges based on profile stats
 */
async function checkAndAwardBadges(profile: any, logger: Logger): Promise<void> {
  const existingBadges = new Set(profile.badges.map((b: any) => b.type));

  // First job badge
  if (profile.jobsCompleted === 1 && !existingBadges.has('first_job')) {
    profile.badges.push({ type: 'first_job', earnedAt: new Date() });
    logger.info('Awarded first_job badge', { profileId: profile._id.toString() });
  }

  // Job milestone badges
  if (profile.jobsCompleted >= 10 && !existingBadges.has('jobs_10')) {
    profile.badges.push({ type: 'jobs_10', earnedAt: new Date() });
    logger.info('Awarded jobs_10 badge', { profileId: profile._id.toString() });
  }

  if (profile.jobsCompleted >= 50 && !existingBadges.has('jobs_50')) {
    profile.badges.push({ type: 'jobs_50', earnedAt: new Date() });
    logger.info('Awarded jobs_50 badge', { profileId: profile._id.toString() });
  }

  if (profile.jobsCompleted >= 100 && !existingBadges.has('jobs_100')) {
    profile.badges.push({ type: 'jobs_100', earnedAt: new Date() });
    logger.info('Awarded jobs_100 badge', { profileId: profile._id.toString() });
  }

  // Five star average badge (need at least 10 reviews)
  if (profile.totalReviews >= 10 && profile.averageRating >= 4.9 && !existingBadges.has('five_star_average')) {
    profile.badges.push({ type: 'five_star_average', earnedAt: new Date() });
    logger.info('Awarded five_star_average badge', { profileId: profile._id.toString() });
  }

  // Quick responder badge (avg response time < 30 mins, at least 10 responses)
  if (profile.responseCount >= 10 && profile.responseTime <= 30 && !existingBadges.has('quick_responder')) {
    profile.badges.push({ type: 'quick_responder', earnedAt: new Date() });
    logger.info('Awarded quick_responder badge', { profileId: profile._id.toString() });
  }

  // Dispute free badge (at least 20 jobs, 0% dispute rate)
  if (profile.jobsCompleted >= 20 && profile.disputeRate === 0 && !existingBadges.has('dispute_free')) {
    profile.badges.push({ type: 'dispute_free', earnedAt: new Date() });
    logger.info('Awarded dispute_free badge', { profileId: profile._id.toString() });
  }

  // Always on time badge (at least 20 jobs, 100% on time)
  if (profile.jobsCompleted >= 20 && profile.onTimeRate === 100 && !existingBadges.has('always_on_time')) {
    profile.badges.push({ type: 'always_on_time', earnedAt: new Date() });
    logger.info('Awarded always_on_time badge', { profileId: profile._id.toString() });
  }
}
