import mongoose, { Schema, Document } from 'mongoose';

export type ProductUnit = 'piece' | 'bag' | 'roll' | 'meter' | 'kg' | 'litre' | 'pack' | 'set' | 'pair';

export type TradeValue =
  | 'mechanic' | 'electrician' | 'plumber' | 'ac-tech'
  | 'generator-tech' | 'phone-repair' | 'tailor'
  | 'carpenter' | 'painter' | 'welder';

export interface IBulkDiscount {
  qty: number;
  price: number;
}

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface IProduct extends Document {
  merchant: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: string;
  subcategory?: string;

  // Pricing
  price: number;
  unit: ProductUnit;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  bulkDiscounts: IBulkDiscount[];

  // Details
  brand?: string;
  sku?: string;
  specifications: Map<string, string>;
  images: IProductImage[];

  // Inventory
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;

  // Status
  isActive: boolean;
  isApproved: boolean;

  // Search
  tags: string[];
  compatibleTrades: TradeValue[];

  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'MerchantProfile', required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, lowercase: true },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, required: true, trim: true },
    subcategory: { type: String, trim: true },

    // Pricing
    price: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      required: true,
      enum: ['piece', 'bag', 'roll', 'meter', 'kg', 'litre', 'pack', 'set', 'pair'],
    },
    minOrderQuantity: { type: Number, default: 1, min: 1 },
    maxOrderQuantity: { type: Number, min: 1 },
    bulkDiscounts: [{
      qty: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    }],

    // Details
    brand: { type: String, trim: true, maxlength: 100 },
    sku: { type: String, trim: true, maxlength: 50 },
    specifications: { type: Map, of: String },
    images: [{
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    }],

    // Inventory
    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    trackInventory: { type: Boolean, default: true },

    // Status
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },

    // Search
    tags: [{ type: String, trim: true, maxlength: 50 }],
    compatibleTrades: [{
      type: String,
      enum: [
        'mechanic', 'electrician', 'plumber', 'ac-tech',
        'generator-tech', 'phone-repair', 'tailor',
        'carpenter', 'painter', 'welder',
      ],
    }],
  },
  { timestamps: true }
);

// Compound unique index for slug per merchant
productSchema.index({ merchant: 1, slug: 1 }, { unique: true });

// Search and filter indexes
productSchema.index({ merchant: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1, isApproved: 1 });
productSchema.index({ compatibleTrades: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1, isApproved: 1, stockQuantity: 1 });
productSchema.index(
  { name: 'text', description: 'text', tags: 'text', brand: 'text' },
  { name: 'product_text_search' }
);

// Virtual for checking if in stock
productSchema.virtual('isInStock').get(function () {
  if (!this.trackInventory) return true;
  return this.stockQuantity > 0;
});

// Virtual for checking if low stock
productSchema.virtual('isLowStock').get(function () {
  if (!this.trackInventory) return false;
  return this.stockQuantity > 0 && this.stockQuantity <= this.lowStockThreshold;
});

// Method to calculate price for quantity (with bulk discounts)
productSchema.methods.getPriceForQuantity = function (quantity: number): number {
  if (!this.bulkDiscounts || this.bulkDiscounts.length === 0) {
    return this.price * quantity;
  }

  // Sort bulk discounts by quantity descending
  const sortedDiscounts = [...this.bulkDiscounts].sort((a, b) => b.qty - a.qty);

  // Find applicable discount
  for (const discount of sortedDiscounts) {
    if (quantity >= discount.qty) {
      return discount.price * quantity;
    }
  }

  return this.price * quantity;
};

// Static method to generate slug
productSchema.statics.generateSlug = function (name: string, merchantId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
};

export const Product = mongoose.model<IProduct>('Product', productSchema);
