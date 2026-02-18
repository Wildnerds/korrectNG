import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  artisanProfile: mongoose.Types.ObjectId;
  lastMessage?: {
    content: string;
    sender: mongoose.Types.ObjectId;
    createdAt: Date;
  };
  lastMessageAt: Date;
  isActive: boolean;
  customerUnreadCount: number;
  artisanUnreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    artisanProfile: {
      type: Schema.Types.ObjectId,
      ref: 'ArtisanProfile',
      required: true,
    },
    lastMessage: {
      content: String,
      sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: Date,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    customerUnreadCount: {
      type: Number,
      default: 0,
    },
    artisanUnreadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ customer: 1, artisan: 1 }, { unique: true });
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ customer: 1, lastMessageAt: -1 });
conversationSchema.index({ artisan: 1, lastMessageAt: -1 });

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function (
  customerId: string,
  artisanId: string,
  artisanProfileId: string
): Promise<IConversation> {
  let conversation = await this.findOne({
    customer: customerId,
    artisan: artisanId,
  });

  if (!conversation) {
    conversation = await this.create({
      participants: [customerId, artisanId],
      customer: customerId,
      artisan: artisanId,
      artisanProfile: artisanProfileId,
    });
  }

  return conversation;
};

// Static method to get conversations for a user
conversationSchema.statics.getConversationsForUser = async function (
  userId: string,
  limit: number = 20,
  skip: number = 0
) {
  return this.find({
    participants: userId,
    isActive: true,
  })
    .populate('customer', 'firstName lastName avatar')
    .populate('artisan', 'firstName lastName avatar')
    .populate('artisanProfile', 'businessName slug trade')
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Conversation;
