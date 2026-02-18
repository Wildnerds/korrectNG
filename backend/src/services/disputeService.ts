import mongoose from 'mongoose';
import Dispute, { DisputeStatus, DisputeDecision, IDispute } from '../models/Dispute';
import JobContract from '../models/JobContract';
import EscrowPayment from '../models/EscrowPayment';
import Booking from '../models/Booking';
import { ArtisanProfile } from '../models/ArtisanProfile';
import { createNotification } from './notifications';
import { initiateRefund, transition as escrowTransition } from './escrowStateMachine';
import trustService from './trustService';
import { log } from '../utils/logger';

const ARTISAN_RESPONSE_HOURS = 48;
const CUSTOMER_COUNTER_HOURS = 72;

interface OpenDisputeParams {
  contractId: string;
  customerId: mongoose.Types.ObjectId;
  category: string;
  description: string;
}

/**
 * Open a new dispute
 */
export async function openDispute(params: OpenDisputeParams): Promise<IDispute> {
  const { contractId, customerId, category, description } = params;

  // Get contract with escrow
  const contract = await JobContract.findById(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  // Verify customer owns this contract
  if (contract.customer.toString() !== customerId.toString()) {
    throw new Error('Not authorized to open dispute for this contract');
  }

  // Check if dispute already exists
  const existingDispute = await Dispute.findOne({
    contract: contractId,
    status: { $nin: ['resolved'] },
  });
  if (existingDispute) {
    throw new Error('An active dispute already exists for this contract');
  }

  // Get escrow
  const escrow = await EscrowPayment.findOne({ contract: contractId });
  if (!escrow) {
    throw new Error('No escrow found for this contract');
  }

  // Can only dispute active escrows
  const disputableStatuses = [
    'funded', 'milestone_1_pending', 'milestone_1_released',
    'milestone_2_pending', 'milestone_2_released', 'milestone_3_pending',
  ];
  if (!disputableStatuses.includes(escrow.status)) {
    throw new Error('Cannot open dispute at current escrow state');
  }

  // Create contract snapshot
  const contractSnapshot = {
    scopeOfWork: contract.scopeOfWork,
    milestones: contract.milestones.map(m => ({
      order: m.order,
      name: m.name,
      description: m.description,
      percentage: m.percentage,
      amount: m.amount,
      status: m.status,
    })),
    deliverables: contract.deliverables,
  };

  // Create dispute
  const dispute = await Dispute.create({
    contract: contractId,
    escrow: escrow._id,
    booking: contract.booking,
    customer: customerId,
    artisan: contract.artisan,
    reason: description.substring(0, 200),
    category,
    description,
    contractSnapshot,
    customerEvidence: [],
    artisanEvidence: [],
    timeline: [],
  });

  // Update escrow status to disputed
  await escrowTransition(escrow._id.toString(), 'disputed', customerId, 'Dispute opened by customer');

  // Update contract status
  contract.setStatus('disputed', customerId, 'Dispute opened');
  await contract.save();

  // Update booking status
  await Booking.findByIdAndUpdate(contract.booking, {
    status: 'disputed',
    disputeReason: description.substring(0, 500),
  });

  // Link dispute to escrow
  escrow.dispute = dispute._id;
  await escrow.save();

  // Notify artisan
  await createNotification(contract.artisan.toString(), {
    type: 'dispute_opened' as any,
    title: 'Dispute Opened',
    message: `A dispute has been opened for "${contract.title}". Please respond within 48 hours.`,
    link: `/dashboard/artisan/disputes/${dispute._id}`,
    data: { disputeId: dispute._id, contractId },
  });

  // Update artisan trust metrics (dispute opened)
  const artisanProfile = await ArtisanProfile.findOne({ user: contract.artisan });
  if (artisanProfile) {
    await trustService.onDisputeOpened(artisanProfile._id.toString());
  }

  log.info('Dispute opened', {
    disputeId: dispute._id,
    contractId,
    category,
    customerId: customerId.toString(),
  });

  return dispute;
}

/**
 * Submit artisan response to dispute
 */
export async function submitArtisanResponse(
  disputeId: string,
  artisanId: mongoose.Types.ObjectId,
  response: string
): Promise<IDispute> {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Verify artisan
  if (dispute.artisan.toString() !== artisanId.toString()) {
    throw new Error('Not authorized');
  }

  // Check status
  if (dispute.status !== 'artisan_response_pending') {
    throw new Error('Cannot submit response at this stage');
  }

  // Check deadline
  if (new Date() > dispute.artisanResponseDeadline) {
    throw new Error('Response deadline has passed');
  }

  // Update dispute
  dispute.artisanResponse = {
    content: response,
    respondedAt: new Date(),
  };
  dispute.status = 'customer_counter_pending';
  dispute.customerCounterDeadline = new Date(Date.now() + CUSTOMER_COUNTER_HOURS * 60 * 60 * 1000);
  dispute.addTimelineEvent('Artisan response submitted', artisanId);

  await dispute.save();

  // Notify customer
  await createNotification(dispute.customer.toString(), {
    type: 'dispute_response' as any,
    title: 'Artisan Responded to Dispute',
    message: 'The artisan has responded to your dispute. You have 72 hours to review and respond.',
    link: `/dashboard/customer/disputes/${disputeId}`,
    data: { disputeId },
  });

  log.info('Artisan response submitted', {
    disputeId,
    artisanId: artisanId.toString(),
  });

  return dispute;
}

/**
 * Submit customer counter to artisan response
 */
export async function submitCustomerCounter(
  disputeId: string,
  customerId: mongoose.Types.ObjectId,
  counter: string
): Promise<IDispute> {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Verify customer
  if (dispute.customer.toString() !== customerId.toString()) {
    throw new Error('Not authorized');
  }

  // Check status
  if (dispute.status !== 'customer_counter_pending') {
    throw new Error('Cannot submit counter at this stage');
  }

  // Update dispute
  dispute.customerCounter = {
    content: counter,
    submittedAt: new Date(),
  };
  dispute.status = 'under_review';
  dispute.addTimelineEvent('Customer counter submitted', customerId, 'Dispute moved to admin review');

  await dispute.save();

  // Notify admin (would use admin notification system)
  log.info('Dispute moved to review', {
    disputeId,
    customerId: customerId.toString(),
  });

  return dispute;
}

/**
 * Add evidence to dispute
 */
export async function addEvidence(
  disputeId: string,
  userId: mongoose.Types.ObjectId,
  evidence: {
    type: 'image' | 'video' | 'document';
    url: string;
    publicId: string;
    description?: string;
  }
): Promise<IDispute> {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  const isCustomer = dispute.customer.toString() === userId.toString();
  const isArtisan = dispute.artisan.toString() === userId.toString();

  if (!isCustomer && !isArtisan) {
    throw new Error('Not authorized');
  }

  // Cannot add evidence after resolution
  if (['resolved', 'escalated'].includes(dispute.status)) {
    throw new Error('Cannot add evidence at this stage');
  }

  const evidenceRecord = {
    uploadedBy: userId,
    type: evidence.type,
    url: evidence.url,
    publicId: evidence.publicId,
    description: evidence.description,
    uploadedAt: new Date(),
  };

  if (isCustomer) {
    dispute.customerEvidence.push(evidenceRecord);
  } else {
    dispute.artisanEvidence.push(evidenceRecord);
  }

  dispute.addTimelineEvent(
    `Evidence uploaded by ${isCustomer ? 'customer' : 'artisan'}`,
    userId,
    evidence.type
  );

  await dispute.save();

  log.info('Evidence added to dispute', {
    disputeId,
    userId: userId.toString(),
    type: evidence.type,
  });

  return dispute;
}

/**
 * Resolve dispute (admin action)
 */
export async function resolveDispute(
  disputeId: string,
  adminId: mongoose.Types.ObjectId,
  decision: DisputeDecision,
  notes: string,
  customerRefundAmount?: number,
  artisanPaymentAmount?: number
): Promise<IDispute> {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Check if already resolved
  if (dispute.status === 'resolved') {
    throw new Error('Dispute already resolved');
  }

  const escrow = await EscrowPayment.findById(dispute.escrow);
  if (!escrow) {
    throw new Error('Escrow not found');
  }

  // Apply decision
  dispute.decision = decision;
  dispute.decisionDetails = {
    madeBy: adminId,
    madeAt: new Date(),
    notes,
    customerRefundAmount,
    artisanPaymentAmount,
  };
  dispute.status = 'resolved';
  dispute.addTimelineEvent('Dispute resolved', adminId, `Decision: ${decision}`);

  // Process financial resolution
  const remainingBalance = escrow.fundedAmount - escrow.releasedAmount - escrow.refundedAmount;

  switch (decision) {
    case 'full_payment':
      // Release remaining to artisan
      if (remainingBalance > 0) {
        // Would trigger milestone releases
        await escrowTransition(escrow._id.toString(), 'resolved', adminId, 'Full payment to artisan per dispute resolution');
      }
      break;

    case 'full_refund':
      // Refund remaining to customer
      if (remainingBalance > 0) {
        await initiateRefund(escrow._id.toString(), remainingBalance, 'Full refund per dispute resolution', adminId);
      }
      break;

    case 'partial_release':
      // Split remaining between parties
      if (customerRefundAmount && customerRefundAmount > 0) {
        await initiateRefund(escrow._id.toString(), customerRefundAmount, 'Partial refund per dispute resolution', adminId);
      }
      await escrowTransition(escrow._id.toString(), 'resolved', adminId, 'Partial release per dispute resolution');
      break;

    case 'rework_required':
      // Return to active state for rework
      const contract = await JobContract.findById(dispute.contract);
      if (contract) {
        contract.setStatus('active', adminId, 'Rework required per dispute resolution');
        await contract.save();
      }
      // Determine which state to return escrow to based on current releases
      const releaseCount = escrow.releases.length;
      const returnStatuses = ['funded', 'milestone_1_released', 'milestone_2_released'];
      const returnStatus = returnStatuses[releaseCount] || 'funded';
      escrow.status = returnStatus as any;
      escrow.dispute = undefined;
      await escrow.save();
      break;
  }

  await dispute.save();

  // Notify both parties
  const contract = await JobContract.findById(dispute.contract);

  await Promise.all([
    createNotification(dispute.customer.toString(), {
      type: 'dispute_resolved' as any,
      title: 'Dispute Resolved',
      message: `Your dispute has been resolved. Decision: ${decision.replace(/_/g, ' ')}.`,
      link: `/dashboard/customer/disputes/${disputeId}`,
      data: { disputeId, decision },
    }),
    createNotification(dispute.artisan.toString(), {
      type: 'dispute_resolved' as any,
      title: 'Dispute Resolved',
      message: `The dispute has been resolved. Decision: ${decision.replace(/_/g, ' ')}.`,
      link: `/dashboard/artisan/disputes/${disputeId}`,
      data: { disputeId, decision },
    }),
  ]);

  log.info('Dispute resolved', {
    disputeId,
    decision,
    adminId: adminId.toString(),
    customerRefundAmount,
    artisanPaymentAmount,
  });

  return dispute;
}

/**
 * Auto-escalate overdue disputes
 */
export async function escalateOverdueDisputes(): Promise<number> {
  const now = new Date();

  // Find disputes with passed artisan response deadline
  const overdueArtisanResponse = await Dispute.find({
    status: 'artisan_response_pending',
    artisanResponseDeadline: { $lt: now },
    autoEscalatedAt: { $exists: false },
  });

  // Find disputes with passed customer counter deadline
  const overdueCustomerCounter = await Dispute.find({
    status: 'customer_counter_pending',
    customerCounterDeadline: { $lt: now },
    autoEscalatedAt: { $exists: false },
  });

  let escalatedCount = 0;

  // Escalate artisan no-response (favor customer)
  for (const dispute of overdueArtisanResponse) {
    dispute.status = 'escalated';
    dispute.autoEscalatedAt = now;
    dispute.addTimelineEvent(
      'Auto-escalated',
      dispute.customer,
      'Artisan did not respond within 48 hours'
    );
    await dispute.save();

    await createNotification(dispute.customer.toString(), {
      type: 'dispute_escalated' as any,
      title: 'Dispute Escalated',
      message: 'The artisan did not respond. Your dispute has been escalated for admin review.',
      link: `/dashboard/customer/disputes/${dispute._id}`,
      data: { disputeId: dispute._id },
    });

    escalatedCount++;
  }

  // Move to review if customer doesn't counter
  for (const dispute of overdueCustomerCounter) {
    dispute.status = 'under_review';
    dispute.autoEscalatedAt = now;
    dispute.addTimelineEvent(
      'Moved to review',
      dispute.artisan,
      'Customer did not submit counter within 72 hours'
    );
    await dispute.save();

    escalatedCount++;
  }

  if (escalatedCount > 0) {
    log.info('Disputes auto-escalated', { count: escalatedCount });
  }

  return escalatedCount;
}

/**
 * Get dispute with full details
 */
export async function getDisputeWithDetails(disputeId: string): Promise<IDispute | null> {
  return Dispute.findById(disputeId)
    .populate('customer', 'firstName lastName email phone')
    .populate('artisan', 'firstName lastName email phone')
    .populate('contract', 'title totalAmount')
    .populate('assignedAdmin', 'firstName lastName');
}

export default {
  openDispute,
  submitArtisanResponse,
  submitCustomerCounter,
  addEvidence,
  resolveDispute,
  escalateOverdueDisputes,
  getDisputeWithDetails,
};
