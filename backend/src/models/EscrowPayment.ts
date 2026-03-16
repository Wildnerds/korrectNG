import mongoose, { Document, Schema } from 'mongoose';

export type EscrowStatus =
  | 'created'
  | 'funded'
  | 'milestone_1_pending'
  | 'milestone_1_released'
  | 'milestone_2_pending'
  | 'milestone_2_released'
  | 'milestone_3_pending'
  | 'release_requested'    // V2: Artisan requested single release
  | 'admin_review'         // V2: Escalated to admin for review
  | 'completed'
  | 'disputed'
  | 'resolved'
  | 'cancelled'
  | 'partial_refund';

export type EscrowVersion = 'v1' | 'v2';

export interface IRelease {
  milestone: number;
  amount: number;
  releasedAt: Date;
  releasedBy: mongoose.Types.ObjectId;
  paystackTransferRef?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface IStatusHistory {
  status: EscrowStatus;
  timestamp: Date;
  note?: string;
  by: mongoose.Types.ObjectId;
}

export interface IEscrowPayment extends Document {
  contract?: mongoose.Types.ObjectId;  // Optional for v2 (no contract required)
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  quote?: mongoose.Types.ObjectId;     // V2: Reference to accepted quote

  // Version
  escrowVersion: EscrowVersion;

  // Amounts (all in Naira)
  totalAmount: number;
  platformFee: number;
  fundedAmount: number;
  releasedAmount: number;
  refundedAmount: number;

  // Payment tracking
  paystackReference?: string;
  fundedAt?: Date;

  // Releases
  releases: IRelease[];

  // Status
  status: EscrowStatus;
  statusHistory: IStatusHistory[];

  // Dispute reference
  dispute?: mongoose.Types.ObjectId;

  // V2: Release request tracking
  releaseRequestedAt?: Date;
  releaseRequestedBy?: mongoose.Types.ObjectId;
  releaseNotes?: string;
  adminReviewReason?: string;
  adminReviewRequestedAt?: Date;
  adminResolvedAt?: Date;
  adminResolvedBy?: mongoose.Types.ObjectId;
  adminResolutionNotes?: string;

  // Artisan bank details for payouts
  artisanBankCode?: string;
  artisanAccountNumber?: string;
  artisanRecipientCode?: string;

  createdAt: Date;
  updatedAt: Date;

