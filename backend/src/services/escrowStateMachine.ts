import mongoose from 'mongoose';
import EscrowPayment, { EscrowStatus, IEscrowPayment } from '../models/EscrowPayment';
import JobContract from '../models/JobContract';
import Booking from '../models/Booking';
import { createNotification } from './notifications';
import { log } from '../utils/logger';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Valid state transitions
const VALID_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  created: ['funded', 'cancelled'],
  funded: ['milestone_1_pending', 'disputed', 'cancelled'],
  milestone_1_pending: ['milestone_1_released', 'disputed'],
  milestone_1_released: ['milestone_2_pending', 'disputed'],
  milestone_2_pending: ['milestone_2_released', 'disputed'],
  milestone_2_released: ['milestone_3_pending', 'disputed'],
  milestone_3_pending: ['completed', 'disputed'],
  completed: [],
  disputed: ['resolved', 'milestone_1_released', 'milestone_2_released', 'milestone_3_pending', 'partial_refund'],
  resolved: [],
  cancelled: [],
  partial_refund: [],
};

/**
 * Check if a transition is valid
 */
export function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}

/**
 * Execute a state transition
 */
export async function transition(
  escrowId: string,
  to: EscrowStatus,
  by: mongoose.Types.ObjectId,
  note?: string
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  if (!canTransition(escrow.status, to)) {
    throw new Error(`Invalid transition from ${escrow.status} to ${to}`);
  }

  escrow.setStatus(to, by, note);
  await escrow.save();

  log.info('Escrow state transition', {
    escrowId,
    from: escrow.statusHistory[escrow.statusHistory.length - 2]?.status,
    to,
    by: by.toString(),
  });

  return escrow;
}

/**
 * Create escrow for a signed contract
 */
export async function createEscrow(
  contractId: string,
  by: mongoose.Types.ObjectId
): Promise<IEscrowPayment> {
  const contract = await JobContract.findById(contractId);

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.status !== 'signed') {
    throw new Error('Contract must be signed before creating escrow');
  }

  // Check if escrow already exists
  const existingEscrow = await EscrowPayment.findOne({ contract: contractId });
  if (existingEscrow) {
    throw new Error('Escrow already exists for this contract');
  }

  const escrow = await EscrowPayment.create({
    contract: contractId,
    booking: contract.booking,
    customer: contract.customer,
    artisan: contract.artisan,
    totalAmount: contract.totalAmount,
    platformFee: contract.platformFee,
    status: 'created',
    statusHistory: [{
      status: 'created',
      timestamp: new Date(),
      by,
    }],
  });

  // Update contract with escrow reference
  contract.escrow = escrow._id;
  await contract.save();

  // Update booking with escrow reference
  await Booking.findByIdAndUpdate(contract.booking, { escrow: escrow._id });

  log.info('Escrow created', {
    escrowId: escrow._id,
    contractId,
    totalAmount: contract.totalAmount,
  });

  return escrow;
}

/**
 * Mark escrow as funded (called after successful payment)
 */
export async function fundEscrow(
  escrowId: string,
  by: mongoose.Types.ObjectId,
  paystackReference?: string
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
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

  // Update contract status to active
  const contract = await JobContract.findById(escrow.contract);
  if (contract) {
    contract.setStatus('active', by, 'Escrow funded, work can begin');
    await contract.save();
  }

  // Update booking status
  await Booking.findByIdAndUpdate(escrow.booking, {
    status: 'paid',
    paymentStatus: 'escrow',
    paidAt: new Date(),
  });

  // Notify artisan
  await createNotification(escrow.artisan.toString(), {
    type: 'escrow_funded' as any,
    title: 'Escrow Funded!',
    message: `The customer has funded ₦${escrow.totalAmount.toLocaleString()} in escrow. You can now begin work.`,
    link: `/dashboard/artisan/contracts/${escrow.contract}`,
    data: { escrowId: escrow._id, amount: escrow.totalAmount },
  });

  log.info('Escrow funded', {
    escrowId,
    amount: escrow.totalAmount,
    paystackReference,
  });

  return escrow;
}

/**
 * Request milestone release (artisan requests)
 */
