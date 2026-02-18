import mongoose, { Schema, Document } from 'mongoose';

export interface IGalleryImage {
  url: string;
  publicId: string;
  caption?: string;
  category?: 'completed' | 'before-after' | 'in-progress' | 'tools' | 'other';
  order?: number;
}

export type TrustLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export type BadgeType =
  | 'first_job'
  | 'jobs_10'
  | 'jobs_50'
  | 'jobs_100'
  | 'five_star_average'
  | 'quick_responder'
  | 'dispute_free'
  | 'always_on_time';

export interface IBadge {
  type: BadgeType;
  earnedAt: Date;
  details?: string;
}

export interface IArtisanProfile extends Document {
  user: mongoose.Types.ObjectId;
  businessName: string;
  slug: string;
  trade: string;
  description: string;
  location: string;
  address: string;
  whatsappNumber: string;
  phoneNumber: string;
  yearsOfExperience: number;
  jobsCompleted: number;
  verificationStatus: 'pending' | 'in-review' | 'approved' | 'rejected';
  isPublished: boolean;
  averageRating: number;
  totalReviews: number;
  galleryImages: IGalleryImage[];
  workingHours: string;
  subscriptionActive: boolean;
  completionRate: number;
  cancellationRate: number;
  disputeRate: number;
  onTimeRate: number;
  responseTime: number;
  trustScore: number;
  trustLevel: TrustLevel;
  badges: IBadge[];
  totalJobsAccepted: number;
  totalJobsCancelled: number;
  totalJobsDisputed: number;
  totalJobsOnTime: number;
  totalResponseTimeMinutes: number;
  responseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const artisanProfileSchema = new Schema<IArtisanProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    trade: {
      type: String,
      required: true,
      enum: [
        'mechanic', 'electrician', 'plumber', 'ac-tech',
        'generator-tech', 'phone-repair', 'tailor',
        'carpenter', 'painter', 'welder',
      ],
    },
    description: { type: String, required: true, maxlength: 1000 },
    location: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    yearsOfExperience: { type: Number, default: 0, min: 0 },
    jobsCompleted: { type: Number, default: 0, min: 0 },
    verificationStatus: {
      type: String,
      enum: ['pending', 'in-review', 'approved', 'rejected'],
      default: 'pending',
    },
    isPublished: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    galleryImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        caption: String,
        category: {
          type: String,
          enum: ['completed', 'before-after', 'in-progress', 'tools', 'other'],
          default: 'other',
        },
        order: { type: Number, default: 0 },
      },
    ],
    workingHours: { type: String, default: 'Mon-Sat: 8am - 6pm' },
    subscriptionActive: { type: Boolean, default: false },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
    cancellationRate: { type: Number, default: 0, min: 0, max: 100 },
    disputeRate: { type: Number, default: 0, min: 0, max: 100 },
    onTimeRate: { type: Number, default: 0, min: 0, max: 100 },
    responseTime: { type: Number, default: 0, min: 0 },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    trustLevel: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    badges: [{
      type: {
        type: String,
        enum: ['first_job', 'jobs_10', 'jobs_50', 'jobs_100', 'five_star_average', 'quick_responder', 'dispute_free', 'always_on_time'],
        required: true,
      },
      earnedAt: { type: Date, default: Date.now },
      details: String,
    }],
    totalJobsAccepted: { type: Number, default: 0, min: 0 },
    totalJobsCancelled: { type: Number, default: 0, min: 0 },
    totalJobsDisputed: { type: Number, default: 0, min: 0 },
    totalJobsOnTime: { type: Number, default: 0, min: 0 },
    totalResponseTimeMinutes: { type: Number, default: 0, min: 0 },
    responseCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

artisanProfileSchema.index({ trade: 1, location: 1 });
artisanProfileSchema.index({ slug: 1 });
artisanProfileSchema.index({ isPublished: 1, verificationStatus: 1, subscriptionActive: 1 });
artisanProfileSchema.index({ averageRating: -1 });
artisanProfileSchema.index({ trustScore: -1 });
artisanProfileSchema.index({ trustLevel: 1 });
artisanProfileSchema.index(
  { businessName: 'text', trade: 'text', location: 'text', description: 'text' },
  { name: 'artisan_text_search' }
);

export const ArtisanProfile = mongoose.model<IArtisanProfile>('ArtisanProfile', artisanProfileSchema);
