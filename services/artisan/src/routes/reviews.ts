import { Router, Request, Response } from 'express';
import { Review, ArtisanProfile } from '../models';
import { Logger } from '@korrect/logger';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';

const router = Router();

/**
 * GET /api/v1/reviews/artisan/:artisanId
 * Get reviews for an artisan
 */
router.get('/artisan/:artisanId', async (req: Request, res: Response) => {
  try {
    const { sort = 'newest', page = 1, limit = 10 } = req.query;

    let sortOption: any = { createdAt: -1 };
    if (sort === 'highest') sortOption = { rating: -1, createdAt: -1 };
    if (sort === 'lowest') sortOption = { rating: 1, createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ artisan: req.params.artisanId, isFlagged: false })
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments({ artisan: req.params.artisanId, isFlagged: false }),
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get reviews error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/reviews
 * Create a review
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;
    const { artisanId, rating, title, text, jobType } = req.body;

    // Check if artisan exists
    const artisan = await ArtisanProfile.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ success: false, error: 'Artisan not found' });
    }

    // Check if user already reviewed this artisan
    const existingReview = await Review.findOne({ artisan: artisanId, customer: userId });
    if (existingReview) {
      return res.status(400).json({ success: false, error: 'You have already reviewed this artisan' });
    }

    const review = await Review.create({
      artisan: artisanId,
      customer: userId,
      rating,
      title,
      text,
      jobType,
    });

    // Publish event
    try {
      await eventBus.publish(EVENT_TYPES.REVIEW_CREATED, {
        reviewId: review._id.toString(),
        artisanProfileId: artisanId,
        customerId: userId,
        rating,
        title,
      });
    } catch (eventError) {
      logger.error('Failed to publish review.created event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create review error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/reviews/:id/respond
 * Artisan responds to a review
 */
router.post('/:id/respond', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    // Check if user owns the artisan profile
    const artisan = await ArtisanProfile.findById(review.artisan);
    if (!artisan || artisan.user.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (review.artisanResponse) {
      return res.status(400).json({ success: false, error: 'Already responded to this review' });
    }

    const { response } = req.body;
    if (!response || response.length > 500) {
      return res.status(400).json({ success: false, error: 'Response is required and must be under 500 characters' });
    }

    review.artisanResponse = response;
    review.artisanRespondedAt = new Date();
    await review.save();

    res.json({ success: true, data: review });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Respond to review error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/reviews/:id/flag
 * Flag a review for moderation
 */
router.post('/:id/flag', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reason is required' });
    }

    review.isFlagged = true;
    review.flagReason = reason;
    await review.save();

    // Recalculate rating (flagged reviews excluded)
    await (Review as any).calcAverageRating(review.artisan);

    res.json({ success: true, message: 'Review flagged for moderation' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Flag review error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