export async function requestMilestoneRelease(
  escrowId: string,
  milestoneNumber: number,
  by: mongoose.Types.ObjectId,
  notes?: string
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  // Determine expected status based on milestone
  const expectedStatus: Record<number, EscrowStatus> = {
    1: 'funded',
    2: 'milestone_1_released',
    3: 'milestone_2_released',
  };

  const pendingStatus: Record<number, EscrowStatus> = {
    1: 'milestone_1_pending',
    2: 'milestone_2_pending',
    3: 'milestone_3_pending',
  };

  if (!expectedStatus[milestoneNumber]) {
    throw new Error('Invalid milestone number');
  }

  if (escrow.status !== expectedStatus[milestoneNumber]) {
    throw new Error(`Cannot request milestone ${milestoneNumber} release at current state`);
  }

  escrow.setStatus(pendingStatus[milestoneNumber], by, notes || `Milestone ${milestoneNumber} release requested`);
  await escrow.save();

  // Update contract milestone status
  const contract = await JobContract.findById(escrow.contract);
  if (contract && contract.milestones[milestoneNumber - 1]) {
    contract.milestones[milestoneNumber - 1].status = 'completed';
    contract.milestones[milestoneNumber - 1].completedAt = new Date();
    await contract.save();
  }

  // Notify customer
  await createNotification(escrow.customer.toString(), {
    type: 'milestone_release_requested' as any,
    title: 'Milestone Approval Required',
    message: `The artisan has completed milestone ${milestoneNumber} and is requesting payment release.`,
    link: `/dashboard/customer/escrow/${escrow.contract}`,
    data: { escrowId: escrow._id, milestone: milestoneNumber },
  });

  log.info('Milestone release requested', {
    escrowId,
    milestone: milestoneNumber,
    by: by.toString(),
  });

  return escrow;
}

/**
 * Approve milestone release (customer approves)
 */
export async function approveMilestoneRelease(
  escrowId: string,
  milestoneNumber: number,
  by: mongoose.Types.ObjectId,
  notes?: string
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  // Verify current status
  const pendingStatus: Record<number, EscrowStatus> = {
    1: 'milestone_1_pending',
    2: 'milestone_2_pending',
    3: 'milestone_3_pending',
  };

  const releasedStatus: Record<number, EscrowStatus> = {
    1: 'milestone_1_released',
    2: 'milestone_2_released',
    3: 'completed',
  };

  if (escrow.status !== pendingStatus[milestoneNumber]) {
    throw new Error(`Milestone ${milestoneNumber} is not pending approval`);
  }

  // Get contract to calculate milestone amount
  const contract = await JobContract.findById(escrow.contract);
  if (!contract) {
    throw new Error('Contract not found');
  }

  const milestone = contract.milestones[milestoneNumber - 1];
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  // Calculate amount to release (milestone amount minus proportional platform fee)
  const milestoneAmount = milestone.amount;
  const milestonePlatformFee = Math.round((milestone.percentage / 100) * escrow.platformFee);
  const releaseAmount = milestoneAmount - milestonePlatformFee;

  // Add release record
  escrow.releases.push({
    milestone: milestoneNumber,
    amount: releaseAmount,
    releasedAt: new Date(),
    releasedBy: by,
    status: 'pending',
  });
  escrow.releasedAmount += releaseAmount;

  // Update status
  escrow.setStatus(releasedStatus[milestoneNumber], by, notes || `Milestone ${milestoneNumber} approved`);
  await escrow.save();

  // Update contract milestone status
  if (milestone) {
    milestone.status = 'approved';
    milestone.approvedAt = new Date();
    await contract.save();
  }

  // If completed, update contract and booking
  if (releasedStatus[milestoneNumber] === 'completed') {
    contract.setStatus('completed', by, 'All milestones completed');
    contract.actualEndDate = new Date();
    await contract.save();

    await Booking.findByIdAndUpdate(escrow.booking, {
      status: 'confirmed',
      paymentStatus: 'released',
      releasedAt: new Date(),
      confirmedAt: new Date(),
    });
  }

  // Notify artisan
  await createNotification(escrow.artisan.toString(), {
    type: 'milestone_released' as any,
    title: 'Payment Released!',
    message: `₦${releaseAmount.toLocaleString()} has been released for milestone ${milestoneNumber}.`,
    link: `/dashboard/artisan/earnings`,
    data: { escrowId: escrow._id, milestone: milestoneNumber, amount: releaseAmount },
  });

  // Initiate actual transfer to artisan (if bank details available)
  if (escrow.artisanRecipientCode) {
    await initiateTransfer(escrow._id.toString(), milestoneNumber, releaseAmount);
  }

  log.info('Milestone released', {
    escrowId,
    milestone: milestoneNumber,
    amount: releaseAmount,
    by: by.toString(),
  });

  return escrow;
}

