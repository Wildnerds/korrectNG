import mongoose, { Document, Schema } from 'mongoose';

export type ContractStatus =
  | 'draft'
  | 'pending_signatures'
  | 'signed'
  | 'active'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'disputed';

export type MaterialsResponsibility = 'customer' | 'artisan' | 'shared';

export interface IMilestone {
  order: number;
  name: string;
  description: string;
  percentage: number;
  amount: number;
  status: MilestoneStatus;
  triggerCondition?: string;
  dueDate?: Date;
  completedAt?: Date;
  approvedAt?: Date;
}

export interface IMaterial {
  item: string;
  estimatedCost: number;
  providedBy: MaterialsResponsibility;
}

export interface ISignature {
  signedBy: mongoose.Types.ObjectId;
  signedAt: Date;
  ipAddress?: string;
}

export interface IStatusHistory {
  status: ContractStatus;
  timestamp: Date;
  note?: string;
  by: mongoose.Types.ObjectId;
}

export interface IJobContract extends Document {
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  artisanProfile: mongoose.Types.ObjectId;

  // Contract details
  title: string;
  scopeOfWork: string;
  deliverables: string[];
  exclusions: string[];

  // Materials
  materialsResponsibility: MaterialsResponsibility;
  materialsList: IMaterial[];

  // Pricing
  totalAmount: number;
  platformFee: number;
  artisanEarnings: number;

  // Timeline
  startDate: Date;
  estimatedEndDate: Date;
  actualEndDate?: Date;

  // Milestones
  milestones: IMilestone[];

  // Signatures
  customerSignature?: ISignature;
  artisanSignature?: ISignature;

  // Status
  status: ContractStatus;
  statusHistory: IStatusHistory[];

  // References
  escrow?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;

  // Helper method to set status with history
  setStatus(
    newStatus: ContractStatus,
    by: mongoose.Types.ObjectId,
    note?: string
  ): void;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    order: { type: Number, required: true, min: 1 },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 500 },
    percentage: { type: Number, required: true, min: 1, max: 100 },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'approved', 'disputed'],
      default: 'pending',
    },
    triggerCondition: { type: String, maxlength: 500 },
    dueDate: { type: Date },
    completedAt: { type: Date },
    approvedAt: { type: Date },
  },
  { _id: false }
);

const materialSchema = new Schema<IMaterial>(
  {
    item: { type: String, required: true, maxlength: 100 },
    estimatedCost: { type: Number, required: true, min: 0 },
    providedBy: {
      type: String,
      enum: ['customer', 'artisan', 'shared'],
      required: true,
    },
  },
  { _id: false }
);

const signatureSchema = new Schema<ISignature>(
  {
    signedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    signedAt: { type: Date, required: true },
    ipAddress: { type: String },
  },
  { _id: false }
);

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: ['draft', 'pending_signatures', 'signed', 'active', 'completed', 'disputed', 'cancelled'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String },
    by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const jobContractSchema = new Schema<IJobContract>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
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
    artisanProfile: {
      type: Schema.Types.ObjectId,
      ref: 'ArtisanProfile',
      required: true,
    },

    // Contract details
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    scopeOfWork: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    deliverables: [{
      type: String,
      maxlength: 200,
    }],
    exclusions: [{
      type: String,
      maxlength: 200,
    }],

    // Materials
    materialsResponsibility: {
      type: String,
      enum: ['customer', 'artisan', 'shared'],
      required: true,
    },
    materialsList: [materialSchema],

    // Pricing
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
    artisanEarnings: {
      type: Number,
      required: true,
      min: 0,
    },

    // Timeline
    startDate: {
      type: Date,
      required: true,
    },
    estimatedEndDate: {
      type: Date,
      required: true,
    },
    actualEndDate: {
      type: Date,
    },

    // Milestones
    milestones: [milestoneSchema],

    // Signatures
    customerSignature: signatureSchema,
    artisanSignature: signatureSchema,

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending_signatures', 'signed', 'active', 'completed', 'disputed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    statusHistory: [statusHistorySchema],

    // References
    escrow: {
      type: Schema.Types.ObjectId,
      ref: 'EscrowPayment',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
jobContractSchema.index({ customer: 1, status: 1 });
jobContractSchema.index({ artisan: 1, status: 1 });
jobContractSchema.index({ createdAt: -1 });

// Calculate platform fee and artisan earnings
jobContractSchema.pre('save', function (next) {
  if (this.isModified('totalAmount')) {
    this.platformFee = Math.round(this.totalAmount * 0.10); // 10% platform fee
    this.artisanEarnings = this.totalAmount - this.platformFee;
  }
  next();
});

// Calculate milestone amounts from percentages
jobContractSchema.pre('save', function (next) {
  if (this.isModified('milestones') || this.isModified('totalAmount')) {
    this.milestones.forEach((milestone) => {
      milestone.amount = Math.round((milestone.percentage / 100) * this.totalAmount);
    });
  }
  next();
});

// Add to status history when status changes
jobContractSchema.pre('save', function (next) {
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

// Method to set status with history
jobContractSchema.methods.setStatus = function (
  newStatus: ContractStatus,
  by: mongoose.Types.ObjectId,
  note?: string
) {
  this.status = newStatus;
  (this as any)._statusChangedBy = by;
  (this as any)._statusNote = note;
};

// Virtual for checking if both parties have signed
jobContractSchema.virtual('isSigned').get(function () {
  return !!(this.customerSignature && this.artisanSignature);
});

// Ensure virtuals are included in JSON
jobContractSchema.set('toJSON', { virtuals: true });
jobContractSchema.set('toObject', { virtuals: true });

export const JobContract = mongoose.model<IJobContract>('JobContract', jobContractSchema);

export default JobContract;
