import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentValidation {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  errors: string[];
}

export interface IVerificationDocument {
  type: 'govtId' | 'tradeCredential' | 'workPhotos';
  url: string;
  publicId: string;
  validationResult?: IDocumentValidation;
}

export interface IVerificationApplication extends Document {
  artisan: mongoose.Types.ObjectId;
  documents: IVerificationDocument[];
  paymentStatus: 'pending' | 'paid';
  paymentReference?: string;
  status: 'pending' | 'in-review' | 'approved' | 'rejected';
  currentStep: 'personal-info' | 'documents' | 'payment' | 'review';
  adminNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const verificationApplicationSchema = new Schema<IVerificationApplication>(
  {
    artisan: { type: Schema.Types.ObjectId, ref: 'ArtisanProfile', required: true, unique: true },
    documents: [
      {
        type: { type: String, enum: ['govtId', 'tradeCredential', 'workPhotos'], required: true },
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
      enum: ['personal-info', 'documents', 'review'],
      default: 'personal-info',
    },
    adminNotes: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

verificationApplicationSchema.index({ status: 1 });
verificationApplicationSchema.index({ artisan: 1 });

export const VerificationApplication = mongoose.model<IVerificationApplication>(
  'VerificationApplication',
  verificationApplicationSchema
);
