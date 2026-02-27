import mongoose from 'mongoose';
import { MaterialEscrow, MaterialEscrowStatus, IMaterialEscrow } from '../models/MaterialEscrow';
import { MaterialOrder } from '../models/MaterialOrder';
import { MerchantProfile } from '../models/MerchantProfile';
import { createNotification } from './notifications';
import { log } from '../utils/logger';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Valid state transitions
const VALID_TRANSITIONS: Record<MaterialEscrowStatus, MaterialEscrowStatus[]> = {
  created: ['funded', 'refunded'],
  funded: ['release_requested', 'disputed', 'refunded'],
  release_requested: ['released', 'disputed'],
  released: [],
  disputed: ['released', 'refunded', 'partial_refund'],
  refunded: [],
  partial_refund: [],
};

/**
 * Check if a transition is valid
 */
export function canTransition(from: MaterialEscrowStatus, to: MaterialEscrowStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}

/**
 * Execute a state transition
 */
export async function transition(
  escrowId: string,
  to: MaterialEscrowStatus,
  by: mongoose.Types.ObjectId,
  note?: string
): Promise<IMaterialEscrow> {
  const escrow = await MaterialEscrow.findById(escrowId);

  if (!escrow) {
    throw new Error('Material escrow not found');
  }

  if (!canTransition(escrow.status, to)) {
    throw new Error(`Invalid transition from ${escrow.status} to ${to}`);
  }

  escrow.setStatus(to, by, note);
  await escrow.save();

  log.info('Material escrow state transition', {
    escrowId,
    from: escrow.statusHistory[escrow.statusHistory.length - 2]?.status,
    to,
    by: by.toString(),
  });

  return escrow;
}

/**
 * Create escrow for a material order
 */
export async function createMaterialEscrow(
  orderId: string,
  by: mongoose.Types.ObjectId
): Promise<IMaterialEscrow> {
  const order = await MaterialOrder.findById(orderId);

  if (!order) {
    throw new Error('Material order not found');
  }

  if (order.status !== 'confirmed') {
    throw new Error('Order must be confirmed before creating escrow');
  }

  // Check if escrow already exists
  const existingEscrow = await MaterialEscrow.findOne({ order: orderId });
  if (existingEscrow) {
    throw new Error('Escrow already exists for this order');
  }

  const escrow = await MaterialEscrow.create({
    order: orderId,
    customer: order.customer,
    merchant: order.merchant,
    merchantProfile: order.merchantProfile,
    totalAmount: order.totalAmount,
    platformFee: order.platformFee,
    status: 'created',
    statusHistory: [{
      status: 'created',
      timestamp: new Date(),
      by,
    }],
  });

  // Update order with escrow reference
  order.escrow = escrow._id as mongoose.Types.ObjectId;
  order.status = 'payment_pending';
  (order as any)._statusChangedBy = by;
  await order.save();

  log.info('Material escrow created', {
    escrowId: escrow._id,
    orderId,
    totalAmount: order.totalAmount,
  });

  return escrow;
}

/**
 * Mark escrow as funded (called after successful payment)
 */
export async function fundMaterialEscrow(
  escrowId: string,
  by: mongoose.Types.ObjectId,
  paystackReference?: string
): Promise<IMaterialEscrow> {
  const escrow = await MaterialEscrow.findById(escrowId);

  if (!escrow) {
    throw new Error('Material escrow not found');
  }

  if (escrow.status !== 'created') {
    throw new Error('Escrow must be in created state to fund');
  }

  escrow.fundedAmount = escrow.totalAmount;
  escrow.fundedAt = new Date();
  if (paystackReference) {
    escrow.paystackReference = paystackReference;
  }
  escrow.setStatus('funded', by, 'Escrow funded by customer');
  await escrow.save();

  // Update order status
  const order = await MaterialOrder.findById(escrow.order);
  if (order) {
    order.status = 'paid';
    order.paidAt = new Date();
    (order as any)._statusChangedBy = by;
    await order.save();
  }

  // Notify merchant
  await createNotification(escrow.merchant.toString(), {
    type: 'material_order_paid' as any,
    title: 'Order Paid!',
    message: `Payment of NGN${escrow.totalAmount.toLocaleString()} received for order ${order?.orderNumber}. You can now prepare the order.`,
    link: `/dashboard/merchant/orders/${escrow.order}`,
    data: { escrowId: escrow._id, orderId: escrow.order, amount: escrow.totalAmount },
  });

  log.info('Material escrow funded', {
    escrowId,
    amount: escrow.totalAmount,
    paystackReference,
  });

  return escrow;
}

