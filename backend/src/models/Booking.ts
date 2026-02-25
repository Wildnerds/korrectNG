import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus =
  | 'pending'          // Customer requested, waiting for artisan
  | 'quoted'           // Artisan sent price quote, waiting for customer
  | 'accepted'         // Customer accepted quote
  | 'rejected'         // Artisan rejected the request
  | 'declined'         // Customer declined the quote
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
  images?: string[];  // Optional images of the job/damage

  // Pricing
  estimatedPrice?: number;   // Optional - set when artisan quotes
  finalPrice?: number;
  platformFee: number;       // 10% platform fee
  artisanEarnings: number;   // finalPrice - platformFee

  // Quote from artisan
  quotedPrice?: number;
  quoteMessage?: string;
  quotedAt?: Date;

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

  // Job Certification (new warranty model)
  jobCompletedAt?: Date;           // When artisan marks job complete
  certificationDeadline?: Date;    // 3 days from jobCompletedAt
  customerCertifiedAt?: Date;      // When customer certified (manual or auto)
  autoCertifiedAt?: Date;          // If auto-certified after 3 days
  gracePeriodExpiresAt?: Date;     // 7 days from certification

  // Rating & Review
  hasReview: boolean;
  review?: mongoose.Types.ObjectId;

  // Contract & Escrow
  contract?: mongoose.Types.ObjectId;
  escrow?: mongoose.Types.ObjectId;

  // Warranty (7-day grace period from certification)
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
    images: [{
      type: String,  // URLs to uploaded images
    }],

    // Pricing (all in Naira)
    estimatedPrice: {
      type: Number,
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

    // Quote from artisan
    quotedPrice: {
      type: Number,
      min: 0,
    },
    quoteMessage: {
      type: String,
      maxlength: 1000,
    },
    quotedAt: {
      type: Date,
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
        'quoted',
        'accepted',
        'rejected',
        'declined',
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

    // Job Certification (new warranty model)
    jobCompletedAt: {
      type: Date,
    },
    certificationDeadline: {
      type: Date,
    },
    customerCertifiedAt: {
      type: Date,
    },
    autoCertifiedAt: {
      type: Date,
    },
    gracePeriodExpiresAt: {
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

    // Warranty (7-day grace period from certification)
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

// Set warranty/grace period expiry when confirmed (7-day protection period)
bookingSchema.pre('save', function (next) {
  if (this.status === 'confirmed' && !this.warrantyExpiresAt) {
    const gracePeriodDays = 7;  // Changed from 30 to 7 days
    const now = new Date();
    this.confirmedAt = now;
    this.customerCertifiedAt = now;
    this.gracePeriodExpiresAt = new Date(now);
    this.gracePeriodExpiresAt.setDate(this.gracePeriodExpiresAt.getDate() + gracePeriodDays);
    this.warrantyExpiresAt = this.gracePeriodExpiresAt;
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
