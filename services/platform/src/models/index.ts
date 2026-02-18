import mongoose, { Schema, Document, Types } from 'mongoose';

// ============ Notification Model ============

export interface INotification extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: ('push' | 'sms' | 'email' | 'in_app')[];
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  metadata?: {
    bookingId?: string;
    contractId?: string;
    disputeId?: string;
    artisanId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    channels: [{
      type: String,
      enum: ['push', 'sms', 'email', 'in_app'],
    }],
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
      default: 'pending',
    },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    failureReason: String,
    metadata: {
      bookingId: String,
      contractId: String,
      disputeId: String,
      artisanId: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching user notifications
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, status: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// ============ SearchLog Model ============

export interface ISearchLog extends Document {
  _id: Types.ObjectId;
  user?: Types.ObjectId;
  sessionId?: string;
  query: string;
  filters?: {
    category?: string;
    location?: string;
    priceRange?: { min?: number; max?: number };
    rating?: number;
    verified?: boolean;
  };
  resultsCount: number;
  clickedResults?: Types.ObjectId[];
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    city?: string;
    state?: string;
  };
  deviceInfo?: {
    platform?: string;
    userAgent?: string;
  };
  createdAt: Date;
}

const SearchLogSchema = new Schema<ISearchLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    sessionId: String,
    query: {
      type: String,
      required: true,
      index: true,
    },
    filters: {
      category: String,
      location: String,
      priceRange: {
        min: Number,
        max: Number,
      },
      rating: Number,
      verified: Boolean,
    },
    resultsCount: {
      type: Number,
      default: 0,
    },
    clickedResults: [Schema.Types.ObjectId],
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: [Number],
      city: String,
      state: String,
    },
    deviceInfo: {
      platform: String,
      userAgent: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SearchLogSchema.index({ query: 'text' });
SearchLogSchema.index({ createdAt: -1 });

export const SearchLog = mongoose.model<ISearchLog>('SearchLog', SearchLogSchema);

// ============ TermsAcceptance Model ============

export interface ITermsAcceptance extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  termsVersion: string;
  termsType: 'terms_of_service' | 'privacy_policy' | 'artisan_agreement' | 'customer_agreement';
  acceptedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

const TermsAcceptanceSchema = new Schema<ITermsAcceptance>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    termsVersion: {
      type: String,
      required: true,
    },
    termsType: {
      type: String,
      enum: ['terms_of_service', 'privacy_policy', 'artisan_agreement', 'customer_agreement'],
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: false,
  }
);

TermsAcceptanceSchema.index({ user: 1, termsType: 1 });

export const TermsAcceptance = mongoose.model<ITermsAcceptance>('TermsAcceptance', TermsAcceptanceSchema);

// ============ PriceCatalog Model ============

export interface IPriceCatalog extends Document {
  _id: Types.ObjectId;
  category: string;
  subcategory?: string;
  serviceName: string;
  description?: string;
  basePrice: number;
  unit: 'fixed' | 'hourly' | 'daily' | 'per_sqm' | 'per_item';
  priceRange?: {
    min: number;
    max: number;
  };
  factors?: {
    name: string;
    multiplier: number;
    description?: string;
  }[];
  location?: string;
  isActive: boolean;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PriceCatalogSchema = new Schema<IPriceCatalog>(
  {
    category: {
      type: String,
      required: true,
      index: true,
    },
    subcategory: String,
    serviceName: {
      type: String,
      required: true,
    },
    description: String,
    basePrice: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      enum: ['fixed', 'hourly', 'daily', 'per_sqm', 'per_item'],
      default: 'fixed',
    },
    priceRange: {
      min: Number,
      max: Number,
    },
    factors: [{
      name: { type: String, required: true },
      multiplier: { type: Number, required: true },
      description: String,
    }],
    location: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: Schema.Types.ObjectId,
  },
  {
    timestamps: true,
  }
);

PriceCatalogSchema.index({ category: 1, subcategory: 1 });
PriceCatalogSchema.index({ serviceName: 'text' });

export const PriceCatalog = mongoose.model<IPriceCatalog>('PriceCatalog', PriceCatalogSchema);

// ============ Supplier Model ============

export interface ISupplier extends Document {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone: string;
  address?: {
    street?: string;
    city: string;
    state: string;
    country: string;
  };
  categories: string[];
  products?: {
    name: string;
    sku?: string;
    price: number;
    unit: string;
    inStock: boolean;
  }[];
  rating?: number;
  isVerified: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      street: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, default: 'Nigeria' },
    },
    categories: [{
      type: String,
      index: true,
    }],
    products: [{
      name: { type: String, required: true },
      sku: String,
      price: { type: Number, required: true },
      unit: { type: String, required: true },
      inStock: { type: Boolean, default: true },
    }],
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

SupplierSchema.index({ name: 'text' });
SupplierSchema.index({ 'address.state': 1, categories: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
