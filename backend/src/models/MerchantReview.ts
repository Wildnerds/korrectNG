import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchantReview extends Document {
  merchant: mongoose.Types.ObjectId;
  merchantProfile: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;

  rating: number;
  title?: string;
  text: string;

  // Sub-ratings
  productQualityRating: number;
  deliveryRating: number;

  // Response
  merchantResponse?: string;
  merchantRespondedAt?: Date;

  // Moderation
  isVisible: boolean;
  isFlagged: boolean;
  flagReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const merchantReviewSchema = new Schema<IMerchantReview>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    merchantProfile: { type: Schema.Types.ObjectId, ref: 'MerchantProfile', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'MaterialOrder', required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 100 },
    text: { type: String, required: true, maxlength: 1000 },

    // Sub-ratings
    productQualityRating: { type: Number, required: true, min: 1, max: 5 },
    deliveryRating: { type: Number, required: true, min: 1, max: 5 },

    // Response
    merchantResponse: String,
    merchantRespondedAt: Date,

    // Moderation
    isVisible: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    flagReason: String,
  },
  { timestamps: true }
);

// Indexes
merchantReviewSchema.index({ merchantProfile: 1, createdAt: -1 });
merchantReviewSchema.index({ customer: 1 });
merchantReviewSchema.index({ order: 1 }, { unique: true }); // One review per order
merchantReviewSchema.index({ merchantProfile: 1, customer: 1 });

// Static method to calculate average rating for merchant
merchantReviewSchema.statics.calcAverageRating = async function (merchantProfileId: mongoose.Types.ObjectId) {
  const result = await this.aggregate([
    { $match: { merchantProfile: merchantProfileId, isFlagged: false, isVisible: true } },
    {
      $group: {
        _id: '$merchantProfile',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const MerchantProfile = mongoose.model('MerchantProfile');
  if (result.length > 0) {
    await MerchantProfile.findByIdAndUpdate(merchantProfileId, {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalReviews: result[0].totalReviews,
    });
  } else {
    await MerchantProfile.findByIdAndUpdate(merchantProfileId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

// Update merchant rating after save
merchantReviewSchema.post('save', async function () {
  await (this.constructor as any).calcAverageRating(this.merchantProfile);
});

// Update merchant rating after delete
merchantReviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await (mongoose.model('MerchantReview') as any).calcAverageRating(doc.merchantProfile);
  }
});

export const MerchantReview = mongoose.model<IMerchantReview>('MerchantReview', merchantReviewSchema);
