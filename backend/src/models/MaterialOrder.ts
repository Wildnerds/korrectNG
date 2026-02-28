import mongoose, { Document, Schema } from 'mongoose';

export type MaterialOrderStatus =
  | 'pending_artisan_approval'  // Customer selected items, waiting for artisan to verify
  | 'pending'                   // Artisan approved, waiting for merchant to confirm
  | 'confirmed'                 // Merchant confirmed availability
  | 'payment_pending'           // Awaiting payment
  | 'paid'                      // Paid, in escrow
  | 'preparing'                 // Merchant preparing
  | 'shipped'                   // Out for delivery
  | 'delivered'                 // Delivered to artisan
  | 'received'                  // Artisan confirmed receipt & item intact
  | 'completed'                 // Payment released to merchant
  | 'disputed'                  // Dispute raised
  | 'cancelled'                 // Cancelled
  | 'refunded';                 // Refunded

export type DeliveryType = 'artisan_location' | 'job_site' | 'customer_address' | 'pickup';

export interface IMaterialOrderItem {
  product: mongoose.Types.ObjectId;
  productSnapshot: {
    name: string;
    price: number;
    unit: string;
    merchantId: mongoose.Types.ObjectId;
    merchantName: string;
    image?: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IStatusHistory {
  status: MaterialOrderStatus;
  timestamp: Date;
  note?: string;
  by: mongoose.Types.ObjectId;
}

export interface IMaterialOrder extends Document {
  orderNumber: string;

  // Parties
  customer: mongoose.Types.ObjectId;
  merchant: mongoose.Types.ObjectId;
  merchantProfile: mongoose.Types.ObjectId;
  booking?: mongoose.Types.ObjectId;
  artisan?: mongoose.Types.ObjectId;

  // Items
  items: IMaterialOrderItem[];

  // Pricing
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  platformFee: number;
  merchantEarnings: number;

  // Delivery
  deliveryType: DeliveryType;
  deliveryAddress: string;
  deliveryInstructions?: string;
  scheduledDeliveryDate?: Date;

  // Status
  status: MaterialOrderStatus;
  statusHistory: IStatusHistory[];

  // Timestamps
  artisanApprovedAt?: Date;
  confirmedAt?: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  receivedAt?: Date;
  completedAt?: Date;

  // Artisan approval (verifies item is correct before order proceeds)
  artisanApprovalStatus?: 'pending' | 'approved' | 'rejected';
  artisanApprovalNote?: string;

  // Confirmation (artisan confirms receipt)
  receivedBy?: mongoose.Types.ObjectId;
  receivedByType?: 'customer' | 'artisan';
  receiptNote?: string;

  // Defects
  hasDefect: boolean;
  defectReportedAt?: Date;
  defectDescription?: string;
  defectImages?: string[];
  replacementOrderId?: mongoose.Types.ObjectId;

  // Payment
  escrow?: mongoose.Types.ObjectId;
  paymentReference: string;
  paystackReference?: string;

  // Auto-expiry
  expiresAt?: Date;

  // Conversation
  conversation?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const materialOrderItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productSnapshot: {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    unit: { type: String, required: true },
    merchantId: { type: Schema.Types.ObjectId, required: true },
    merchantName: { type: String, required: true },
    image: String,
  },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
}, { _id: false });

const materialOrderSchema = new Schema<IMaterialOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      // Not required - auto-generated in pre-save hook
    },

    // Parties
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    merchantProfile: {
      type: Schema.Types.ObjectId,
      ref: 'MerchantProfile',
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Items
    items: [materialOrderItemSchema],

    // Pricing (all in Naira)
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, default: 0, min: 0 },
    merchantEarnings: { type: Number, default: 0, min: 0 },

    // Delivery
    deliveryType: {
      type: String,
      enum: ['artisan_location', 'job_site', 'customer_address', 'pickup'],
      required: true,
    },
    deliveryAddress: { type: String, required: true, maxlength: 500 },
    deliveryInstructions: { type: String, maxlength: 500 },
    scheduledDeliveryDate: Date,

    // Status
    status: {
      type: String,
      enum: [
        'pending_artisan_approval', 'pending', 'confirmed', 'payment_pending', 'paid', 'preparing',
        'shipped', 'delivered', 'received', 'completed', 'disputed',
        'cancelled', 'refunded',
      ],
      default: 'pending_artisan_approval',
      index: true,
    },
    statusHistory: [{
      status: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      note: String,
      by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    }],

    // Timestamps
    artisanApprovedAt: Date,
    confirmedAt: Date,
    paidAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    receivedAt: Date,
    completedAt: Date,

    // Artisan approval (verifies item is correct before order proceeds)
    artisanApprovalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    artisanApprovalNote: { type: String, maxlength: 500 },

    // Confirmation (artisan confirms receipt)
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedByType: { type: String, enum: ['customer', 'artisan'] },
    receiptNote: { type: String, maxlength: 500 },

    // Defects
    hasDefect: { type: Boolean, default: false },
    defectReportedAt: Date,
    defectDescription: { type: String, maxlength: 1000 },
    defectImages: [String],
    replacementOrderId: { type: Schema.Types.ObjectId, ref: 'MaterialOrder' },

    // Payment
    escrow: { type: Schema.Types.ObjectId, ref: 'MaterialEscrow' },
    paymentReference: {
      type: String,
      unique: true,
      sparse: true,
    },
    paystackReference: String,

    // Auto-expiry
    expiresAt: { type: Date, index: true },

    // Conversation
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  },
  { timestamps: true }
);

