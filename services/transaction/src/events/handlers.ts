import { EventBus, EVENT_TYPES, Event } from '@korrect/event-bus';
import { Logger } from '@korrect/logger';
import { Dispute } from '../models';

export async function setupEventHandlers(eventBus: EventBus, logger: Logger): Promise<void> {
  // Handle user deletion - anonymize transaction data
  await eventBus.subscribe(EVENT_TYPES.USER_DELETED, async (event: Event<{ userId: string }>) => {
    const { userId } = event.payload;
    logger.info('Handling user.deleted event in transaction service', { userId, eventId: event.id });
    // In production, anonymize user data in bookings, contracts, etc.
  });

  logger.info('Transaction event handlers setup complete');
}

// Dispute escalation job (run periodically)
export async function checkDisputeEscalation(logger: Logger, eventBus: EventBus): Promise<void> {
  try {
    const now = new Date();

    // Find disputes past their artisan response deadline
    const overdueDisputes = await Dispute.find({
      status: 'artisan_response_pending',
      artisanResponseDeadline: { $lt: now },
      autoEscalatedAt: { $exists: false },
    });

    for (const dispute of overdueDisputes) {
      dispute.status = 'escalated';
      dispute.autoEscalatedAt = now;
      await dispute.save();

      await eventBus.publish(EVENT_TYPES.DISPUTE_ESCALATED, {
        disputeId: dispute._id.toString(),
        reason: 'Artisan failed to respond within deadline',
        daysOpen: Math.floor((now.getTime() - dispute.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      });

      logger.info('Dispute auto-escalated', { disputeId: dispute._id.toString() });
    }
  } catch (error) {
    logger.error('Dispute escalation check failed', { error: error instanceof Error ? error.message : error });
  }
}
