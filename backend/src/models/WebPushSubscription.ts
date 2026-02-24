import mongoose, { Schema, Document } from 'mongoose';

export interface IWebPushSubscription extends Document {
  user: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webPushSubscriptionSchema = new Schema<IWebPushSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
webPushSubscriptionSchema.index({ user: 1, isActive: 1 });

// Clean up old subscriptions (older than 90 days of inactivity)
webPushSubscriptionSchema.index({ lastUsedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IWebPushSubscription>('WebPushSubscription', webPushSubscriptionSchema);
