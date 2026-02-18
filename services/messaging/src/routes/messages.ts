import { Router, Request, Response } from 'express';
import { Conversation, Message } from '../models';
import { Logger } from '@korrect/logger';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';
import { Types } from 'mongoose';

const router = Router();

// GET /api/v1/messages/conversations - List user's conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
      participants: userId,
      [`isArchived.${userId}`]: { $ne: true },
    })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Conversation.countDocuments({
      participants: userId,
      [`isArchived.${userId}`]: { $ne: true },
    });

    res.json({
      success: true,
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('List conversations error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/messages/conversations/:id - Get conversation with messages
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      conversation: req.params.id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        conversation,
        messages: messages.reverse(), // Return in chronological order
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get conversation error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/messages/conversations - Create or get conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { participantId, participantRole, bookingId, contractId } = req.body;

    if (!participantId) {
      return res.status(400).json({ success: false, error: 'Participant ID required' });
    }

    // Check for existing conversation between these users (optionally for specific booking)
    const query: any = {
      participants: { $all: [userId, participantId] },
    };
    if (bookingId) {
      query.booking = bookingId;
    }

    let conversation = await Conversation.findOne(query);

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [userId, participantId],
        participantRoles: [
          { userId: new Types.ObjectId(userId), role: participantRole === 'artisan' ? 'customer' : 'artisan' },
          { userId: new Types.ObjectId(participantId), role: participantRole || 'artisan' },
        ],
        booking: bookingId,
        contract: contractId,
        unreadCount: new Map(),
        isArchived: new Map(),
      });
    }

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create conversation error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/messages/conversations/:id/messages - Send message
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { content, messageType, attachments, replyTo, metadata } = req.body;

    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ success: false, error: 'Message content or attachment required' });
    }

    // Determine sender role
    const participantRole = conversation.participantRoles.find((p) => p.userId.toString() === userId);
    const senderRole = participantRole?.role || 'customer';

    const message = await Message.create({
      conversation: req.params.id,
      sender: userId,
      senderRole,
      content: content || '',
      messageType: messageType || 'text',
      attachments: attachments || [],
      replyTo,
      metadata,
      readBy: [{ userId: new Types.ObjectId(userId), readAt: new Date() }],
    });

    // Update conversation
    conversation.lastMessage = {
      content: content?.substring(0, 100) || (attachments?.length ? '[Attachment]' : ''),
      sender: new Types.ObjectId(userId),
      sentAt: new Date(),
    };
    conversation.lastMessageAt = new Date();

    // Increment unread count for other participants
    for (const participant of conversation.participants) {
      if (participant.toString() !== userId) {
        const currentCount = conversation.unreadCount.get(participant.toString()) || 0;
        conversation.unreadCount.set(participant.toString(), currentCount + 1);
      }
    }

    await conversation.save();

    // Publish event for notifications
    try {
      const recipientId = conversation.participants.find((p) => p.toString() !== userId);
      await eventBus.publish(EVENT_TYPES.MESSAGE_SENT, {
        messageId: message._id.toString(),
        conversationId: conversation._id.toString(),
        senderId: userId,
        recipientId: recipientId?.toString(),
        content: content?.substring(0, 200),
        messageType: messageType || 'text',
      });
    } catch (eventError) {
      logger.error('Failed to publish message.sent event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Send message error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/messages/conversations/:id/read - Mark messages as read
router.post('/conversations/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Mark all unread messages as read
    await Message.updateMany(
      {
        conversation: req.params.id,
        'readBy.userId': { $ne: new Types.ObjectId(userId) },
      },
      {
        $push: {
          readBy: { userId: new Types.ObjectId(userId), readAt: new Date() },
        },
      }
    );

    // Reset unread count
    conversation.unreadCount.set(userId, 0);
    await conversation.save();

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Mark read error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/messages/conversations/:id/archive - Archive conversation
router.post('/conversations/:id/archive', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    conversation.isArchived.set(userId, true);
    await conversation.save();

    res.json({ success: true, message: 'Conversation archived' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Archive conversation error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/v1/messages/:id - Delete message (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Only sender can delete message' });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = new Types.ObjectId(userId);
    message.content = '[Message deleted]';
    message.attachments = [];
    await message.save();

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Delete message error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/messages/unread-count - Get total unread count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const conversations = await Conversation.find({
      participants: userId,
    }).lean();

    let totalUnread = 0;
    for (const conv of conversations) {
      const unreadMap = conv.unreadCount as unknown as Record<string, number>;
      totalUnread += unreadMap?.[userId] || 0;
    }

    res.json({ success: true, data: { unreadCount: totalUnread } });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get unread count error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
