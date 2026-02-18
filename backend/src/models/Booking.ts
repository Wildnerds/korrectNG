import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus =
  | 'pending'          // Customer requested, waiting for artisan
  | 'accepted'         // Artisan accepted
  | 'rejected'         // Artisan rejected
  | 'payment_pending'  // Waiting for customer payment
  | 'paid'             // Customer paid (escrow)
  | 'in_progress'      // Work has started
  | 'completed'        // Artisan marked complete
  | 'confirmed'        // Customer confirmed completion
  | 'disputed'         // There's a dispute
  | 'cancelled'        // Cancelled by either party
  | 'refunded';        // Payment refunded

export type PaymentStatus = 'pending' | 'escrow' | 'released' | 'refunded' | 'partial_refund';

export interface IBooking extends Document {
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  artisanProfile: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;

  // Job details
  jobType: string;
  description: string;
  location: string;
  address: string;
  scheduledDate?: Date;
  scheduledTime?: string;

  // Pricing
  estimatedPrice: number;
  finalPrice?: number;
  platformFee: number;      // 10% platform fee
  artisanEarnings: number;  // finalPrice - platformFee

  // Payment
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paystackReference?: string;
  paidAt?: Date;
  releasedAt?: Date;

  // Status tracking
  status: BookingStatus;
  statusHistory: {
    status: BookingStatus;
    timestamp: Date;
    note?: string;
    by: mongoose.Types.ObjectId;
  }[];

  // Completion
  completedAt?: Date;
  confirmedAt?: Date;

  // Rating & Review
  hasReview: boolean;
  review?: mongoose.Types.ObjectId;

  // Contract & Escrow
  contract?: mongoose.Types.ObjectId;
  escrow?: mongoose.Types.ObjectId;

  // Warranty
  warrantyExpiresAt?: Date;

  // Cancellation/Dispute
  cancellationReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  disputeReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artisanProfile: {
      type: Schema.Types.ObjectId,
      ref: 'ArtisanProfile',
      required: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },

    // Job details
    jobType: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    location: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    scheduledDate: {
      type: Date,
    },
    scheduledTime: {
      type: String,
    },

    // Pricing (all in Naira)
    estimatedPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    finalPrice: {
      type: Number,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    artisanEarnings: {
      type: Number,
      default: 0,
    },

    // Payment
    paymentStatus: {
      type: String,
      enum: ['pending', 'escrow', 'released', 'refunded', 'partial_refund'],
      default: 'pending',
    },
    paymentReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    paystackReference: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    releasedAt: {
      type: Date,
    },

    // Status
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'payment_pending',
        'paid',
        'in_progress',
        'completed',
        'confirmed',
        'disputed',
        'cancelled',
        'refunded',
      ],
      default: 'pending',
      index: true,
    },
    statusHistory: [{
      status: String,
      timestamp: { type: Date, default: Date.now },
      note: String,
      by: { type: Schema.Types.ObjectId, ref: 'User' },
    }],

    // Completion
    completedAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },

    // Rating
    hasReview: {
      type: Boolean,
      default: false,
    },
    review: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
    },

    // Contract & Escrow
    contract: {
      type: Schema.Types.ObjectId,
      ref: 'JobContract',
    },
    escrow: {
      type: Schema.Types.ObjectId,
      ref: 'EscrowPayment',
    },

    // Warranty (30 days from confirmation)
    warrantyExpiresAt: {
      type: Date,
    },

    // Cancellation/Dispute
    cancellationReason: {
      type: String,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    disputeReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ artisan: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ paymentReference: 1 });

// Generate unique payment reference
bookingSchema.pre('save', function (next) {
  if (!this.paymentReference) {
    this.paymentReference = `BK${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

// Calculate platform fee and artisan earnings when final price is set
bookingSchema.pre('save', function (next) {
  if (this.finalPrice && this.isModified('finalPrice')) {
    this.platformFee = Math.round(this.finalPrice * 0.10); // 10% platform fee
    this.artisanEarnings = this.finalPrice - this.platformFee;
  }
  next();
});

// Add to status history when status changes
bookingSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      by: (this as any)._statusChangedBy || this.customer,
    });
  }
  next();
});

// Set warranty expiry when confirmed
bookingSchema.pre('save', function (next) {
  if (this.status === 'confirmed' && !this.warrantyExpiresAt) {
    const warrantyDays = 30;
    this.warrantyExpiresAt = new Date();
    this.warrantyExpiresAt.setDate(this.warrantyExpiresAt.getDate() + warrantyDays);
    this.confirmedAt = new Date();
  }
  next();
});

// Static method to get booking stats for an artisan
bookingSchema.statics.getArtisanStats = async function (artisanId: string) {
  const stats = await this.aggregate([
    { $match: { artisan: new mongoose.Types.ObjectId(artisanId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEarnings: { $sum: '$artisanEarnings' },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = { count: stat.count, earnings: stat.totalEarnings };
    return acc;
  }, {} as Record<string, { count: number; earnings: number }>);
};

const Booking = mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;
