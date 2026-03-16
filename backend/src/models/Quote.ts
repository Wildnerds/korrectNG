import mongoose, { Document, Schema } from 'mongoose';

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'superseded';

export interface IQuotePreviousVersion {
  labourCharge: number;
  materialsEstimate?: number;
  totalAmount: number;
  platformFee: number;
  artisanEarnings: number;
  message?: string;
  createdAt: Date;
}

export interface IQuote extends Document {
  booking: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  artisanProfile: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;

  // Pricing structure
  labourCharge: number;           // Min 10% of totalAmount, min 1000 Naira
  materialsEstimate?: number;     // Optional (customer doesn't see breakdown)
  totalAmount: number;            // labourCharge + materialsEstimate

  // Platform fee = 10% of labourCharge ONLY
  platformFee: number;
  artisanEarnings: number;        // totalAmount - platformFee

  message?: string;
  estimatedDuration?: string;
  externalSourcingRequired: boolean;  // For materials outside platform

  // Versioning for negotiations
  version: number;
  previousVersions: IQuotePreviousVersion[];

  // Status
  status: QuoteStatus;
  expiresAt?: Date;  // 48h from creation

  createdAt: Date;
  updatedAt: Date;
}

const previousVersionSchema = new Schema<IQuotePreviousVersion>(
  {
    labourCharge: { type: Number, required: true },
    materialsEstimate: { type: Number },
    totalAmount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    artisanEarnings: { type: Number, required: true },
    message: { type: String, maxlength: 1000 },
    createdAt: { type: Date, required: true },
  },
  { _id: false }
);

const quoteSchema = new Schema<IQuote>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artisanProfile: {
      type: Schema.Types.ObjectId,
      ref: 'ArtisanProfile',
      required: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },

    // Pricing (all in Naira)
    labourCharge: {
      type: Number,
      required: true,
      min: [1000, 'Labour charge must be at least ₦1,000'],
    },
    materialsEstimate: {
      type: Number,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [1000, 'Total amount must be at least ₦1,000'],
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    artisanEarnings: {
      type: Number,
      required: true,
      min: 0,
    },

    message: {
      type: String,
      maxlength: 1000,
    },
    estimatedDuration: {
      type: String,
      maxlength: 100,
    },
    externalSourcingRequired: {
      type: Boolean,
      default: false,
    },

    // Versioning
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    previousVersions: [previousVersionSchema],

    // Status
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'superseded'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
quoteSchema.index({ booking: 1, artisan: 1 });
quoteSchema.index({ booking: 1, status: 1 });
quoteSchema.index({ artisan: 1, status: 1 });
quoteSchema.index({ createdAt: -1 });

// Validate labour charge is at least 10% of total
quoteSchema.pre('validate', function (next) {
  if (this.totalAmount && this.labourCharge) {
    const minLabourCharge = this.totalAmount * 0.10;
    if (this.labourCharge < minLabourCharge) {
      this.invalidate('labourCharge', `Labour charge must be at least 10% of total amount (₦${Math.ceil(minLabourCharge).toLocaleString()})`);
    }
  }
  next();
});

// Calculate platform fee and artisan earnings before save
quoteSchema.pre('save', function (next) {
  // Platform fee is 10% of labour charge only
  this.platformFee = Math.round(this.labourCharge * 0.10);
  this.artisanEarnings = this.totalAmount - this.platformFee;

  // Set expiry if not set (48 hours from creation)
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  }

  next();
});

// Calculate total from labour + materials if materials provided
quoteSchema.pre('save', function (next) {
  if (this.isModified('labourCharge') || this.isModified('materialsEstimate')) {
    this.totalAmount = this.labourCharge + (this.materialsEstimate || 0);
  }
  next();
});

// Static method to get active quotes for a booking
quoteSchema.statics.getQuotesForBooking = async function (bookingId: string) {
  return this.find({
    booking: bookingId,
    status: { $in: ['pending', 'accepted'] },
  })
    .populate('artisan', 'firstName lastName avatar')
    .populate('artisanProfile', 'businessName slug trade rating reviewCount')
    .sort({ createdAt: -1 })
    .lean();
};

// Static method to get quotes by artisan
quoteSchema.statics.getQuotesByArtisan = async function (
  artisanId: string,
  status?: QuoteStatus,
  limit: number = 20,
  skip: number = 0
) {
  const query: any = { artisan: artisanId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('booking', 'jobType description location status')
    .populate('artisanProfile', 'businessName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Instance method to create a revision
quoteSchema.methods.createRevision = function (
  newLabourCharge: number,
  newMaterialsEstimate?: number,
  newMessage?: string
) {
  // Store current version in history
  this.previousVersions.push({
    labourCharge: this.labourCharge,
    materialsEstimate: this.materialsEstimate,
    totalAmount: this.totalAmount,
    platformFee: this.platformFee,
    artisanEarnings: this.artisanEarnings,
    message: this.message,
    createdAt: new Date(),
  });

  // Update to new values
  this.labourCharge = newLabourCharge;
  this.materialsEstimate = newMaterialsEstimate;
  this.totalAmount = newLabourCharge + (newMaterialsEstimate || 0);
  if (newMessage !== undefined) {
    this.message = newMessage;
  }
  this.version += 1;

  // Reset expiry (48h from revision)
  this.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
};

const Quote = mongoose.model<IQuote>('Quote', quoteSchema);

export default Quote;
