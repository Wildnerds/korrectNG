import mongoose, { Schema, Document } from 'mongoose';

export type ReferralStatus = 'pending' | 'active' | 'bonus_paid' | 'inactive';

export interface IReferral extends Document {
  referrer: mongoose.Types.ObjectId; // Artisan who referred
  referrerProfile: mongoose.Types.ObjectId; // ArtisanProfile
  referred: mongoose.Types.ObjectId; // Merchant user
  referredProfile: mongoose.Types.ObjectId; // MerchantProfile
  referralCode: string;

  status: ReferralStatus;

  // Bonus tracking
  signupBonusAmount: number; // Bonus for signup (paid when merchant makes first sale)
  signupBonusPaid: boolean;
  signupBonusPaidAt?: Date;

  // Commission tracking (ongoing % of merchant sales)
  commissionRate: number; // e.g., 0.01 = 1%
  totalCommissionEarned: number;
  commissionPayments: Array<{
    orderId: mongoose.Types.ObjectId;
    orderAmount: number;
    commissionAmount: number;
    paidAt: Date;
  }>;

  // Merchant activity
  merchantFirstSaleAt?: Date;
  merchantTotalSales: number;
  merchantOrderCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referrerProfile: {
      type: Schema.Types.ObjectId,
      ref: 'ArtisanProfile',
      required: true,
    },
    referred: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referredProfile: {
      type: Schema.Types.ObjectId,
      ref: 'MerchantProfile',
      required: true,
    },
    referralCode: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'active', 'bonus_paid', 'inactive'],
      default: 'pending',
    },

    // Bonus tracking
    signupBonusAmount: {
      type: Number,
      default: 2000, // 2000 Naira default bonus
      min: 0,
    },
    signupBonusPaid: {
      type: Boolean,
      default: false,
    },
    signupBonusPaidAt: Date,

    // Commission tracking
    commissionRate: {
      type: Number,
      default: 0.01, // 1% default
      min: 0,
      max: 0.1, // Max 10%
    },
    totalCommissionEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionPayments: [
      {
        orderId: { type: Schema.Types.ObjectId, ref: 'MaterialOrder' },
        orderAmount: { type: Number, required: true },
        commissionAmount: { type: Number, required: true },
        paidAt: { type: Date, default: Date.now },
      },
    ],

    // Merchant activity
    merchantFirstSaleAt: Date,
    merchantTotalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
    merchantOrderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Indexes
referralSchema.index({ referrer: 1, status: 1 });
referralSchema.index({ referred: 1 });
referralSchema.index({ referralCode: 1 });

// Ensure one referral per merchant
referralSchema.index({ referred: 1 }, { unique: true });

export default mongoose.model<IReferral>('Referral', referralSchema);
