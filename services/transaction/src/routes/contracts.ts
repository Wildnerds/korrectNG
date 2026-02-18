import { Router, Request, Response } from 'express';
import { JobContract, Booking } from '../models';
import { Logger } from '@korrect/logger';
import { PLATFORM_FEE_PERCENTAGE } from '@korrectng/shared';

const router = Router();

// GET /api/v1/contracts - List user's contracts
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { role = 'customer', status } = req.query;
    const query: any = role === 'artisan' ? { artisan: userId } : { customer: userId };
    if (status) query.status = status;

    const contracts = await JobContract.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: contracts });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('List contracts error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/contracts - Create contract from booking
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { bookingId, title, scopeOfWork, deliverables, exclusions, materialsResponsibility, totalAmount, startDate, estimatedEndDate, milestones } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.artisan.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Only artisan can create contract' });
    }

    const platformFee = Math.round(totalAmount * (PLATFORM_FEE_PERCENTAGE / 100));
    const artisanEarnings = totalAmount - platformFee;

    const contract = await JobContract.create({
      booking: bookingId,
      customer: booking.customer,
      artisan: booking.artisan,
      artisanProfile: booking.artisanProfile,
      title,
      scopeOfWork,
      deliverables: deliverables || [],
      exclusions: exclusions || [],
      materialsResponsibility: materialsResponsibility || 'artisan',
      totalAmount,
      platformFee,
      artisanEarnings,
      startDate,
      estimatedEndDate,
      milestones: milestones || [],
      status: 'draft',
    });

    // Link contract to booking
    booking.contract = contract._id;
    await booking.save();

    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create contract error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/contracts/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const contract = await JobContract.findById(req.params.id).lean();
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    if (contract.customer.toString() !== userId && contract.artisan.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, data: contract });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get contract error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/contracts/:id/sign
router.post('/:id/sign', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const contract = await JobContract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    const isCustomer = contract.customer.toString() === userId;
    const isArtisan = contract.artisan.toString() === userId;

    if (!isCustomer && !isArtisan) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const signature = { signedBy: userId as any, signedAt: new Date() };

    if (isCustomer) {
      if (contract.customerSignature) {
        return res.status(400).json({ success: false, error: 'Already signed' });
      }
      contract.customerSignature = signature;
    } else {
      if (contract.artisanSignature) {
        return res.status(400).json({ success: false, error: 'Already signed' });
      }
      contract.artisanSignature = signature;
    }

    // Check if both signed
    if (contract.customerSignature && contract.artisanSignature) {
      contract.status = 'signed';
    } else {
      contract.status = 'pending_signatures';
    }

    await contract.save();
    res.json({ success: true, data: contract });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Sign contract error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
