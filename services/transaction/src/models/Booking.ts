import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  customer: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  artisanProfile: mongoose.Types.ObjectId;
  service: string;
  description: string;
  proposedDate: Date;
  proposedTime: string;
  location: string;
  estimatedPrice?: number;
  finalPrice?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'payment_pending' | 'paid' | 'in_progress' | 'completed' | 'confirmed' | 'cancelled';
  customerNotes?: string;
  artisanNotes?: string;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: 'customer' | 'artisan';
  cancellationReason?: string;
  contract?: mongoose.Types.ObjectId;
  escrow?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    artisan: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    artisanProfile: { type: Schema.Types.ObjectId, ref: 'ArtisanProfile', required: true },
    service: { type: String, required: true, trim: true },
    description: { type: String, required: true, maxlength: 1000 },
    proposedDate: { type: Date, required: true },
    proposedTime: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    estimatedPrice: { type: Number, min: 0 },
    finalPrice: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'payment_pending', 'paid', 'in_progress', 'completed', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    customerNotes: String,
    artisanNotes: String,
    acceptedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: { type: String, enum: ['customer', 'artisan'] },
    cancellationReason: String,
    contract: { type: Schema.Types.ObjectId, ref: 'JobContract' },
    escrow: { type: Schema.Types.ObjectId, ref: 'EscrowPayment' },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ artisan: 1, status: 1 });
bookingSchema.index({ artisanProfile: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
