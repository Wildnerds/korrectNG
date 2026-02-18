import { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middleware/auth';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import ArtisanProfile from '../models/ArtisanProfile';
import User from '../models/User';
import { z } from 'zod';
import { createNotification, notificationTemplates } from '../services/notifications';
import { messageLimiter } from '../middleware/rateLimiter';

const router = Router();

// Validation schemas
const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'image', 'booking_request', 'booking_update']).optional(),
  metadata: z.record(z.any()).optional(),
});

const startConversationSchema = z.object({
  artisanProfileId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get all conversations for current user
 * @access  Private
 */
router.get('/conversations', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id.toString();
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;

    const conversations = await (Conversation as any).getConversationsForUser(userId, limit, skip);

    // Add unread count based on user role
    const conversationsWithUnread = conversations.map((conv: any) => ({
      ...conv,
      unreadCount: conv.customer._id.toString() === userId
        ? conv.customerUnreadCount
        : conv.artisanUnreadCount,
    }));

    res.status(200).json({
      success: true,
      data: {
        conversations: conversationsWithUnread,
        hasMore: conversations.length === limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/messages/conversations
 * @desc    Start a new conversation with an artisan
 * @access  Private
 */
router.post('/conversations', messageLimiter, protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = startConversationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const { artisanProfileId, message } = validation.data;
    const customerId = (req as any).user._id.toString();

    // Get artisan profile
    const artisanProfile = await ArtisanProfile.findById(artisanProfileId).populate('user');
    if (!artisanProfile) {
      return res.status(404).json({
        success: false,
        error: 'Artisan not found',
      });
    }

    const artisanId = (artisanProfile.user as any)._id.toString();

    // Check if customer is trying to message themselves
    if (customerId === artisanId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot start conversation with yourself',
      });
    }

    // Find or create conversation
    const conversation = await (Conversation as any).findOrCreate(
      customerId,
      artisanId,
      artisanProfileId
    );

    // Create the first message
    const newMessage = await Message.create({
      conversation: conversation._id,
      sender: customerId,
      content: message,
      type: 'text',
    });

    // Send notification to artisan
    const customer = await User.findById(customerId);
    await createNotification(
      artisanId,
      notificationTemplates.newMessage(
        `${customer?.firstName} ${customer?.lastName}`,
        conversation._id.toString()
      )
    );

    // Populate and return
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('customer', 'firstName lastName avatar')
      .populate('artisan', 'firstName lastName avatar')
      .populate('artisanProfile', 'businessName slug trade');

    res.status(201).json({
      success: true,
      data: {
        conversation: populatedConversation,
        message: newMessage,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/messages/conversations/:id
 * @desc    Get a single conversation with messages
 * @access  Private
 */
router.get('/conversations/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id.toString();
    const conversationId = req.params.id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    })
      .populate('customer', 'firstName lastName avatar')
      .populate('artisan', 'firstName lastName avatar')
      .populate('artisanProfile', 'businessName slug trade');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    // Get messages
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before ? new Date(req.query.before as string) : undefined;

    const messages = await (Message as any).getMessages(conversationId, limit, before);

    // Mark messages as read
    await (Message as any).markAsRead(conversationId, userId);

    res.status(200).json({
      success: true,
      data: {
        conversation,
        messages: messages.reverse(), // Return in chronological order
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/messages/conversations/:id/messages
 * @desc    Send a message in a conversation
 * @access  Private
 */
router.post(
  '/conversations/:id/messages',
  messageLimiter,
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = sendMessageSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error.errors[0].message,
        });
      }

      const userId = (req as any).user._id.toString();
      const conversationId = req.params.id;
      const { content, type, metadata } = validation.data;

      // Verify user is participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      // Create message
      const message = await Message.create({
        conversation: conversationId,
        sender: userId,
        content,
        type: type || 'text',
        metadata,
      });

      // Send notification to recipient
      const recipientId = conversation.customer.toString() === userId
        ? conversation.artisan.toString()
        : conversation.customer.toString();

      const sender = await User.findById(userId);
      await createNotification(
        recipientId,
        notificationTemplates.newMessage(
          `${sender?.firstName} ${sender?.lastName}`,
          conversationId
        )
      );

      // Populate sender
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'firstName lastName avatar');

      res.status(201).json({
        success: true,
        data: populatedMessage,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/v1/messages/conversations/:id/read
 * @desc    Mark all messages in conversation as read
 * @access  Private
 */
router.put(
  '/conversations/:id/read',
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id.toString();
      const conversationId = req.params.id;

      // Verify user is participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
      }

      const count = await (Message as any).markAsRead(conversationId, userId);

      res.status(200).json({
        success: true,
        data: { markedAsRead: count },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/messages/unread-count
 * @desc    Get total unread message count across all conversations
 * @access  Private
 */
router.get('/unread-count', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id.toString();

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    });

    let totalUnread = 0;
    for (const conv of conversations) {
      if (conv.customer.toString() === userId) {
        totalUnread += conv.customerUnreadCount;
      } else {
        totalUnread += conv.artisanUnreadCount;
      }
    }

    res.status(200).json({
      success: true,
      data: { count: totalUnread },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