  // Helper methods
  setStatus(
    newStatus: EscrowStatus,
    by: mongoose.Types.ObjectId,
    note?: string
  ): void;
  canTransitionTo(newStatus: EscrowStatus): boolean;
}

const releaseSchema = new Schema<IRelease>(
  {
    milestone: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    releasedAt: { type: Date, required: true },
    releasedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    paystackTransferRef: { type: String },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
  },
  { _id: false }
);

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: [
        'created', 'funded', 'milestone_1_pending', 'milestone_1_released',
        'milestone_2_pending', 'milestone_2_released', 'milestone_3_pending',
        'release_requested', 'admin_review',  // V2 statuses
        'completed', 'disputed', 'resolved', 'cancelled', 'partial_refund',
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const escrowPaymentSchema = new Schema<IEscrowPayment>(
  {
    contract: {
      type: Schema.Types.ObjectId,
      ref: 'JobContract',
      // Not required for v2 escrows
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    quote: {
      type: Schema.Types.ObjectId,
      ref: 'Quote',
      // For v2 escrows
    },
    escrowVersion: {
      type: String,
      enum: ['v1', 'v2'],
      default: 'v1',
    },
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

    // Amounts
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    fundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    releasedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Payment tracking
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    fundedAt: {
      type: Date,
    },

    // Releases
    releases: [releaseSchema],

    // Status
    status: {
      type: String,
      enum: [
        'created', 'funded', 'milestone_1_pending', 'milestone_1_released',
        'milestone_2_pending', 'milestone_2_released', 'milestone_3_pending',
        'release_requested', 'admin_review',  // V2 statuses
        'completed', 'disputed', 'resolved', 'cancelled', 'partial_refund',
      ],
      default: 'created',
      index: true,
    },
    statusHistory: [statusHistorySchema],

    // Dispute reference
    dispute: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
    },

    // V2: Release request tracking
    releaseRequestedAt: {
      type: Date,
    },
    releaseRequestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    releaseNotes: {
      type: String,
      maxlength: 500,
    },
    adminReviewReason: {
      type: String,
      maxlength: 500,
    },
    adminReviewRequestedAt: {
      type: Date,
    },
    adminResolvedAt: {
      type: Date,
    },
    adminResolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    adminResolutionNotes: {
      type: String,
      maxlength: 1000,
    },

    // Artisan bank details
    artisanBankCode: { type: String },
    artisanAccountNumber: { type: String },
    artisanRecipientCode: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
escrowPaymentSchema.index({ contract: 1 });
escrowPaymentSchema.index({ status: 1 });
escrowPaymentSchema.index({ customer: 1, status: 1 });
escrowPaymentSchema.index({ artisan: 1, status: 1 });

// Generate unique payment reference
escrowPaymentSchema.pre('save', function (next) {
  if (!this.paystackReference && this.isNew) {
    this.paystackReference = `ESC${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

// Add to status history when status changes
escrowPaymentSchema.pre('save', function (next) {
  if (this.isModified('status') && (this as any)._statusChangedBy) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: (this as any)._statusNote,
      by: (this as any)._statusChangedBy,
    });
  }
  next();
});

// Valid state transitions
const VALID_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  // V1 milestone-based flow
  created: ['funded', 'cancelled'],
  funded: ['milestone_1_pending', 'release_requested', 'disputed', 'cancelled'],  // V2: direct to release_requested
  milestone_1_pending: ['milestone_1_released', 'disputed'],
  milestone_1_released: ['milestone_2_pending', 'disputed'],
  milestone_2_pending: ['milestone_2_released', 'disputed'],
  milestone_2_released: ['milestone_3_pending', 'disputed'],
  milestone_3_pending: ['completed', 'disputed'],

  // V2 single-release flow
  release_requested: ['completed', 'admin_review', 'disputed'],
  admin_review: ['completed', 'partial_refund', 'cancelled'],

  completed: [], // Terminal state
  disputed: ['resolved', 'milestone_1_released', 'milestone_2_released', 'milestone_3_pending', 'partial_refund', 'admin_review'],
  resolved: [], // Terminal state
  cancelled: [], // Terminal state
  partial_refund: [], // Terminal state
};

// Method to check if transition is valid
escrowPaymentSchema.methods.canTransitionTo = function (newStatus: EscrowStatus): boolean {
  return VALID_TRANSITIONS[this.status]?.includes(newStatus) || false;
};

// Method to set status with history
escrowPaymentSchema.methods.setStatus = function (
  newStatus: EscrowStatus,
  by: mongoose.Types.ObjectId,
  note?: string
) {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Invalid transition from ${this.status} to ${newStatus}`);
  }
  this.status = newStatus;
  (this as any)._statusChangedBy = by;
  (this as any)._statusNote = note;
};

// Virtual for remaining balance
escrowPaymentSchema.virtual('remainingBalance').get(function () {
  return this.fundedAmount - this.releasedAmount - this.refundedAmount;
});

// Virtual for artisan payout amount (total - platform fee)
escrowPaymentSchema.virtual('artisanPayoutAmount').get(function () {
  return this.totalAmount - this.platformFee;
});

// Ensure virtuals are included in JSON
escrowPaymentSchema.set('toJSON', { virtuals: true });
escrowPaymentSchema.set('toObject', { virtuals: true });

export const EscrowPayment = mongoose.model<IEscrowPayment>('EscrowPayment', escrowPaymentSchema);

export default EscrowPayment;
