import mongoose, { Schema, Document } from 'mongoose';

export interface ITermsAcceptance extends Document {
  user: mongoose.Types.ObjectId;
  termsVersion: string;
  acceptedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const termsAcceptanceSchema = new Schema<ITermsAcceptance>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    termsVersion: {
      type: String,
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  { timestamps: true }
);

// Compound index for user + version (unique acceptance per version)
termsAcceptanceSchema.index({ user: 1, termsVersion: 1 }, { unique: true });

// Index for querying user's acceptances
termsAcceptanceSchema.index({ user: 1, acceptedAt: -1 });

/**
 * Check if a user has accepted a specific terms version
 */
termsAcceptanceSchema.statics.hasAccepted = async function (
  userId: mongoose.Types.ObjectId | string,
  termsVersion: string
): Promise<boolean> {
  const acceptance = await this.findOne({
    user: userId,
    termsVersion,
  });
  return !!acceptance;
};

/**
 * Get user's latest acceptance
 */
termsAcceptanceSchema.statics.getLatestAcceptance = async function (
  userId: mongoose.Types.ObjectId | string
): Promise<ITermsAcceptance | null> {
  return this.findOne({ user: userId })
    .sort({ acceptedAt: -1 })
    .exec();
};

/**
 * Get all acceptances for a user
 */
termsAcceptanceSchema.statics.getUserAcceptances = async function (
  userId: mongoose.Types.ObjectId | string
): Promise<ITermsAcceptance[]> {
  return this.find({ user: userId })
    .sort({ acceptedAt: -1 })
    .exec();
};

export interface ITermsAcceptanceModel extends mongoose.Model<ITermsAcceptance> {
  hasAccepted(userId: mongoose.Types.ObjectId | string, termsVersion: string): Promise<boolean>;
  getLatestAcceptance(userId: mongoose.Types.ObjectId | string): Promise<ITermsAcceptance | null>;
  getUserAcceptances(userId: mongoose.Types.ObjectId | string): Promise<ITermsAcceptance[]>;
}

const TermsAcceptance = mongoose.model<ITermsAcceptance, ITermsAcceptanceModel>(
  'TermsAcceptance',
  termsAcceptanceSchema
);

export default TermsAcceptance;
