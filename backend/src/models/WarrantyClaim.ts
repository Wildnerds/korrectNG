import mongoose, { Schema, Document } from 'mongoose';

export interface IWarrantyClaim extends Document {
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;           // Required - link to booking
  escrowPaymentId?: mongoose.Types.ObjectId;  // Link to escrow if exists
  paidViaEscrow: boolean;                     // Must be true for valid claim
  customerCertifiedAt?: Date;                 // When customer approved job
  claimWithinGracePeriod: boolean;            // Within 7-day window
  jobDescription: string;
  issueDescription: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'rejected';
  rejectionReason?: string;                   // Reason if claim was rejected
  artisanResponse?: string;
  resolution?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const warrantyClaimSchema = new Schema<IWarrantyClaim>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    artisan: { type: Schema.Types.ObjectId, ref: 'ArtisanProfile', required: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    escrowPaymentId: { type: Schema.Types.ObjectId, ref: 'EscrowPayment' },
    paidViaEscrow: { type: Boolean, required: true, default: false },
    customerCertifiedAt: { type: Date },
    claimWithinGracePeriod: { type: Boolean, required: true, default: false },
    jobDescription: { type: String, required: true, maxlength: 1000 },
    issueDescription: { type: String, required: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed', 'rejected'],
      default: 'open',
    },
    rejectionReason: String,
    artisanResponse: String,
    resolution: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

warrantyClaimSchema.index({ customer: 1 });
warrantyClaimSchema.index({ artisan: 1 });
warrantyClaimSchema.index({ booking: 1 });
warrantyClaimSchema.index({ status: 1 });

export const WarrantyClaim = mongoose.model<IWarrantyClaim>('WarrantyClaim', warrantyClaimSchema);
