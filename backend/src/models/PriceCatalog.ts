import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceSource {
  name: string;
  type: 'supplier' | 'ecommerce' | 'crowdsourced' | 'manual';
  price: number;
  url?: string;
  lastUpdated: Date;
  isVerified: boolean;
}

export interface IPriceHistory {
  price: number;
  minPrice: number;
  maxPrice: number;
  recordedAt: Date;
  forexRate?: number;
}

export interface IPriceCatalogItem extends Document {
  name: string;
  slug: string;
  category: string;
  subcategory?: string;
  trade: string;

  // Item details
  description?: string;
  brand?: string;
  partNumber?: string;
  compatibleWith?: string[]; // e.g., ["Toyota Camry 2015-2020", "Honda Accord 2018+"]

  // Quality tiers
  qualityTier: 'budget' | 'standard' | 'premium' | 'oem';

  // Pricing
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  currency: string;

  // Price sources
  sources: IPriceSource[];
  sourceCount: number;

  // Forex adjustment
  basePrice: number; // Price in USD for forex adjustment
  lastForexRate: number;
  forexAdjustedAt: Date;

  // History
  priceHistory: IPriceHistory[];

  // Metadata
  isActive: boolean;
  lastVerifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const priceSourceSchema = new Schema<IPriceSource>({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['supplier', 'ecommerce', 'crowdsourced', 'manual'],
    required: true
  },
  price: { type: Number, required: true, min: 0 },
  url: String,
  lastUpdated: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
}, { _id: false });

const priceHistorySchema = new Schema<IPriceHistory>({
  price: { type: Number, required: true },
  minPrice: { type: Number, required: true },
  maxPrice: { type: Number, required: true },
  recordedAt: { type: Date, default: Date.now },
  forexRate: Number,
}, { _id: false });

const priceCatalogSchema = new Schema<IPriceCatalogItem>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, required: true, trim: true },
    subcategory: { type: String, trim: true },
    trade: {
      type: String,
      required: true,
      enum: [
        'mechanic', 'electrician', 'plumber', 'ac-tech',
        'generator-tech', 'phone-repair', 'tailor',
        'carpenter', 'painter', 'welder', 'general'
      ],
    },

    description: { type: String, maxlength: 500 },
    brand: String,
    partNumber: String,
    compatibleWith: [String],

    qualityTier: {
      type: String,
      enum: ['budget', 'standard', 'premium', 'oem'],
      default: 'standard',
    },

    currentPrice: { type: Number, required: true, min: 0 },
    minPrice: { type: Number, required: true, min: 0 },
    maxPrice: { type: Number, required: true, min: 0 },
    averagePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN' },

    sources: [priceSourceSchema],
    sourceCount: { type: Number, default: 0 },

    basePrice: { type: Number, min: 0 }, // USD base for forex
    lastForexRate: { type: Number },
    forexAdjustedAt: Date,

    priceHistory: [priceHistorySchema],

    isActive: { type: Boolean, default: true },
    lastVerifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes
priceCatalogSchema.index({ trade: 1, category: 1 });
priceCatalogSchema.index({ name: 'text', category: 'text', brand: 'text' });
priceCatalogSchema.index({ slug: 1 });
priceCatalogSchema.index({ isActive: 1 });
priceCatalogSchema.index({ qualityTier: 1 });

// Pre-save: calculate averages and update source count
priceCatalogSchema.pre('save', function(next) {
  if (this.sources && this.sources.length > 0) {
    const prices = this.sources.map(s => s.price);
    this.minPrice = Math.min(...prices);
    this.maxPrice = Math.max(...prices);
    this.averagePrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    this.currentPrice = this.averagePrice;
    this.sourceCount = this.sources.length;
  }
  next();
});

// Static: Search items by name
priceCatalogSchema.statics.searchItems = async function(
  query: string,
  trade?: string,
  limit: number = 10
) {
  const filter: any = {
    isActive: true,
    $text: { $search: query },
  };

  if (trade) {
    filter.trade = trade;
  }

  return this.find(filter)
    .select('name category brand qualityTier currentPrice minPrice maxPrice sourceCount')
    .limit(limit)
    .sort({ score: { $meta: 'textScore' } });
};

// Static: Get price comparison
priceCatalogSchema.statics.getPriceComparison = async function(
  itemName: string,
  quotedPrice: number,
  trade?: string
) {
  const items = await this.find({
    isActive: true,
    $text: { $search: itemName },
    ...(trade && { trade }),
  })
    .select('name category qualityTier currentPrice minPrice maxPrice averagePrice sourceCount sources')
    .limit(5);

  if (items.length === 0) {
    return null;
  }

  // Find best match
  const bestMatch = items[0];

  // Calculate price status
  let status: 'fair' | 'slightly_high' | 'high' | 'very_high' | 'below_market';
  let percentageDiff = ((quotedPrice - bestMatch.averagePrice) / bestMatch.averagePrice) * 100;

  if (quotedPrice < bestMatch.minPrice) {
    status = 'below_market';
  } else if (quotedPrice <= bestMatch.averagePrice * 1.1) {
    status = 'fair';
  } else if (quotedPrice <= bestMatch.averagePrice * 1.25) {
    status = 'slightly_high';
  } else if (quotedPrice <= bestMatch.averagePrice * 1.5) {
    status = 'high';
  } else {
    status = 'very_high';
  }

  return {
    item: bestMatch,
    quotedPrice,
    marketRange: {
      min: bestMatch.minPrice,
      max: bestMatch.maxPrice,
      average: bestMatch.averagePrice,
    },
    status,
    percentageDiff: Math.round(percentageDiff),
    sourceCount: bestMatch.sourceCount,
  };
};

export interface IPriceCatalogModel extends mongoose.Model<IPriceCatalogItem> {
  searchItems(query: string, trade?: string, limit?: number): Promise<IPriceCatalogItem[]>;
  getPriceComparison(itemName: string, quotedPrice: number, trade?: string): Promise<any>;
}

const PriceCatalog = mongoose.model<IPriceCatalogItem, IPriceCatalogModel>(
  'PriceCatalog',
  priceCatalogSchema
);

export default PriceCatalog;