/**
 * Initiate Paystack transfer to artisan
 */
async function initiateTransfer(
  escrowId: string,
  milestone: number,
  amount: number
): Promise<void> {
  try {
    const escrow = await EscrowPayment.findById(escrowId);
    if (!escrow || !escrow.artisanRecipientCode) return;

    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: escrow.artisanRecipientCode,
        reason: `Milestone ${milestone} payment - Contract ${escrow.contract}`,
        reference: `TRF_${escrow._id}_M${milestone}_${Date.now()}`,
      }),
    });

    const data = await response.json();

    if (data.status) {
      // Update release record with transfer reference
      const releaseIndex = escrow.releases.findIndex(r => r.milestone === milestone);
      if (releaseIndex !== -1) {
        escrow.releases[releaseIndex].paystackTransferRef = data.data.transfer_code;
        escrow.releases[releaseIndex].status = 'processing';
        await escrow.save();
      }

      log.info('Transfer initiated', {
        escrowId,
        milestone,
        amount,
        transferCode: data.data.transfer_code,
      });
    } else {
      log.error('Transfer initiation failed', {
        escrowId,
        milestone,
        error: data.message,
      });
    }
  } catch (error) {
    log.error('Transfer initiation error', { escrowId, milestone, error });
  }
}

/**
 * Mark transfer as completed (called from webhook)
 */
export async function confirmTransfer(
  transferRef: string,
  success: boolean
): Promise<void> {
  const escrow = await EscrowPayment.findOne({
    'releases.paystackTransferRef': transferRef,
  });

  if (!escrow) {
    log.warn('Escrow not found for transfer', { transferRef });
    return;
  }

  const releaseIndex = escrow.releases.findIndex(
    r => r.paystackTransferRef === transferRef
  );

  if (releaseIndex !== -1) {
    escrow.releases[releaseIndex].status = success ? 'completed' : 'failed';
    await escrow.save();

    log.info('Transfer status updated', {
      escrowId: escrow._id,
      transferRef,
      status: success ? 'completed' : 'failed',
    });

    if (!success) {
      // Notify admin about failed transfer
      // TODO: Implement admin notification
    }
  }
}

/**
 * Initiate refund (for disputes or cancellations)
 */
export async function initiateRefund(
  escrowId: string,
  amount: number,
  reason: string,
  by: mongoose.Types.ObjectId
): Promise<IEscrowPayment> {
  const escrow = await EscrowPayment.findById(escrowId);

  if (!escrow) {
    throw new Error('Escrow not found');
  }

  const availableForRefund = escrow.fundedAmount - escrow.releasedAmount - escrow.refundedAmount;

  if (amount > availableForRefund) {
    throw new Error(`Cannot refund more than available balance (₦${availableForRefund.toLocaleString()})`);
  }

  escrow.refundedAmount += amount;

  // Determine final status based on amounts
  if (escrow.refundedAmount === escrow.fundedAmount) {
    escrow.setStatus('cancelled', by, `Full refund: ${reason}`);
  } else if (escrow.releasedAmount + escrow.refundedAmount === escrow.fundedAmount) {
    escrow.setStatus('partial_refund', by, `Partial refund: ${reason}`);
  }

  await escrow.save();

  // TODO: Implement actual Paystack refund

  // Notify customer
  await createNotification(escrow.customer.toString(), {
    type: 'refund_processed' as any,
    title: 'Refund Processed',
    message: `₦${amount.toLocaleString()} has been refunded. Reason: ${reason}`,
    link: `/dashboard/customer/contracts/${escrow.contract}`,
    data: { escrowId: escrow._id, amount },
  });

  log.info('Refund initiated', {
    escrowId,
    amount,
    reason,
    by: by.toString(),
  });

  return escrow;
}

export default {
  canTransition,
  transition,
  createEscrow,
  fundEscrow,
  requestMilestoneRelease,
  approveMilestoneRelease,
  confirmTransfer,
  initiateRefund,
};
