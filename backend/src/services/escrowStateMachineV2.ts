import mongoose from 'mongoose';
import EscrowPayment, { EscrowStatus, IEscrowPayment } from '../models/EscrowPayment';
import Booking from '../models/Booking';
import Quote from '../models/Quote';
import { createNotificationWithPush } from './notifications';
import { log } from '../utils/logger';
import { payArtisan } from './payoutService';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * V2 Escrow State Machine
 * Simplified single-release flow for the new multi-quote booking system
 *
 * State Flow:
 *   created → funded → release_requested → completed
 *                    ↓                    ↑
 *                    → admin_review ------┘
 *                    ↓
 *                    → refunded/partial_refund
 */

// V2 Valid state transitions
const V2_VALID_TRANSITIONS: Record<string, EscrowStatus[]> = {
  created: ['funded', 'cancelled'],
  funded: ['release_requested', 'disputed', 'cancelled'],
  release_requested: ['completed', 'admin_review', 'disputed'],
  admin_review: ['completed', 'partial_refund', 'cancelled'],
  completed: [],
  disputed: ['admin_review', 'partial_refund'],
  cancelled: [],
  partial_refund: [],
};

/**
 * Check if a V2 transition is valid
 */
export function canV2Transition(from: EscrowStatus, to: EscrowStatus): boolean {
  return V2_VALID_TRANSITIONS[from]?.includes(to) || false;
}

/**
 * Create V2 escrow for an accepted quote
 */
export async function createV2Escrow(
  bookingId: string,
  quoteId: string,
  by: mongoose.Types.ObjectId
): Promise<IEscrowPayment> {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.bookingVersion !== 'v2') {
    throw new Error('This function is only for v2 bookings');
  }

  if (booking.status !== 'payment_pending') {
    throw new Error('Booking must be in payment_pending status');
  }

  const quote = await Quote.findById(quoteId);
  if (!quote) {
    throw new Error('Quote not found');
  }

  if (quote.status !== 'accepted') {
    throw new Error('Quote must be accepted before creating escrow');
  }

  // Check if escrow already exists
  const existingEscrow = await EscrowPayment.findOne({ booking: bookingId });
  if (existingEscrow) {
    throw new Error('Escrow already exists for this booking');
  }

  const escrow = await EscrowPayment.create({
    booking: bookingId,
    quote: quoteId,
    customer: booking.customer,
    artisan: quote.artisan,
    escrowVersion: 'v2',
    totalAmount: quote.totalAmount,
    platformFee: quote.platformFee,
    status: 'created',
    statusHistory: [{
      status: 'created',
      timestamp: new Date(),
      by,
    }],
  });

  // Update booking with escrow reference
  booking.escrow = escrow._id;
  await booking.save();

  log.info('V2 Escrow created', {
    escrowId: escrow._id,
    bookingId,
    quoteId,
    totalAmount: quote.totalAmount,
  });

  return escrow;
}

/**
 * Fund V2 escrow (called after successful payment)
 */
