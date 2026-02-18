import mongoose, { Schema, Document } from 'mongoose';
import { ArtisanProfile } from './ArtisanProfile';

export interface IReview extends Document {
  artisan: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  rating: number;
  title: string;
  text: string;
  jobType: string;
  artisanResponse?: string;
  artisanRespondedAt?: Date;
  isFlagged: boolean;
  flagReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    artisan: { type: Schema.Types.ObjectId, ref: 'ArtisanProfile', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    text: { type: String, required: true, maxlength: 1000 },
    jobType: { type: String, required: true, trim: true },
    artisanResponse: String,
    artisanRespondedAt: Date,
    isFlagged: { type: Boolean, default: false },
    flagReason: String,
  },
  { timestamps: true }
);

reviewSchema.index({ artisan: 1, createdAt: -1 });
reviewSchema.index({ customer: 1 });
reviewSchema.index({ artisan: 1, customer: 1 }, { unique: true });

// Static method to calculate average rating
reviewSchema.statics.calcAverageRating = async function (artisanId: mongoose.Types.ObjectId) {
  const result = await this.aggregate([
    { $match: { artisan: artisanId, isFlagged: false } },
    {
      $group: {
        _id: '$artisan',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await ArtisanProfile.findByIdAndUpdate(artisanId, {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalReviews: result[0].totalReviews,
    });
  } else {
    await ArtisanProfile.findByIdAndUpdate(artisanId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

reviewSchema.post('save', async function () {
  await (this.constructor as any).calcAverageRating(this.artisan);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await (mongoose.model('Review') as any).calcAverageRating(doc.artisan);
  }
});

export const Review = mongoose.model<IReview>('Review', reviewSchema);
