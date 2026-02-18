import mongoose, { Schema, Document } from 'mongoose';

export interface IDisputeEvidence {
  uploadedBy: mongoose.Types.ObjectId;
  type: 'image' | 'video' | 'document';
  url: string;
  publicId: string;
  description?: string;
  uploadedAt: Date;
}

export interface IDispute extends Document {
  contract: mongoose.Types.ObjectId;
  escrow: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  reason: string;
  category: 'quality' | 'incomplete' | 'timeline' | 'materials' | 'communication' | 'other';
  description: string;
  customerEvidence: IDisputeEvidence[];
  artisanEvidence: IDisputeEvidence[];
  artisanResponse?: { content: string; respondedAt: Date };
  customerCounter?: { content: string; submittedAt: Date };
  artisanResponseDeadline: Date;
  customerCounterDeadline?: Date;
  status: 'opened' | 'artisan_response_pending' | 'customer_counter_pending' | 'under_review' | 'resolved' | 'escalated';
  decision?: 'full_payment' | 'partial_release' | 'full_refund' | 'rework_required';
  decisionDetails?: {
    madeBy: mongoose.Types.ObjectId;
    madeAt: Date;
    notes?: string;
    customerRefundAmount?: number;
    artisanPaymentAmount?: number;
  };
  autoEscalatedAt?: Date;
  assignedAdmin?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const evidenceSchema = new Schema({
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['image', 'video', 'document'], required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  description: String,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const disputeSchema = new Schema<IDispute>(
  {
    contract: { type: Schema.Types.ObjectId, ref: 'JobContract', required: true },
    escrow: { type: Schema.Types.ObjectId, ref: 'EscrowPayment', required: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    artisan: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    reason: { type: String, required: true },
    category: {
      type: String,
      enum: ['quality', 'incomplete', 'timeline', 'materials', 'communication', 'other'],
      required: true,
    },
    description: { type: String, required: true },
    customerEvidence: [evidenceSchema],
    artisanEvidence: [evidenceSchema],
    artisanResponse: {
      content: String,
      respondedAt: Date,
    },
    customerCounter: {
      content: String,
      submittedAt: Date,
    },
    artisanResponseDeadline: { type: Date, required: true },
    customerCounterDeadline: Date,
    status: {
      type: String,
      enum: ['opened', 'artisan_response_pending', 'customer_counter_pending', 'under_review', 'resolved', 'escalated'],
      default: 'opened',
    },
    decision: {
      type: String,
      enum: ['full_payment', 'partial_release', 'full_refund', 'rework_required'],
    },
    decisionDetails: {
      madeBy: { type: Schema.Types.ObjectId, ref: 'User' },
      madeAt: Date,
      notes: String,
      customerRefundAmount: Number,
      artisanPaymentAmount: Number,
    },
    autoEscalatedAt: Date,
    assignedAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

disputeSchema.index({ contract: 1 });
disputeSchema.index({ customer: 1 });
disputeSchema.index({ artisan: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ artisanResponseDeadline: 1, status: 1 });

export const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);
