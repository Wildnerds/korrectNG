import mongoose, { Document, Schema } from 'mongoose';

export type AdvanceRequestStatus = 'pending' | 'approved' | 'rejected' | 'released';

export interface IMaterialItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IMaterialsAdvanceRequest extends Document {
  escrow: mongoose.Types.ObjectId;
  contract?: mongoose.Types.ObjectId;
  booking: mongoose.Types.ObjectId;
  artisan: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;

  // Request details
  items: IMaterialItem[];
  totalAmount: number;
  reason: string;

  // Status
  status: AdvanceRequestStatus;
  requestedAt: Date;

  // Approval/Rejection
  respondedAt?: Date;
  respondedBy?: mongoose.Types.ObjectId;
  responseNote?: string;

  // Release tracking
  releasedAt?: Date;
  paystackTransferRef?: string;

  // Receipt/proof (after purchase)
  receiptUrl?: string;
  receiptUploadedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const materialItemSchema = new Schema<IMaterialItem>(
  {
    name: { type: String, required: true, maxlength: 100 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const materialsAdvanceRequestSchema = new Schema<IMaterialsAdvanceRequest>(
  {
    escrow: {
      type: Schema.Types.ObjectId,
      ref: 'EscrowPayment',
      required: true,
      index: true,
    },
    contract: {
      type: Schema.Types.ObjectId,
      ref: 'JobContract',
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    artisan: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Request details
    items: {
      type: [materialItemSchema],
      required: true,
      validate: {
        validator: (items: IMaterialItem[]) => items.length > 0 && items.length <= 20,
        message: 'Must have between 1 and 20 material items',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'released'],
      default: 'pending',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },

    // Approval/Rejection
    respondedAt: Date,
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    responseNote: {
      type: String,
      maxlength: 500,
    },

    // Release tracking
    releasedAt: Date,
    paystackTransferRef: String,

    // Receipt/proof
    receiptUrl: String,
    receiptUploadedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
materialsAdvanceRequestSchema.index({ escrow: 1, status: 1 });
materialsAdvanceRequestSchema.index({ artisan: 1, status: 1 });
materialsAdvanceRequestSchema.index({ customer: 1, status: 1 });

// Pre-save: Calculate total amount from items
materialsAdvanceRequestSchema.pre('save', function (next) {
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }
  next();
});

export const MaterialsAdvanceRequest = mongoose.model<IMaterialsAdvanceRequest>(
  'MaterialsAdvanceRequest',
  materialsAdvanceRequestSchema
);

export default MaterialsAdvanceRequest;
