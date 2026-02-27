import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentValidation {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  errors: string[];
}

export interface IMerchantVerificationDocument {
  type: 'govtId' | 'cacDocument' | 'businessPermit' | 'storePhotos';
  url: string;
  publicId: string;
  validationResult?: IDocumentValidation;
}

export interface IMerchantVerificationApplication extends Document {
  merchant: mongoose.Types.ObjectId;
  documents: IMerchantVerificationDocument[];
  paymentStatus: 'pending' | 'paid';
  paymentReference?: string;
  status: 'pending' | 'in-review' | 'approved' | 'rejected';
  currentStep: 'business-info' | 'documents' | 'review';
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const merchantVerificationApplicationSchema = new Schema<IMerchantVerificationApplication>(
  {
    merchant: {
      type: Schema.Types.ObjectId,
      ref: 'MerchantProfile',
      required: true,
      unique: true,
    },
    documents: [
      {
        type: {
          type: String,
          enum: ['govtId', 'cacDocument', 'businessPermit', 'storePhotos'],
          required: true,
        },
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        validationResult: {
          isValid: Boolean,
          confidence: { type: String, enum: ['high', 'medium', 'low'] },
          warnings: [String],
          errors: [String],
        },
      },
    ],
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    paymentReference: String,
    status: {
      type: String,
      enum: ['pending', 'in-review', 'approved', 'rejected'],
      default: 'pending',
    },
    currentStep: {
      type: String,
      enum: ['business-info', 'documents', 'review'],
      default: 'business-info',
    },
    adminNotes: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

merchantVerificationApplicationSchema.index({ status: 1 });
merchantVerificationApplicationSchema.index({ merchant: 1 });

export const MerchantVerificationApplication = mongoose.model<IMerchantVerificationApplication>(
  'MerchantVerificationApplication',
  merchantVerificationApplicationSchema
);
