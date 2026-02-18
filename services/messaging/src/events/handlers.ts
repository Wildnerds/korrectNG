import { EventBus, EVENT_TYPES, Event } from '@korrect/event-bus';
import { Logger } from '@korrect/logger';
import { Conversation, Message } from '../models';
import { Types } from 'mongoose';

export async function setupEventHandlers(eventBus: EventBus, logger: Logger): Promise<void> {
  // Handle user deletion - anonymize message data
  await eventBus.subscribe(EVENT_TYPES.USER_DELETED, async (event: Event<{ userId: string }>) => {
    const { userId } = event.payload;
    logger.info('Handling user.deleted event in messaging service', { userId, eventId: event.id });

    try {
      // Anonymize messages from deleted user
      await Message.updateMany(
        { sender: userId },
        {
          $set: {
            content: '[Account deleted]',
            attachments: [],
          },
        }
      );

      // Update conversations - remove user from participant details but keep structure
      // This preserves conversation history for other participants
      await Conversation.updateMany(
        { participants: userId },
        {
          $pull: {
            participantRoles: { userId: new Types.ObjectId(userId) },
          },
        }
      );

      logger.info('User data anonymized in messaging service', { userId });
    } catch (error) {
      logger.error('Failed to anonymize user data in messaging', {
        userId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle booking created - create conversation if needed
  await eventBus.subscribe(EVENT_TYPES.BOOKING_CREATED, async (event: Event<{
    bookingId: string;
    customerId: string;
    artisanId: string;
  }>) => {
    const { bookingId, customerId, artisanId } = event.payload;
    logger.info('Handling booking.created event in messaging service', { bookingId, eventId: event.id });

    try {
      // Check if conversation already exists for these users
      let conversation = await Conversation.findOne({
        participants: { $all: [customerId, artisanId] },
        booking: bookingId,
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [customerId, artisanId],
          participantRoles: [
            { userId: new Types.ObjectId(customerId), role: 'customer' },
            { userId: new Types.ObjectId(artisanId), role: 'artisan' },
          ],
          booking: bookingId,
          unreadCount: new Map(),
          isArchived: new Map(),
        });

        // Create system message about booking
        await Message.create({
          conversation: conversation._id,
          sender: new Types.ObjectId(customerId),
          senderRole: 'system',
          content: 'Booking request created. You can now message each other about the job details.',
          messageType: 'system',
          metadata: {
            bookingId,
            actionType: 'booking_created',
          },
        });

        logger.info('Created conversation for new booking', { conversationId: conversation._id.toString(), bookingId });
      }
    } catch (error) {
      logger.error('Failed to create conversation for booking', {
        bookingId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle booking confirmed - add system message
  await eventBus.subscribe(EVENT_TYPES.BOOKING_CONFIRMED, async (event: Event<{
    bookingId: string;
    customerId: string;
    artisanId: string;
  }>) => {
    const { bookingId } = event.payload;
    logger.info('Handling booking.confirmed event in messaging service', { bookingId, eventId: event.id });

    try {
      const conversation = await Conversation.findOne({ booking: bookingId });
      if (conversation) {
        await Message.create({
          conversation: conversation._id,
          sender: conversation.participants[0], // System uses first participant
          senderRole: 'system',
          content: 'Booking has been confirmed! The artisan will arrive at the scheduled time.',
          messageType: 'system',
          metadata: {
            bookingId,
            actionType: 'booking_confirmed',
          },
        });

        conversation.lastMessage = {
          content: 'Booking has been confirmed!',
          sender: conversation.participants[0],
          sentAt: new Date(),
        };
        conversation.lastMessageAt = new Date();
        await conversation.save();
      }
    } catch (error) {
      logger.error('Failed to add booking confirmed message', {
        bookingId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle contract signed - add system message and link contract
  await eventBus.subscribe(EVENT_TYPES.CONTRACT_SIGNED, async (event: Event<{
    contractId: string;
    bookingId: string;
    customerId: string;
    artisanId: string;
  }>) => {
    const { contractId, bookingId } = event.payload;
    logger.info('Handling contract.signed event in messaging service', { contractId, eventId: event.id });

    try {
      const conversation = await Conversation.findOne({ booking: bookingId });
      if (conversation) {
        conversation.contract = new Types.ObjectId(contractId);

        await Message.create({
          conversation: conversation._id,
          sender: conversation.participants[0],
          senderRole: 'system',
          content: 'Contract has been signed by both parties. The job can now begin.',
          messageType: 'system',
          metadata: {
            bookingId,
            contractId,
            actionType: 'contract_signed',
          },
        });

        conversation.lastMessage = {
          content: 'Contract has been signed by both parties.',
          sender: conversation.participants[0],
          sentAt: new Date(),
        };
        conversation.lastMessageAt = new Date();
        await conversation.save();
      }
    } catch (error) {
      logger.error('Failed to add contract signed message', {
        contractId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle dispute opened - add system message
  await eventBus.subscribe(EVENT_TYPES.DISPUTE_OPENED, async (event: Event<{
    disputeId: string;
    contractId: string;
    escrowId: string;
    customerId: string;
    artisanId: string;
    reason: string;
  }>) => {
    const { disputeId, reason, escrowId } = event.payload;
    logger.info('Handling dispute.opened event in messaging service', { disputeId, eventId: event.id });

    try {
      // Find conversation by escrow's booking
      const conversation = await Conversation.findOne({
        $or: [
          { contract: event.payload.contractId },
        ],
      });

      if (conversation) {
        await Message.create({
          conversation: conversation._id,
          sender: conversation.participants[0],
          senderRole: 'system',
          content: `A dispute has been opened: "${reason}". An admin will review and mediate.`,
          messageType: 'system',
          metadata: {
            disputeId,
            actionType: 'dispute_opened',
          },
        });

        conversation.lastMessage = {
          content: 'A dispute has been opened.',
          sender: conversation.participants[0],
          sentAt: new Date(),
        };
        conversation.lastMessageAt = new Date();
        await conversation.save();
      }
    } catch (error) {
      logger.error('Failed to add dispute opened message', {
        disputeId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  // Handle dispute resolved - add system message
  await eventBus.subscribe(EVENT_TYPES.DISPUTE_RESOLVED, async (event: Event<{
    disputeId: string;
    contractId: string;
    decision: string;
  }>) => {
    const { disputeId, contractId, decision } = event.payload;
    logger.info('Handling dispute.resolved event in messaging service', { disputeId, eventId: event.id });

    try {
      const conversation = await Conversation.findOne({ contract: contractId });
      if (conversation) {
        await Message.create({
          conversation: conversation._id,
          sender: conversation.participants[0],
          senderRole: 'system',
          content: `The dispute has been resolved. Decision: ${decision}`,
          messageType: 'system',
          metadata: {
            disputeId,
            actionType: 'dispute_resolved',
            actionData: { decision },
          },
        });

        conversation.lastMessage = {
          content: 'The dispute has been resolved.',
          sender: conversation.participants[0],
          sentAt: new Date(),
        };
        conversation.lastMessageAt = new Date();
        await conversation.save();
      }
    } catch (error) {
      logger.error('Failed to add dispute resolved message', {
        disputeId,
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  logger.info('Messaging event handlers setup complete');
}
