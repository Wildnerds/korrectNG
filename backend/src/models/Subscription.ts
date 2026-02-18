import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  artisan: mongoose.Types.ObjectId;
  paystackSubscriptionCode: string;
  paystackCustomerCode: string;
  status: 'active' | 'past_due' | 'cancelled' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    artisan: { type: Schema.Types.ObjectId, ref: 'ArtisanProfile', required: true, unique: true },
    paystackSubscriptionCode: { type: String, required: true },
    paystackCustomerCode: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'past_due', 'cancelled', 'unpaid'],
      default: 'active',
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ artisan: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ paystackSubscriptionCode: 1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
