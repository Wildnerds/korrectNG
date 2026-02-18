import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'new_review'
  | 'review_response'
  | 'warranty_claim'
  | 'warranty_update'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_pending'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'new_message'
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'booking_completed'
  | 'payment_received'
  | 'welcome'
  | 'system';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  link?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'new_review',
        'review_response',
        'warranty_claim',
        'warranty_update',
        'verification_approved',
        'verification_rejected',
        'verification_pending',
        'subscription_expiring',
        'subscription_expired',
        'new_message',
        'booking_request',
        'booking_accepted',
        'booking_rejected',
        'booking_completed',
        'payment_received',
        'welcome',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    link: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// Auto-delete old notifications after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId: string): Promise<number> {
  return this.countDocuments({ user: userId, isRead: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function (userId: string): Promise<void> {
  await this.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    data?: Record<string, any>;
    link?: string;
    imageUrl?: string;
  }
): Promise<INotification> {
  return this.create({
    user: userId,
    type,
    title,
    message,
    data: options?.data,
    link: options?.link,
    imageUrl: options?.imageUrl,
  });
};

// Static method to get recent notifications
notificationSchema.statics.getRecent = async function (
  userId: string,
  limit: number = 20,
  skip: number = 0
): Promise<INotification[]> {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
