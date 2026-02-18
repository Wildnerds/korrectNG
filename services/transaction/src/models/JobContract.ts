import mongoose, { Schema, Document } from 'mongoose';

export interface IContractMilestone {
  order: number;
  name: string;
  description: string;
  percentage: number;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'approved' | 'disputed';
  dueDate?: Date;
  completedAt?: Date;
  approvedAt?: Date;
}

export interface IJobContract extends Document {
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  artisanProfile: mongoose.Types.ObjectId;
  title: string;
  scopeOfWork: string;
  deliverables: string[];
  exclusions: string[];
  materialsResponsibility: 'customer' | 'artisan' | 'shared';
  totalAmount: number;
  platformFee: number;
  artisanEarnings: number;
  startDate: Date;
  estimatedEndDate: Date;
  milestones: IContractMilestone[];
  customerSignature?: { signedBy: mongoose.Types.ObjectId; signedAt: Date };
  artisanSignature?: { signedBy: mongoose.Types.ObjectId; signedAt: Date };
  status: 'draft' | 'pending_signatures' | 'signed' | 'active' | 'completed' | 'disputed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema({
  order: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  amount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'approved', 'disputed'],
    default: 'pending',
  },
  dueDate: Date,
  completedAt: Date,
  approvedAt: Date,
}, { _id: false });

const contractSchema = new Schema<IJobContract>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    artisan: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    artisanProfile: { type: Schema.Types.ObjectId, ref: 'ArtisanProfile', required: true },
    title: { type: String, required: true, trim: true },
    scopeOfWork: { type: String, required: true },
    deliverables: [{ type: String }],
    exclusions: [{ type: String }],
    materialsResponsibility: {
      type: String,
      enum: ['customer', 'artisan', 'shared'],
      default: 'artisan',
    },
    totalAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, required: true, min: 0 },
    artisanEarnings: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    estimatedEndDate: { type: Date, required: true },
    milestones: [milestoneSchema],
    customerSignature: {
      signedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      signedAt: Date,
    },
    artisanSignature: {
      signedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      signedAt: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_signatures', 'signed', 'active', 'completed', 'disputed', 'cancelled'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

contractSchema.index({ booking: 1 });
contractSchema.index({ customer: 1, status: 1 });
contractSchema.index({ artisan: 1, status: 1 });

export const JobContract = mongoose.model<IJobContract>('JobContract', contractSchema);
