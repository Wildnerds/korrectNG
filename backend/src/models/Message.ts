import mongoose, { Document, Schema } from 'mongoose';
import Conversation from './Conversation';
import { log } from '../utils/logger';

export type MessageType = 'text' | 'image' | 'booking_request' | 'booking_update' | 'system';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: MessageType;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'booking_request', 'booking_update', 'system'],
      default: 'text',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, isRead: 1 });

// Update conversation after saving a message
messageSchema.post('save', async function (doc) {
  try {
    const conversation = await Conversation.findById(doc.conversation);
    if (!conversation) return;

    // Update last message
    conversation.lastMessage = {
      content: doc.content.substring(0, 100),
      sender: doc.sender,
      createdAt: doc.createdAt,
    };
    conversation.lastMessageAt = doc.createdAt;

    // Update unread count for the recipient
    if (doc.sender.toString() === conversation.customer.toString()) {
      conversation.artisanUnreadCount += 1;
    } else {
      conversation.customerUnreadCount += 1;
    }

    await conversation.save();
  } catch (error) {
    log.error('Error updating conversation after message', { error: error instanceof Error ? error.message : error, conversationId: doc.conversation });
  }
});

// Static method to get messages for a conversation
messageSchema.statics.getMessages = async function (
  conversationId: string,
  limit: number = 50,
  before?: Date
) {
  const query: any = {
    conversation: conversationId,
    isDeleted: false,
  };

  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .populate('sender', 'firstName lastName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function (
  conversationId: string,
  userId: string
) {
  const result = await this.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      isRead: false,
    },
    {
      isRead: true,
      readAt: new Date(),
    }
  );

  // Reset unread count in conversation
  const conversation = await Conversation.findById(conversationId);
  if (conversation) {
    if (userId === conversation.customer.toString()) {
      conversation.customerUnreadCount = 0;
    } else {
      conversation.artisanUnreadCount = 0;
    }
    await conversation.save();
  }

  return result.modifiedCount;
};

const Message = mongoose.model<IMessage>('Message', messageSchema);

export default Message;
