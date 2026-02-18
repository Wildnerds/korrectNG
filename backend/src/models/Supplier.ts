import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  user: mongoose.Types.ObjectId;
  businessName: string;
  slug: string;

  // Business details
  description?: string;
  trades: string[]; // Which trades they supply parts for
  categories: string[]; // Part categories they stock

  // Contact
  phone: string;
  whatsapp?: string;
  email?: string;

  // Location
  location: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };

  // Verification
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;

  // Stats
  totalItemsListed: number;
  lastPriceUpdate?: Date;
  priceUpdateFrequency: number; // Average days between updates

  // Status
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true },

    description: { type: String, maxlength: 500 },
    trades: [{
      type: String,
      enum: [
        'mechanic', 'electrician', 'plumber', 'ac-tech',
        'generator-tech', 'phone-repair', 'tailor',
        'carpenter', 'painter', 'welder', 'general'
      ],
    }],
    categories: [String],

    phone: { type: String, required: true },
    whatsapp: String,
    email: String,

    location: { type: String, required: true },
    address: { type: String, required: true },
    coordinates: {
      lat: Number,
      lng: Number,
    },

    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    totalItemsListed: { type: Number, default: 0 },
    lastPriceUpdate: Date,
    priceUpdateFrequency: { type: Number, default: 7 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

supplierSchema.index({ trades: 1 });
supplierSchema.index({ location: 1 });
supplierSchema.index({ isVerified: 1, isActive: 1 });
supplierSchema.index({ businessName: 'text', location: 'text' });

const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);

export default Supplier;
