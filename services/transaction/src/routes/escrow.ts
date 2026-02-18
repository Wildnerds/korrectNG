import { Router, Request, Response } from 'express';
import { EscrowPayment, JobContract, Booking } from '../models';
import { Logger } from '@korrect/logger';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';

const router = Router();

// GET /api/v1/escrow/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const escrow = await EscrowPayment.findById(req.params.id).lean();
    if (!escrow) {
      return res.status(404).json({ success: false, error: 'Escrow not found' });
    }

    if (escrow.customer.toString() !== userId && escrow.artisan.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, data: escrow });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get escrow error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/escrow - Create escrow for contract
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { contractId } = req.body;

    const contract = await JobContract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    if (contract.status !== 'signed') {
      return res.status(400).json({ success: false, error: 'Contract must be signed first' });
    }

    // Check if escrow already exists
    const existing = await EscrowPayment.findOne({ contract: contractId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Escrow already exists for this contract' });
    }

    const escrow = await EscrowPayment.create({
      contract: contractId,
      booking: contract.booking,
      customer: contract.customer,
      artisan: contract.artisan,
      totalAmount: contract.totalAmount,
      platformFee: contract.platformFee,
      status: 'created',
    });

    // Link to booking
    const booking = await Booking.findById(contract.booking);
    if (booking) {
      booking.escrow = escrow._id;
      await booking.save();
    }

    res.status(201).json({ success: true, data: escrow });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create escrow error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/escrow/:id/release - Release milestone payment
router.post('/:id/release', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;
    const { milestone, amount } = req.body;

    const escrow = await EscrowPayment.findById(req.params.id);
    if (!escrow) {
      return res.status(404).json({ success: false, error: 'Escrow not found' });
    }

    if (escrow.customer.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Only customer can release funds' });
    }

    if (escrow.status === 'disputed' || escrow.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Cannot release funds in current status' });
    }

    escrow.releases.push({
      milestone,
      amount,
      releasedAt: new Date(),
      releasedBy: userId as any,
    });

    escrow.releasedAmount += amount;

    // Update status based on releases
    if (escrow.releasedAmount >= escrow.totalAmount - escrow.platformFee) {
      escrow.status = 'completed';
    }

    await escrow.save();

    // Publish event
    try {
      await eventBus.publish(EVENT_TYPES.ESCROW_RELEASED, {
        escrowId: escrow._id.toString(),
        contractId: escrow.contract.toString(),
        milestone,
        amount,
        artisanId: escrow.artisan.toString(),
      });
    } catch (eventError) {
      logger.error('Failed to publish escrow.released event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.json({ success: true, data: escrow });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Release escrow error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