/**
 * Request release (merchant requests after delivery confirmed)
 */
export async function requestRelease(
  escrowId: string,
  by: mongoose.Types.ObjectId,
  notes?: string
): Promise<IMaterialEscrow> {
  const escrow = await MaterialEscrow.findById(escrowId);

  if (!escrow) {
    throw new Error('Material escrow not found');
  }

  if (escrow.status !== 'funded') {
    throw new Error('Escrow must be funded to request release');
  }

  // Verify order has been received
  const order = await MaterialOrder.findById(escrow.order);
  if (!order || order.status !== 'received') {
    throw new Error('Order must be marked as received before requesting release');
  }

  escrow.releaseRequestedAt = new Date();
  escrow.releaseRequestedBy = by;
  escrow.setStatus('release_requested', by, notes || 'Release requested by merchant');
  await escrow.save();

  log.info('Material escrow release requested', {
    escrowId,
    by: by.toString(),
  });

  return escrow;
}

/**
 * Release escrow to merchant
 */
export async function releaseMaterialEscrow(
  escrowId: string,
  by: mongoose.Types.ObjectId,
  notes?: string
): Promise<IMaterialEscrow> {
  const escrow = await MaterialEscrow.findById(escrowId);

  if (!escrow) {
    throw new Error('Material escrow not found');
  }

  if (escrow.status !== 'release_requested' && escrow.status !== 'funded') {
    throw new Error('Escrow must be in release_requested or funded state');
  }

  // Get merchant bank details
  const merchantProfile = await MerchantProfile.findById(escrow.merchantProfile);
  if (merchantProfile?.paystackRecipientCode) {
    escrow.merchantBankCode = merchantProfile.bankCode;
    escrow.merchantAccountNumber = merchantProfile.accountNumber;
    escrow.merchantRecipientCode = merchantProfile.paystackRecipientCode;
  }

  // Calculate release amount (total minus platform fee)
  const releaseAmount = escrow.totalAmount - escrow.platformFee;
  escrow.releasedAmount = releaseAmount;
  escrow.releasedAt = new Date();
  escrow.setStatus('released', by, notes || 'Escrow released to merchant');
  await escrow.save();

  // Update order to completed
  const order = await MaterialOrder.findById(escrow.order);
  if (order) {
    order.status = 'completed';
    order.completedAt = new Date();
    (order as any)._statusChangedBy = by;
    await order.save();
  }

  // Update merchant stats
  if (merchantProfile) {
    merchantProfile.ordersCompleted += 1;
    await merchantProfile.save();
  }

  // Notify merchant
  await createNotification(escrow.merchant.toString(), {
    type: 'material_payment_released' as any,
    title: 'Payment Released!',
    message: `NGN${releaseAmount.toLocaleString()} has been released to your account.`,
    link: `/dashboard/merchant/earnings`,
    data: { escrowId: escrow._id, amount: releaseAmount },
  });

  // Initiate actual transfer if bank details available
  if (escrow.merchantRecipientCode) {
    await initiateTransfer(escrow._id.toString(), releaseAmount);
  }

  log.info('Material escrow released', {
    escrowId,
    amount: releaseAmount,
    by: by.toString(),
  });

  return escrow;
}

/**
 * Initiate Paystack transfer to merchant
 */
async function initiateTransfer(
  escrowId: string,
  amount: number
): Promise<void> {
  try {
    const escrow = await MaterialEscrow.findById(escrowId);
    if (!escrow || !escrow.merchantRecipientCode) return;

    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: escrow.merchantRecipientCode,
        reason: `Material order payment - Order ${escrow.order}`,
        reference: `MTRF_${escrow._id}_${Date.now()}`,
      }),
    });

    const data = await response.json() as { status: boolean; message?: string; data: { transfer_code: string } };

    if (data.status) {
      escrow.paystackTransferRef = data.data.transfer_code;
      escrow.transferStatus = 'processing';
      await escrow.save();

      log.info('Material transfer initiated', {
        escrowId,
        amount,
        transferCode: data.data.transfer_code,
      });
    } else {
      log.error('Material transfer initiation failed', {
        escrowId,
        error: data.message,
      });
    }
  } catch (error) {
    log.error('Material transfer initiation error', { escrowId, error });
  }
}

/**
 * Mark transfer as completed (called from webhook)
 */
