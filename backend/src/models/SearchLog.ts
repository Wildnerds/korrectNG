import mongoose, { Schema, Document } from 'mongoose';

export interface ISearchLog extends Document {
  trade?: string;
  location?: string;
  query?: string;
  resultsCount: number;
  source: 'web' | 'mobile';
  createdAt: Date;
}

const searchLogSchema = new Schema<ISearchLog>(
  {
    trade: String,
    location: String,
    query: String,
    resultsCount: { type: Number, required: true, default: 0 },
    source: { type: String, enum: ['web', 'mobile'], required: true },
  },
  { timestamps: true }
);

// TTL index: auto-delete after 90 days
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
searchLogSchema.index({ trade: 1, location: 1 });

export const SearchLog = mongoose.model<ISearchLog>('SearchLog', searchLogSchema);
