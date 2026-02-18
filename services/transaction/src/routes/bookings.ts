import { Router, Request, Response } from 'express';
import { Booking } from '../models';
import { Logger } from '@korrect/logger';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';

const router = Router();

// GET /api/v1/bookings - List user's bookings
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { role = 'customer', status, page = 1, limit = 10 } = req.query;
    const query: any = role === 'artisan' ? { artisan: userId } : { customer: userId };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('List bookings error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/bookings - Create booking
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;
    const { artisanId, artisanProfileId, service, description, proposedDate, proposedTime, location, estimatedPrice, customerNotes } = req.body;

    const booking = await Booking.create({
      customer: userId,
      artisan: artisanId,
      artisanProfile: artisanProfileId,
      service,
      description,
      proposedDate,
      proposedTime,
      location,
      estimatedPrice,
      customerNotes,
    });

    // Publish event
    try {
      await eventBus.publish(EVENT_TYPES.BOOKING_CREATED, {
        bookingId: booking._id.toString(),
        customerId: userId,
        artisanId,
        artisanProfileId,
        service,
        status: 'pending',
      });
    } catch (eventError) {
      logger.error('Failed to publish booking.created event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create booking error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/bookings/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Check authorization
    if (booking.customer.toString() !== userId && booking.artisan.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get booking error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/bookings/:id/accept
router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.artisan.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Only artisan can accept' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Booking cannot be accepted' });
    }

    const { finalPrice, artisanNotes } = req.body;
    booking.status = 'accepted';
    booking.acceptedAt = new Date();
    if (finalPrice) booking.finalPrice = finalPrice;
    if (artisanNotes) booking.artisanNotes = artisanNotes;
    await booking.save();

    res.json({ success: true, data: booking });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Accept booking error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/bookings/:id/cancel
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const isCustomer = booking.customer.toString() === userId;
    const isArtisan = booking.artisan.toString() === userId;

    if (!isCustomer && !isArtisan) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({ success: false, error: 'Booking cannot be cancelled' });
    }

    const { reason } = req.body;
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = isCustomer ? 'customer' : 'artisan';
    booking.cancellationReason = reason;
    await booking.save();

    // Publish event
    try {
      await eventBus.publish(EVENT_TYPES.BOOKING_CANCELLED, {
        bookingId: booking._id.toString(),
        customerId: booking.customer.toString(),
        artisanId: booking.artisan.toString(),
        cancelledBy: booking.cancelledBy,
        reason,
      });
    } catch (eventError) {
      logger.error('Failed to publish booking.cancelled event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Cancel booking error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
