import mongoose, { Document, Schema } from 'mongoose';

export type DisputeStatus =
  | 'opened'
  | 'artisan_response_pending'
  | 'customer_counter_pending'
  | 'under_review'
  | 'resolved'
  | 'escalated';

export type DisputeCategory =
  | 'quality'
  | 'incomplete'
  | 'timeline'
  | 'materials'
  | 'communication'
  | 'other';

export type DisputeDecision =
  | 'full_payment'
  | 'partial_release'
  | 'full_refund'
  | 'rework_required';

export interface IEvidence {
  uploadedBy: mongoose.Types.ObjectId;
  type: 'image' | 'video' | 'document';
  url: string;
  publicId: string;
  description?: string;
  uploadedAt: Date;
}

export interface ITimeline {
  timestamp: Date;
  action: string;
  by: mongoose.Types.ObjectId;
  details?: string;
}

export interface IContractSnapshot {
  scopeOfWork: string;
  milestones: {
    order: number;
    name: string;
    description: string;
    percentage: number;
    amount: number;
    status: string;
  }[];
  deliverables: string[];
}

export interface IDecisionDetails {
  madeBy: mongoose.Types.ObjectId;
  madeAt: Date;
  notes?: string;
  customerRefundAmount?: number;
  artisanPaymentAmount?: number;
}

export interface IDispute extends Document {
  contract: mongoose.Types.ObjectId;
  escrow: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;

  // Dispute details
  reason: string;
  category: DisputeCategory;
  description: string;

  // Evidence
  customerEvidence: IEvidence[];
  artisanEvidence: IEvidence[];

  // Responses
  artisanResponse?: {
    content: string;
    respondedAt: Date;
  };
  customerCounter?: {
    content: string;
    submittedAt: Date;
  };

  // Contract snapshot at time of dispute
  contractSnapshot: IContractSnapshot;

  // Timeline of actions
  timeline: ITimeline[];

  // Deadlines (in hours from creation)
  artisanResponseDeadline: Date;
  customerCounterDeadline?: Date;

  // Status and resolution
  status: DisputeStatus;
  decision?: DisputeDecision;
  decisionDetails?: IDecisionDetails;

  // Admin handling
  autoEscalatedAt?: Date;
  assignedAdmin?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;

  // Helper methods
  addTimelineEvent(action: string, by: mongoose.Types.ObjectId, details?: string): void;
}

const evidenceSchema = new Schema<IEvidence>(
  {
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['image', 'video', 'document'], required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    description: { type: String, maxlength: 500 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const timelineSchema = new Schema<ITimeline>(
  {
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    details: { type: String },
  },
  { _id: false }
);

const contractSnapshotSchema = new Schema<IContractSnapshot>(
  {
    scopeOfWork: { type: String, required: true },
    milestones: [{
      order: Number,
      name: String,
      description: String,
      percentage: Number,
      amount: Number,
      status: String,
    }],
    deliverables: [String],
  },
  { _id: false }
);

const decisionDetailsSchema = new Schema<IDecisionDetails>(
  {
    madeBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    madeAt: { type: Date, required: true },
    notes: { type: String },
    customerRefundAmount: { type: Number, min: 0 },
    artisanPaymentAmount: { type: Number, min: 0 },
  },
  { _id: false }
);

const disputeSchema = new Schema<IDispute>(
  {
    contract: {
      type: Schema.Types.ObjectId,
      ref: 'JobContract',
      required: true,
      index: true,
    },
    escrow: {
      type: Schema.Types.ObjectId,
      ref: 'EscrowPayment',
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
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
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },

    // Dispute details
    reason: {
      type: String,
      required: true,
      maxlength: 200,
    },
    category: {
      type: String,
      enum: ['quality', 'incomplete', 'timeline', 'materials', 'communication', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    // Evidence
    customerEvidence: [evidenceSchema],
    artisanEvidence: [evidenceSchema],

    // Responses
    artisanResponse: {
      content: { type: String, maxlength: 2000 },
      respondedAt: { type: Date },
    },
    customerCounter: {
      content: { type: String, maxlength: 2000 },
      submittedAt: { type: Date },
    },

    // Contract snapshot
    contractSnapshot: contractSnapshotSchema,

    // Timeline
    timeline: [timelineSchema],

    // Deadlines
    artisanResponseDeadline: {
      type: Date,
      required: true,
    },
    customerCounterDeadline: {
      type: Date,
    },

    // Status
    status: {
      type: String,
      enum: ['opened', 'artisan_response_pending', 'customer_counter_pending', 'under_review', 'resolved', 'escalated'],
      default: 'opened',
      index: true,
    },

    // Resolution
    decision: {
      type: String,
      enum: ['full_payment', 'partial_release', 'full_refund', 'rework_required'],
    },
    decisionDetails: decisionDetailsSchema,

    // Admin handling
    autoEscalatedAt: { type: Date },
    assignedAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

// Indexes
disputeSchema.index({ contract: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ artisanResponseDeadline: 1 });
disputeSchema.index({ customer: 1, status: 1 });
disputeSchema.index({ artisan: 1, status: 1 });

// Set artisan response deadline on creation (48 hours)
disputeSchema.pre('save', function (next) {
  if (this.isNew) {
    const now = new Date();
    this.artisanResponseDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    this.status = 'artisan_response_pending';
    this.timeline.push({
      timestamp: now,
      action: 'Dispute opened',
      by: this.customer,
      details: `Category: ${this.category}`,
    });
  }
  next();
});

// Helper method to add timeline event
disputeSchema.methods.addTimelineEvent = function (
  action: string,
  by: mongoose.Types.ObjectId,
  details?: string
) {
  this.timeline.push({
    timestamp: new Date(),
    action,
    by,
    details,
  });
};

export const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);

export default Dispute;
