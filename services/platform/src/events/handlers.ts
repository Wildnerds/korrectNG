import { EventBus, EVENT_TYPES, Event } from '@korrect/event-bus';
import { Logger } from '@korrect/logger';
import { Notification } from '../models';
import { SmsService } from '../services/sms';
import { PushService } from '../services/push';

export async function setupEventHandlers(
  eventBus: EventBus,
  logger: Logger,
  smsService: SmsService,
  pushService: PushService
): Promise<void> {
  // Handle user creation - send welcome notification
  await eventBus.subscribe(EVENT_TYPES.USER_CREATED, async (event: Event<{
    userId: string;
    email: string;
    firstName: string;
  }>) => {
    const { userId, firstName } = event.payload;
    logger.info('Handling user.created event in platform service', { userId, eventId: event.id });

    try {
      await Notification.create({
        user: userId,
        type: 'welcome',
        title: 'Welcome to Korrect!',
        message: `Hi ${firstName}, welcome to Korrect! Find skilled artisans or offer your services.`,
        channels: ['in_app', 'push'],
        status: 'pending',
      });
    } catch (error) {
      logger.error('Failed to create welcome notification', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle booking created - notify artisan
  await eventBus.subscribe(EVENT_TYPES.BOOKING_CREATED, async (event: Event<{
    bookingId: string;
    customerId: string;
    artisanId: string;
    serviceType: string;
  }>) => {
    const { bookingId, artisanId, serviceType } = event.payload;
    logger.info('Handling booking.created event in platform service', { bookingId, eventId: event.id });

    try {
      await Notification.create({
        user: artisanId,
        type: 'new_booking',
        title: 'New Booking Request',
        message: `You have a new booking request for ${serviceType}. Respond within 24 hours.`,
        channels: ['in_app', 'push', 'sms'],
        status: 'pending',
        metadata: { bookingId },
      });
    } catch (error) {
      logger.error('Failed to create booking notification', {
        bookingId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle booking confirmed - notify customer
  await eventBus.subscribe(EVENT_TYPES.BOOKING_CONFIRMED, async (event: Event<{
    bookingId: string;
    customerId: string;
    artisanId: string;
    scheduledDate: string;
  }>) => {
    const { bookingId, customerId, scheduledDate } = event.payload;
    logger.info('Handling booking.confirmed event in platform service', { bookingId, eventId: event.id });

    try {
      const date = new Date(scheduledDate).toLocaleDateString('en-NG', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      await Notification.create({
        user: customerId,
        type: 'booking_confirmed',
        title: 'Booking Confirmed!',
        message: `Your booking has been confirmed for ${date}. The artisan will arrive as scheduled.`,
        channels: ['in_app', 'push'],
        status: 'pending',
        metadata: { bookingId },
      });
    } catch (error) {
      logger.error('Failed to create booking confirmed notification', {
        bookingId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle escrow funded - notify artisan
  await eventBus.subscribe(EVENT_TYPES.ESCROW_FUNDED, async (event: Event<{
    escrowId: string;
    contractId: string;
    artisanId: string;
    customerId: string;
    amount: number;
  }>) => {
    const { contractId, artisanId, amount } = event.payload;
    logger.info('Handling escrow.funded event in platform service', { contractId, eventId: event.id });

    try {
      await Notification.create({
        user: artisanId,
        type: 'escrow_funded',
        title: 'Payment Secured',
        message: `Customer has funded ₦${amount.toLocaleString()} to escrow. You can begin work.`,
        channels: ['in_app', 'push', 'sms'],
        status: 'pending',
        metadata: { contractId },
      });
    } catch (error) {
      logger.error('Failed to create escrow funded notification', {
        contractId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle escrow released - notify artisan
  await eventBus.subscribe(EVENT_TYPES.ESCROW_RELEASED, async (event: Event<{
    escrowId: string;
    contractId: string;
    artisanId: string;
    milestone: string;
    amount: number;
  }>) => {
    const { contractId, artisanId, amount, milestone } = event.payload;
    logger.info('Handling escrow.released event in platform service', { contractId, eventId: event.id });

    try {
      await Notification.create({
        user: artisanId,
        type: 'payment_released',
        title: 'Payment Released!',
        message: `₦${amount.toLocaleString()} has been released for ${milestone}. Check your wallet.`,
        channels: ['in_app', 'push'],
        status: 'pending',
        metadata: { contractId },
      });
    } catch (error) {
      logger.error('Failed to create payment released notification', {
        contractId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle dispute opened - notify both parties and admin
  await eventBus.subscribe(EVENT_TYPES.DISPUTE_OPENED, async (event: Event<{
    disputeId: string;
    contractId: string;
    customerId: string;
    artisanId: string;
    reason: string;
  }>) => {
    const { disputeId, artisanId, reason } = event.payload;
    logger.info('Handling dispute.opened event in platform service', { disputeId, eventId: event.id });

    try {
      // Notify artisan
      await Notification.create({
        user: artisanId,
        type: 'dispute_opened',
        title: 'Dispute Opened',
        message: `A dispute has been opened: "${reason}". Please respond within 48 hours.`,
        channels: ['in_app', 'push', 'sms'],
        status: 'pending',
        metadata: { disputeId },
      });

      // TODO: Notify admin users
    } catch (error) {
      logger.error('Failed to create dispute notification', {
        disputeId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle dispute escalated - notify admin
  await eventBus.subscribe(EVENT_TYPES.DISPUTE_ESCALATED, async (event: Event<{
    disputeId: string;
    reason: string;
    daysOpen: number;
  }>) => {
    const { disputeId, reason, daysOpen } = event.payload;
    logger.info('Handling dispute.escalated event in platform service', { disputeId, eventId: event.id });

    // TODO: Create admin notification for escalated dispute
    logger.warn('Dispute escalated - admin notification needed', { disputeId, reason, daysOpen });
  });

  // Handle dispute resolved - notify both parties
  await eventBus.subscribe(EVENT_TYPES.DISPUTE_RESOLVED, async (event: Event<{
    disputeId: string;
    contractId: string;
    decision: string;
    customerRefund: number;
    artisanPayment: number;
  }>) => {
    const { disputeId, decision } = event.payload;
    logger.info('Handling dispute.resolved event in platform service', { disputeId, eventId: event.id });

    // Notifications would be sent to both parties
    // Need to fetch dispute details to get user IDs
    logger.info('Dispute resolved notification pending', { disputeId, decision });
  });

  // Handle review created - notify artisan
  await eventBus.subscribe(EVENT_TYPES.REVIEW_CREATED, async (event: Event<{
    reviewId: string;
    artisanId: string;
    customerId: string;
    rating: number;
    comment?: string;
  }>) => {
    const { reviewId, artisanId, rating } = event.payload;
    logger.info('Handling review.created event in platform service', { reviewId, eventId: event.id });

    try {
      await Notification.create({
        user: artisanId,
        type: 'new_review',
        title: 'New Review',
        message: `You received a ${rating}-star review. Keep up the great work!`,
        channels: ['in_app', 'push'],
        status: 'pending',
        metadata: { artisanId },
      });
    } catch (error) {
      logger.error('Failed to create review notification', {
        reviewId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle verification approved - notify artisan
  await eventBus.subscribe(EVENT_TYPES.VERIFICATION_APPROVED, async (event: Event<{
    applicationId: string;
    artisanId: string;
    verificationLevel: string;
  }>) => {
    const { artisanId, verificationLevel } = event.payload;
    logger.info('Handling verification.approved event in platform service', { artisanId, eventId: event.id });

    try {
      await Notification.create({
        user: artisanId,
        type: 'verification_approved',
        title: 'Verification Approved!',
        message: `Congratulations! You are now ${verificationLevel} verified. Your profile visibility has increased.`,
        channels: ['in_app', 'push', 'sms'],
        status: 'pending',
        metadata: { artisanId },
      });
    } catch (error) {
      logger.error('Failed to create verification notification', {
        artisanId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle message sent - notify recipient
  await eventBus.subscribe(EVENT_TYPES.MESSAGE_SENT, async (event: Event<{
    messageId: string;
    conversationId: string;
    senderId: string;
    recipientId: string;
    content: string;
    messageType: string;
  }>) => {
    const { recipientId, content, messageType } = event.payload;
    logger.info('Handling message.sent event in platform service', { eventId: event.id });

    try {
      const preview = messageType === 'text' ? content?.substring(0, 50) : `[${messageType}]`;

      await Notification.create({
        user: recipientId,
        type: 'new_message',
        title: 'New Message',
        message: preview + (content?.length > 50 ? '...' : ''),
        channels: ['push'],
        status: 'pending',
      });
    } catch (error) {
      logger.error('Failed to create message notification', {
        recipientId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle user deleted - clean up platform data
  await eventBus.subscribe(EVENT_TYPES.USER_DELETED, async (event: Event<{ userId: string }>) => {
    const { userId } = event.payload;
    logger.info('Handling user.deleted event in platform service', { userId, eventId: event.id });

    try {
      // Delete user's notifications
      await Notification.deleteMany({ user: userId });

      // Anonymize search logs
      const { SearchLog } = await import('../models');
      await SearchLog.updateMany(
        { user: userId },
        { $unset: { user: 1 } }
      );

      logger.info('User data cleaned up in platform service', { userId });
    } catch (error) {
      logger.error('Failed to clean up user data in platform', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  logger.info('Platform event handlers setup complete');
}
