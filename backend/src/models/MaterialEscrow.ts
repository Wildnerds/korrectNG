import mongoose, { Document, Schema } from 'mongoose';

export type MaterialEscrowStatus =
  | 'created'
  | 'funded'
  | 'release_requested'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'partial_refund';

export interface IStatusHistory {
  status: MaterialEscrowStatus;
  timestamp: Date;
  note?: string;
  by: mongoose.Types.ObjectId;
}

export interface IMaterialEscrow extends Document {
  order: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  merchant: mongoose.Types.ObjectId;
  merchantProfile: mongoose.Types.ObjectId;

  // Amounts (all in Naira)
  totalAmount: number;
  platformFee: number;
  fundedAmount: number;
  releasedAmount: number;
  refundedAmount: number;

  // Payment
  paystackReference?: string;
  fundedAt?: Date;

  // Release
  releaseRequestedAt?: Date;
  releaseRequestedBy?: mongoose.Types.ObjectId;
  releasedAt?: Date;
  paystackTransferRef?: string;
  transferStatus?: 'pending' | 'processing' | 'completed' | 'failed';

  // Status
  status: MaterialEscrowStatus;
  statusHistory: IStatusHistory[];

  // Bank details (copied from merchant at time of release)
  merchantBankCode?: string;
  merchantAccountNumber?: string;
  merchantRecipientCode?: string;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  setStatus(newStatus: MaterialEscrowStatus, by: mongoose.Types.ObjectId, note?: string): void;
  canTransitionTo(newStatus: MaterialEscrowStatus): boolean;
}

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: ['created', 'funded', 'release_requested', 'released', 'disputed', 'refunded', 'partial_refund'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: String,
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const materialEscrowSchema = new Schema<IMaterialEscrow>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialOrder',
      required: true,
      unique: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchantProfile: {
      type: Schema.Types.ObjectId,
      ref: 'MerchantProfile',
      required: true,
    },

    // Amounts
    totalAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    fundedAmount: { type: Number, default: 0, min: 0 },
    releasedAmount: { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },

    // Payment
    paystackReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    fundedAt: Date,

    // Release
    releaseRequestedAt: Date,
    releaseRequestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    releasedAt: Date,
    paystackTransferRef: String,
    transferStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
    },

    // Status
    status: {
      type: String,
      enum: ['created', 'funded', 'release_requested', 'released', 'disputed', 'refunded', 'partial_refund'],
      default: 'created',
      index: true,
    },
    statusHistory: [statusHistorySchema],

    // Bank details
    merchantBankCode: String,
    merchantAccountNumber: String,
    merchantRecipientCode: String,
  },
  { timestamps: true }
);

// Indexes
materialEscrowSchema.index({ order: 1 });
materialEscrowSchema.index({ status: 1 });
materialEscrowSchema.index({ customer: 1, status: 1 });
materialEscrowSchema.index({ merchant: 1, status: 1 });

// Generate unique payment reference
materialEscrowSchema.pre('save', function (next) {
  if (!this.paystackReference && this.isNew) {
    this.paystackReference = `MESC${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

// Add to status history when status changes
materialEscrowSchema.pre('save', function (next) {
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
const VALID_TRANSITIONS: Record<MaterialEscrowStatus, MaterialEscrowStatus[]> = {
  created: ['funded', 'refunded'],
  funded: ['release_requested', 'disputed', 'refunded'],
  release_requested: ['released', 'disputed'],
  released: [], // Terminal state
  disputed: ['released', 'refunded', 'partial_refund'],
  refunded: [], // Terminal state
  partial_refund: [], // Terminal state
};

// Method to check if transition is valid
materialEscrowSchema.methods.canTransitionTo = function (newStatus: MaterialEscrowStatus): boolean {
  return VALID_TRANSITIONS[this.status]?.includes(newStatus) || false;
};

// Method to set status with history
materialEscrowSchema.methods.setStatus = function (
  newStatus: MaterialEscrowStatus,
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
materialEscrowSchema.virtual('remainingBalance').get(function () {
  return this.fundedAmount - this.releasedAmount - this.refundedAmount;
});

// Virtual for merchant payout amount (total - platform fee)
materialEscrowSchema.virtual('merchantPayoutAmount').get(function () {
  return this.totalAmount - this.platformFee;
});

// Ensure virtuals are included in JSON
materialEscrowSchema.set('toJSON', { virtuals: true });
materialEscrowSchema.set('toObject', { virtuals: true });

export const MaterialEscrow = mongoose.model<IMaterialEscrow>('MaterialEscrow', materialEscrowSchema);

export default MaterialEscrow;
