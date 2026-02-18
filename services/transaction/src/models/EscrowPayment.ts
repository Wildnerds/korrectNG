import mongoose, { Schema, Document } from 'mongoose';

export interface IEscrowRelease {
  milestone: number;
  amount: number;
  releasedAt: Date;
  releasedBy: mongoose.Types.ObjectId;
  paystackTransferRef?: string;
}

export interface IEscrowPayment extends Document {
  contract: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  totalAmount: number;
  platformFee: number;
  fundedAmount: number;
  releasedAmount: number;
  refundedAmount: number;
  paystackReference?: string;
  fundedAt?: Date;
  releases: IEscrowRelease[];
  status: 'created' | 'funded' | 'milestone_1_pending' | 'milestone_1_released' | 'milestone_2_pending' | 'milestone_2_released' | 'milestone_3_pending' | 'completed' | 'disputed' | 'resolved' | 'cancelled' | 'partial_refund';
  dispute?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const releaseSchema = new Schema({
  milestone: { type: Number, required: true },
  amount: { type: Number, required: true },
  releasedAt: { type: Date, required: true },
  releasedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paystackTransferRef: String,
}, { _id: false });

const escrowSchema = new Schema<IEscrowPayment>(
  {
    contract: { type: Schema.Types.ObjectId, ref: 'JobContract', required: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    artisan: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    fundedAmount: { type: Number, default: 0, min: 0 },
    releasedAmount: { type: Number, default: 0, min: 0 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    paystackReference: String,
    fundedAt: Date,
    releases: [releaseSchema],
    status: {
      type: String,
      enum: ['created', 'funded', 'milestone_1_pending', 'milestone_1_released', 'milestone_2_pending', 'milestone_2_released', 'milestone_3_pending', 'completed', 'disputed', 'resolved', 'cancelled', 'partial_refund'],
      default: 'created',
    },
    dispute: { type: Schema.Types.ObjectId, ref: 'Dispute' },
  },
  { timestamps: true }
);

escrowSchema.index({ contract: 1 });
escrowSchema.index({ customer: 1 });
escrowSchema.index({ artisan: 1 });
escrowSchema.index({ status: 1 });
escrowSchema.index({ paystackReference: 1 });

export const EscrowPayment = mongoose.model<IEscrowPayment>('EscrowPayment', escrowSchema);
