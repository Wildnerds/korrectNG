import mongoose, { Schema, Document } from 'mongoose';

export interface IWarrantyClaim extends Document {
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  jobDescription: string;
  issueDescription: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
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
    jobDescription: { type: String, required: true, maxlength: 1000 },
    issueDescription: { type: String, required: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    artisanResponse: String,
    resolution: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

warrantyClaimSchema.index({ customer: 1 });
warrantyClaimSchema.index({ artisan: 1 });
warrantyClaimSchema.index({ status: 1 });

export const WarrantyClaim = mongoose.model<IWarrantyClaim>('WarrantyClaim', warrantyClaimSchema);
