import mongoose, { Schema, Document } from 'mongoose';

export type TrustLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export type MerchantBadgeType =
  | 'first_order'
  | 'orders_10'
  | 'orders_50'
  | 'orders_100'
  | 'five_star_average'
  | 'quick_responder'
  | 'defect_free'
  | 'always_on_time';

export interface IMerchantBadge {
  type: MerchantBadgeType;
  earnedAt: Date;
  details?: string;
}

export type MerchantCategory =
  | 'building-materials'
  | 'electrical'
  | 'plumbing'
  | 'automotive'
  | 'hvac'
  | 'tools'
  | 'phone-parts'
  | 'fabrics'
  | 'general';

export interface IMerchantProfile extends Document {
  user: mongoose.Types.ObjectId;
  businessName: string;
  slug: string;
  category: MerchantCategory;
  categories: MerchantCategory[];
  description: string;

  // Contact
  location: string;
  address: string;
  whatsappNumber: string;
  phoneNumber: string;

  // Business details
  cacNumber?: string;
  businessLogo?: string;

  // Verification
  verificationStatus: 'pending' | 'in-review' | 'approved' | 'rejected';
  isPublished: boolean;
  isProfileComplete: boolean;

  // Trust metrics
  averageRating: number;
  totalReviews: number;
  trustScore: number;
  trustLevel: TrustLevel;
  fulfillmentRate: number;
  onTimeDeliveryRate: number;
  defectRate: number;
  responseTime: number;

  // Stats
  ordersCompleted: number;
  totalOrdersReceived: number;
  totalOrdersCancelled: number;
  totalDefectsReported: number;
  totalOnTimeDeliveries: number;
  totalResponseTimeMinutes: number;
  responseCount: number;

  // Badges
  badges: IMerchantBadge[];

  // Bank details for payouts
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  paystackRecipientCode?: string;

  // Delivery settings
  deliveryAreas: string[];
  defaultDeliveryFee: number;
  freeDeliveryThreshold?: number;

  createdAt: Date;
  updatedAt: Date;
}

const merchantProfileSchema = new Schema<IMerchantProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: {
      type: String,
      required: true,
      enum: [
        'building-materials', 'electrical', 'plumbing', 'automotive',
        'hvac', 'tools', 'phone-parts', 'fabrics', 'general',
      ],
    },
    categories: [{
      type: String,
      enum: [
        'building-materials', 'electrical', 'plumbing', 'automotive',
        'hvac', 'tools', 'phone-parts', 'fabrics', 'general',
      ],
    }],
    description: { type: String, required: true, maxlength: 1000 },

    // Contact
    location: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },

    // Business details
    cacNumber: { type: String, trim: true },
    businessLogo: { type: String, trim: true },

    // Verification
    verificationStatus: {
      type: String,
      enum: ['pending', 'in-review', 'approved', 'rejected'],
      default: 'pending',
    },
    isPublished: { type: Boolean, default: false },
    isProfileComplete: { type: Boolean, default: false },

    // Trust metrics
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    trustLevel: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    fulfillmentRate: { type: Number, default: 0, min: 0, max: 100 },
    onTimeDeliveryRate: { type: Number, default: 0, min: 0, max: 100 },
    defectRate: { type: Number, default: 0, min: 0, max: 100 },
    responseTime: { type: Number, default: 0, min: 0 },

    // Stats
    ordersCompleted: { type: Number, default: 0, min: 0 },
    totalOrdersReceived: { type: Number, default: 0, min: 0 },
    totalOrdersCancelled: { type: Number, default: 0, min: 0 },
    totalDefectsReported: { type: Number, default: 0, min: 0 },
    totalOnTimeDeliveries: { type: Number, default: 0, min: 0 },
    totalResponseTimeMinutes: { type: Number, default: 0, min: 0 },
    responseCount: { type: Number, default: 0, min: 0 },

    // Badges
    badges: [{
      type: {
        type: String,
        enum: [
          'first_order', 'orders_10', 'orders_50', 'orders_100',
          'five_star_average', 'quick_responder', 'defect_free', 'always_on_time',
        ],
        required: true,
      },
      earnedAt: { type: Date, default: Date.now },
      details: String,
    }],

    // Bank details for payouts
    bankCode: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    accountName: { type: String, trim: true },
    paystackRecipientCode: { type: String, trim: true },

    // Delivery settings
    deliveryAreas: [{ type: String, trim: true }],
    defaultDeliveryFee: { type: Number, default: 0, min: 0 },
    freeDeliveryThreshold: { type: Number, min: 0 },
  },
  { timestamps: true }
);

// Indexes
merchantProfileSchema.index({ category: 1, location: 1 });
merchantProfileSchema.index({ slug: 1 });
merchantProfileSchema.index({ isPublished: 1, verificationStatus: 1 });
merchantProfileSchema.index({ averageRating: -1 });
merchantProfileSchema.index({ trustScore: -1 });
merchantProfileSchema.index({ trustLevel: 1 });
merchantProfileSchema.index({ categories: 1 });
merchantProfileSchema.index(
  { businessName: 'text', category: 'text', location: 'text', description: 'text' },
  { name: 'merchant_text_search' }
);

// Pre-save hook to calculate isProfileComplete
merchantProfileSchema.pre('save', function (next) {
  this.isProfileComplete = !!(
    this.businessName &&
    this.category &&
    this.description &&
    this.location &&
    this.address &&
    this.whatsappNumber &&
    this.phoneNumber
  );
  next();
});

export const MerchantProfile = mongoose.model<IMerchantProfile>('MerchantProfile', merchantProfileSchema);