export async function confirmTransfer(
  transferRef: string,
  success: boolean
): Promise<void> {
  const escrow = await MaterialEscrow.findOne({
    paystackTransferRef: transferRef,
  });

  if (!escrow) {
    log.warn('Material escrow not found for transfer', { transferRef });
    return;
  }

  escrow.transferStatus = success ? 'completed' : 'failed';
  await escrow.save();

  log.info('Material transfer status updated', {
    escrowId: escrow._id,
    transferRef,
    status: success ? 'completed' : 'failed',
  });

  if (!success) {
    // Notify merchant about failed transfer
    await createNotification(escrow.merchant.toString(), {
      type: 'transfer_failed' as any,
      title: 'Transfer Failed',
      message: 'Your payment transfer failed. Please contact support.',
      link: `/dashboard/merchant/earnings`,
      data: { escrowId: escrow._id },
    });
  }
}

/**
 * Refund escrow to customer
 */
export async function refundMaterialEscrow(
  escrowId: string,
  amount: number,
  reason: string,
  by: mongoose.Types.ObjectId
): Promise<IMaterialEscrow> {
  const escrow = await MaterialEscrow.findById(escrowId);

  if (!escrow) {
    throw new Error('Material escrow not found');
  }

  const availableForRefund = escrow.fundedAmount - escrow.releasedAmount - escrow.refundedAmount;

  if (amount > availableForRefund) {
    throw new Error(`Cannot refund more than available balance (NGN${availableForRefund.toLocaleString()})`);
  }

  escrow.refundedAmount += amount;

  // Determine final status
  if (escrow.refundedAmount === escrow.fundedAmount) {
    escrow.setStatus('refunded', by, `Full refund: ${reason}`);
  } else if (escrow.releasedAmount + escrow.refundedAmount === escrow.fundedAmount) {
    escrow.setStatus('partial_refund', by, `Partial refund: ${reason}`);
  }

  await escrow.save();

  // Update order status
  const order = await MaterialOrder.findById(escrow.order);
  if (order && escrow.refundedAmount === escrow.fundedAmount) {
    order.status = 'refunded';
    (order as any)._statusChangedBy = by;
    await order.save();
  }

  // Notify customer
  await createNotification(escrow.customer.toString(), {
    type: 'material_refund_processed' as any,
    title: 'Refund Processed',
    message: `NGN${amount.toLocaleString()} has been refunded. Reason: ${reason}`,
    link: `/dashboard/customer/material-orders/${escrow.order}`,
    data: { escrowId: escrow._id, amount },
  });

  log.info('Material refund initiated', {
    escrowId,
    amount,
    reason,
    by: by.toString(),
  });

  return escrow;
}

/**
 * Mark escrow as disputed
 */
export async function disputeMaterialEscrow(
  escrowId: string,
  reason: string,
  by: mongoose.Types.ObjectId
): Promise<IMaterialEscrow> {
  const escrow = await MaterialEscrow.findById(escrowId);

  if (!escrow) {
    throw new Error('Material escrow not found');
  }

  if (!canTransition(escrow.status, 'disputed')) {
    throw new Error(`Cannot dispute escrow in ${escrow.status} state`);
  }

  escrow.setStatus('disputed', by, reason);
  await escrow.save();

  // Update order status
  const order = await MaterialOrder.findById(escrow.order);
  if (order) {
    order.status = 'disputed';
    (order as any)._statusChangedBy = by;
    await order.save();
  }

  // Notify both parties
  await createNotification(escrow.customer.toString(), {
    type: 'material_dispute_opened' as any,
    title: 'Dispute Opened',
    message: `A dispute has been opened for your material order.`,
    link: `/dashboard/customer/material-orders/${escrow.order}`,
    data: { escrowId: escrow._id },
  });

  await createNotification(escrow.merchant.toString(), {
    type: 'material_dispute_opened' as any,
    title: 'Dispute Opened',
    message: `A dispute has been opened for order ${order?.orderNumber}.`,
    link: `/dashboard/merchant/orders/${escrow.order}`,
    data: { escrowId: escrow._id },
  });

  log.info('Material escrow disputed', {
    escrowId,
    reason,
    by: by.toString(),
  });

  return escrow;
}

export default {
  canTransition,
  transition,
  createMaterialEscrow,
  fundMaterialEscrow,
  requestRelease,
  releaseMaterialEscrow,
  confirmTransfer,
  refundMaterialEscrow,
  disputeMaterialEscrow,
};