export async function fundV2Escrow(
  escrowId: string,
  by: mongoose.Types.ObjectId,
  paystackReference?: string
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  if (escrow.escrowVersion !== 'v2') {
    throw new Error('This function is only for v2 escrows');
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

  // Update booking status to paid
  await Booking.findByIdAndUpdate(escrow.booking, {
    status: 'paid',
    paymentStatus: 'escrow',
    paidAt: new Date(),
  });

  // Notify artisan
  await createNotificationWithPush(
    escrow.artisan.toString(),
    {
      type: 'escrow_funded' as any,
      title: 'Payment Received!',
      message: `The customer has funded ₦${escrow.totalAmount.toLocaleString()} in escrow. You can now begin work.`,
      link: `/dashboard/artisan/bookings/${escrow.booking}`,
    }
  );

  log.info('V2 Escrow funded', {
    escrowId,
    amount: escrow.totalAmount,
    paystackReference,
  });

  return escrow;
}

/**
 * Artisan requests release of payment
 */
export async function requestRelease(
  escrowId: string,
  artisanId: mongoose.Types.ObjectId,
  notes?: string
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  if (escrow.artisan.toString() !== artisanId.toString()) {
    throw new Error('Only the artisan can request release');
  }

  if (escrow.status !== 'funded') {
    throw new Error('Escrow must be funded to request release');
  }

  // Update escrow
  escrow.releaseRequestedAt = new Date();
  escrow.releaseRequestedBy = artisanId;
  escrow.releaseNotes = notes;
  escrow.setStatus('release_requested', artisanId, notes || 'Artisan requested payment release');
  await escrow.save();

  // Update booking status
  await Booking.findByIdAndUpdate(escrow.booking, {
    status: 'completed',
    completedAt: new Date(),
    jobCompletedAt: new Date(),
    certificationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
  });

  // Notify customer
  const booking = await Booking.findById(escrow.booking);
  await createNotificationWithPush(
    escrow.customer.toString(),
    {
      type: 'release_requested' as any,
      title: 'Work Completed - Confirm Payment',
      message: `The artisan has completed the ${booking?.jobType || 'job'} and is requesting payment. Please confirm to release funds.`,
      link: `/dashboard/customer/bookings/${escrow.booking}`,
    }
  );

  log.info('V2 Release requested', {
    escrowId,
    artisanId: artisanId.toString(),
    notes,
  });

  return escrow;
}

/**
 * Customer confirms release of payment
 */
export async function confirmRelease(
  escrowId: string,
  customerId: mongoose.Types.ObjectId
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  if (escrow.customer.toString() !== customerId.toString()) {
    throw new Error('Only the customer can confirm release');
  }

  if (escrow.status !== 'release_requested') {
    throw new Error('Release must be requested before confirming');
  }

  // Calculate amounts
  const artisanPayout = escrow.totalAmount - escrow.platformFee;

  // Add release record
  escrow.releases.push({
    milestone: 1, // Single milestone for v2
    amount: artisanPayout,
    releasedAt: new Date(),
    releasedBy: customerId,
    status: 'pending',
  });
  escrow.releasedAmount = artisanPayout;
  escrow.setStatus('completed', customerId, 'Customer confirmed release');
  await escrow.save();

  // Update booking
  const booking = await Booking.findById(escrow.booking);
  if (booking) {
    const now = new Date();
    const gracePeriodExpiry = new Date(now);
    gracePeriodExpiry.setDate(gracePeriodExpiry.getDate() + 7);

    booking.status = 'confirmed';
    booking.confirmedAt = now;
    booking.customerCertifiedAt = now;
    booking.gracePeriodExpiresAt = gracePeriodExpiry;
    booking.warrantyExpiresAt = gracePeriodExpiry;
    booking.paymentStatus = 'released';
    booking.releasedAt = now;
    (booking as any)._statusChangedBy = customerId;
    await booking.save();
  }

  // Notify artisan
  await createNotificationWithPush(
    escrow.artisan.toString(),
    {
      type: 'payment_released' as any,
      title: 'Payment Released!',
      message: `₦${artisanPayout.toLocaleString()} has been released to your account.`,
      link: `/dashboard/artisan/earnings`,
    }
  );

  // Initiate actual payout
  if (booking) {
    const payoutResult = await payArtisan(
      booking.artisanProfile!.toString(),
      artisanPayout,
      escrow.paystackReference || escrow._id.toString(),
      booking.jobType
    );

    if (payoutResult.success) {
      // Update release status
      escrow.releases[0].status = 'processing';
      escrow.releases[0].paystackTransferRef = payoutResult.transferCode;
      await escrow.save();

      log.info('V2 Payout initiated', {
        escrowId,
        amount: artisanPayout,
        transferCode: payoutResult.transferCode,
      });
    } else {
      log.warn('V2 Payout failed', {
        escrowId,
        error: payoutResult.error,
      });
    }
  }

  log.info('V2 Release confirmed', {
    escrowId,
    amount: artisanPayout,
    customerId: customerId.toString(),
  });

  return escrow;
}

/**
 * Artisan escalates to admin review (non-confirmation scenario)
 */
export async function escalateToAdmin(
  escrowId: string,
  artisanId: mongoose.Types.ObjectId,
  reason: string
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  if (escrow.artisan.toString() !== artisanId.toString()) {
    throw new Error('Only the artisan can escalate to admin');
  }

  if (escrow.status !== 'release_requested') {
    throw new Error('Can only escalate from release_requested status');
  }

  escrow.adminReviewReason = reason;
  escrow.adminReviewRequestedAt = new Date();
  escrow.setStatus('admin_review', artisanId, `Escalated by artisan: ${reason}`);
  await escrow.save();

  // Notify admin (TODO: Add admin notification system)
  log.warn('V2 Escrow escalated to admin review', {
    escrowId,
    artisanId: artisanId.toString(),
    reason,
  });

  // Notify customer
  await createNotificationWithPush(
    escrow.customer.toString(),
    {
      type: 'admin_review' as any,
      title: 'Payment Under Review',
      message: 'The payment has been escalated for admin review. Our team will contact you shortly.',
      link: `/dashboard/customer/bookings/${escrow.booking}`,
    }
  );

  return escrow;
}

/**
 * Admin resolves the escrow (release or refund)
 */
export async function adminResolve(
  escrowId: string,
  adminId: mongoose.Types.ObjectId,
  action: 'release' | 'partial_refund' | 'full_refund',
  refundAmount?: number,
  notes?: string
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  if (escrow.status !== 'admin_review' && escrow.status !== 'disputed') {
    throw new Error('Escrow must be in admin_review or disputed status');
  }

  escrow.adminResolvedAt = new Date();
  escrow.adminResolvedBy = adminId;
  escrow.adminResolutionNotes = notes;

  const booking = await Booking.findById(escrow.booking);

  if (action === 'release') {
    // Full release to artisan
    const artisanPayout = escrow.totalAmount - escrow.platformFee;

    escrow.releases.push({
      milestone: 1,
      amount: artisanPayout,
      releasedAt: new Date(),
      releasedBy: adminId,
      status: 'pending',
    });
    escrow.releasedAmount = artisanPayout;
    escrow.setStatus('completed', adminId, notes || 'Admin approved release');

    // Update booking
    if (booking) {
      booking.status = 'confirmed';
      booking.confirmedAt = new Date();
      booking.paymentStatus = 'released';
      booking.releasedAt = new Date();
      await booking.save();
    }

    // Notify artisan
    await createNotificationWithPush(
      escrow.artisan.toString(),
      {
        type: 'payment_released' as any,
        title: 'Payment Released by Admin',
        message: `₦${artisanPayout.toLocaleString()} has been released to your account.`,
        link: `/dashboard/artisan/earnings`,
      }
    );

    // Initiate payout
    if (booking) {
      await payArtisan(
        booking.artisanProfile!.toString(),
        artisanPayout,
        escrow.paystackReference || escrow._id.toString(),
        booking.jobType
      );
    }

    log.info('V2 Admin released payment', {
      escrowId,
      amount: artisanPayout,
      adminId: adminId.toString(),
    });

  } else if (action === 'partial_refund') {
    if (!refundAmount || refundAmount <= 0 || refundAmount > escrow.totalAmount) {
      throw new Error('Invalid refund amount');
    }

    const artisanPayout = escrow.totalAmount - refundAmount - escrow.platformFee;

    // Release to artisan
    if (artisanPayout > 0) {
      escrow.releases.push({
        milestone: 1,
        amount: artisanPayout,
        releasedAt: new Date(),
        releasedBy: adminId,
        status: 'pending',
      });
      escrow.releasedAmount = artisanPayout;
    }

    escrow.refundedAmount = refundAmount;
    escrow.setStatus('partial_refund', adminId, notes || `Partial refund: ₦${refundAmount.toLocaleString()}`);

    // Update booking
    if (booking) {
      booking.status = 'refunded';
      booking.paymentStatus = 'partial_refund';
      await booking.save();
    }

    // Notify both parties
    await createNotificationWithPush(
      escrow.customer.toString(),
      {
        type: 'refund_processed' as any,
        title: 'Partial Refund Processed',
        message: `₦${refundAmount.toLocaleString()} has been refunded to you.`,
        link: `/dashboard/customer/bookings/${escrow.booking}`,
      }
    );

    if (artisanPayout > 0) {
      await createNotificationWithPush(
        escrow.artisan.toString(),
        {
          type: 'payment_released' as any,
          title: 'Partial Payment Released',
          message: `₦${artisanPayout.toLocaleString()} has been released to your account.`,
          link: `/dashboard/artisan/earnings`,
        }
      );

      // Initiate partial payout
      if (booking) {
        await payArtisan(
          booking.artisanProfile!.toString(),
          artisanPayout,
          escrow.paystackReference || escrow._id.toString(),
          booking.jobType
        );
      }
    }

    log.info('V2 Admin partial refund', {
      escrowId,
      refundAmount,
      artisanPayout,
      adminId: adminId.toString(),
    });

  } else if (action === 'full_refund') {
    escrow.refundedAmount = escrow.totalAmount;
    escrow.setStatus('cancelled', adminId, notes || 'Full refund by admin');

    // Update booking
    if (booking) {
      booking.status = 'refunded';
      booking.paymentStatus = 'refunded';
      await booking.save();
    }

    // Notify customer
    await createNotificationWithPush(
      escrow.customer.toString(),
      {
        type: 'refund_processed' as any,
        title: 'Full Refund Processed',
        message: `₦${escrow.totalAmount.toLocaleString()} has been refunded to you.`,
        link: `/dashboard/customer/bookings/${escrow.booking}`,
      }
    );

    // Notify artisan
    await createNotificationWithPush(
      escrow.artisan.toString(),
      {
        type: 'booking_cancelled' as any,
        title: 'Booking Refunded',
        message: 'The booking has been cancelled and fully refunded to the customer.',
        link: `/dashboard/artisan/bookings/${escrow.booking}`,
      }
    );

    log.info('V2 Admin full refund', {
      escrowId,
      amount: escrow.totalAmount,
      adminId: adminId.toString(),
    });
  }

  await escrow.save();
  return escrow;
}

/**
 * Get V2 escrow by booking ID
 */
export async function getV2EscrowByBooking(bookingId: string): Promise<IEscrowPayment | null> {
  return EscrowPayment.findOne({
    booking: bookingId,
    escrowVersion: 'v2',
  })
    .populate('customer', 'firstName lastName email')
    .populate('artisan', 'firstName lastName email')
    .populate('quote');
}

export default {
  canV2Transition,
  createV2Escrow,
  fundV2Escrow,
  requestRelease,
  confirmRelease,
  escalateToAdmin,
  adminResolve,
  getV2EscrowByBooking,
};