// Indexes
materialOrderSchema.index({ customer: 1, status: 1 });
materialOrderSchema.index({ merchant: 1, status: 1 });
materialOrderSchema.index({ merchantProfile: 1, status: 1 });
materialOrderSchema.index({ booking: 1 });
materialOrderSchema.index({ orderNumber: 1 });
materialOrderSchema.index({ createdAt: -1 });

// Generate unique order number
materialOrderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `MO-${timestamp}${random}`;
  }
  next();
});

// Generate unique payment reference
materialOrderSchema.pre('save', function (next) {
  if (!this.paymentReference) {
    this.paymentReference = `MOP${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

// Calculate platform fee and merchant earnings when totalAmount is set
// Merchant platform fee is 5% (lower than artisan's 10%)
materialOrderSchema.pre('save', function (next) {
  if (this.totalAmount && this.isModified('totalAmount')) {
    this.platformFee = Math.round(this.totalAmount * 0.05); // 5% platform fee for merchants
    this.merchantEarnings = this.totalAmount - this.platformFee;
  }
  next();
});

// Add to status history when status changes
materialOrderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      by: (this as any)._statusChangedBy || this.customer,
    });

    // Set timestamps based on status
    const now = new Date();
    switch (this.status) {
      case 'pending':
        // Moving from pending_artisan_approval to pending means artisan approved
        this.artisanApprovedAt = now;
        this.artisanApprovalStatus = 'approved';
        break;
      case 'confirmed':
        this.confirmedAt = now;
        break;
      case 'paid':
        this.paidAt = now;
        break;
      case 'shipped':
        this.shippedAt = now;
        break;
      case 'delivered':
        this.deliveredAt = now;
        break;
      case 'received':
        this.receivedAt = now;
        break;
      case 'completed':
        this.completedAt = now;
        break;
    }

    // Set auto-expiry based on status
    if (this.status === 'pending_artisan_approval') {
      // Artisan has 24 hours to approve/reject
      this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (this.status === 'pending') {
      // Merchant has 24 hours to confirm
      this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (this.status === 'confirmed') {
      // Customer has 24 hours to pay
      this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (this.status === 'delivered') {
      // Auto-confirm receipt after 72 hours if no action
      this.expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    } else {
      // Clear expiry for other statuses
      this.expiresAt = undefined;
    }
  }
  next();
});

// Static method to get order stats for a merchant
materialOrderSchema.statics.getMerchantStats = async function (merchantProfileId: string) {
  const stats = await this.aggregate([
    { $match: { merchantProfile: new mongoose.Types.ObjectId(merchantProfileId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEarnings: { $sum: '$merchantEarnings' },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = { count: stat.count, earnings: stat.totalEarnings };
    return acc;
  }, {} as Record<string, { count: number; earnings: number }>);
};

export const MaterialOrder = mongoose.model<IMaterialOrder>('MaterialOrder', materialOrderSchema);
