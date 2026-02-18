import mongoose, { Schema, Document, Types } from 'mongoose';

// ============ Conversation Model ============

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  participantRoles: {
    userId: Types.ObjectId;
    role: 'customer' | 'artisan';
  }[];
  booking?: Types.ObjectId;
  contract?: Types.ObjectId;
  lastMessage?: {
    content: string;
    sender: Types.ObjectId;
    sentAt: Date;
  };
  lastMessageAt: Date;
  unreadCount: Map<string, number>;
  isArchived: Map<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },
    ],
    participantRoles: [
      {
        userId: { type: Schema.Types.ObjectId, required: true },
        role: { type: String, enum: ['customer', 'artisan'], required: true },
      },
    ],
    booking: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    contract: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    lastMessage: {
      content: String,
      sender: Schema.Types.ObjectId,
      sentAt: Date,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    isArchived: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding conversations between two users
ConversationSchema.index({ participants: 1, booking: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

// ============ Message Model ============

export interface IMessageAttachment {
  type: 'image' | 'file' | 'audio';
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  senderRole: 'customer' | 'artisan' | 'system';
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'system';
  attachments: IMessageAttachment[];
  replyTo?: Types.ObjectId;
  readBy: {
    userId: Types.ObjectId;
    readAt: Date;
  }[];
  deliveredTo: {
    userId: Types.ObjectId;
    deliveredAt: Date;
  }[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  editedAt?: Date;
  metadata?: {
    bookingId?: string;
    contractId?: string;
    actionType?: string;
    actionData?: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ['customer', 'artisan', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'system'],
      default: 'text',
    },
    attachments: [
      {
        type: { type: String, enum: ['image', 'file', 'audio'] },
        url: { type: String, required: true },
        filename: String,
        mimeType: String,
        size: Number,
      },
    ],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
    deliveredTo: [
      {
        userId: { type: Schema.Types.ObjectId, required: true },
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: Schema.Types.ObjectId,
    editedAt: Date,
    metadata: {
      bookingId: String,
      contractId: String,
      actionType: String,
      actionData: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching conversation messages
MessageSchema.index({ conversation: 1, createdAt: -1 });
// Index for unread messages
MessageSchema.index({ conversation: 1, 'readBy.userId': 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
