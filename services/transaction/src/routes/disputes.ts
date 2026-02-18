import { Router, Request, Response } from 'express';
import { Dispute, EscrowPayment, JobContract } from '../models';
import { Logger } from '@korrect/logger';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';
import { DISPUTE_DEADLINES } from '@korrectng/shared';

const router = Router();

// GET /api/v1/disputes - List user's disputes
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const disputes = await Dispute.find({
      $or: [{ customer: userId }, { artisan: userId }],
    }).sort({ createdAt: -1 }).lean();

    res.json({ success: true, data: disputes });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('List disputes error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/disputes - Open dispute
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;
    const { escrowId, category, reason, description, evidence } = req.body;

    const escrow = await EscrowPayment.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ success: false, error: 'Escrow not found' });
    }

    if (escrow.customer.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Only customer can open dispute' });
    }

    if (escrow.status === 'completed' || escrow.status === 'disputed') {
      return res.status(400).json({ success: false, error: 'Cannot dispute in current status' });
    }

    const contract = await JobContract.findById(escrow.contract);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    const artisanResponseDeadline = new Date(Date.now() + DISPUTE_DEADLINES.artisanResponse * 60 * 60 * 1000);

    const dispute = await Dispute.create({
      contract: escrow.contract,
      escrow: escrowId,
      booking: escrow.booking,
      customer: escrow.customer,
      artisan: escrow.artisan,
      category,
      reason,
      description,
      customerEvidence: evidence || [],
      artisanResponseDeadline,
      status: 'artisan_response_pending',
    });

    // Update escrow status
    escrow.status = 'disputed';
    escrow.dispute = dispute._id;
    await escrow.save();

    // Update contract status
    contract.status = 'disputed';
    await contract.save();

    // Publish event
    try {
      await eventBus.publish(EVENT_TYPES.DISPUTE_OPENED, {
        disputeId: dispute._id.toString(),
        contractId: escrow.contract.toString(),
        escrowId: escrowId,
        customerId: escrow.customer.toString(),
        artisanId: escrow.artisan.toString(),
        category,
        reason,
      });
    } catch (eventError) {
      logger.error('Failed to publish dispute.opened event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Open dispute error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/disputes/:id/respond - Artisan responds to dispute
router.post('/:id/respond', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found' });
    }

    if (dispute.artisan.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Only artisan can respond' });
    }

    if (dispute.status !== 'artisan_response_pending') {
      return res.status(400).json({ success: false, error: 'Cannot respond in current status' });
    }

    const { content, evidence } = req.body;

    dispute.artisanResponse = { content, respondedAt: new Date() };
    if (evidence) dispute.artisanEvidence = evidence;
    dispute.status = 'customer_counter_pending';
    dispute.customerCounterDeadline = new Date(Date.now() + DISPUTE_DEADLINES.customerCounter * 60 * 60 * 1000);

    await dispute.save();

    res.json({ success: true, data: dispute });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Respond to dispute error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/disputes/:id/resolve (Admin)
router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    // TODO: Check admin role
    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;
    const { decision, notes, customerRefundAmount, artisanPaymentAmount } = req.body;

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found' });
    }

    dispute.status = 'resolved';
    dispute.decision = decision;
    dispute.decisionDetails = {
      madeBy: userId as any,
      madeAt: new Date(),
      notes,
      customerRefundAmount,
      artisanPaymentAmount,
    };

    await dispute.save();

    // Publish event
    try {
      await eventBus.publish(EVENT_TYPES.DISPUTE_RESOLVED, {
        disputeId: dispute._id.toString(),
        contractId: dispute.contract.toString(),
        decision,
        customerRefund: customerRefundAmount,
        artisanPayment: artisanPaymentAmount,
      });
    } catch (eventError) {
      logger.error('Failed to publish dispute.resolved event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.json({ success: true, data: dispute });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Resolve dispute error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
