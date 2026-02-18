import { Router } from 'express';
import { createReviewSchema, editReviewSchema, artisanResponseSchema, flagReviewSchema } from '@korrectng/shared';
import { Review, ArtisanProfile } from '../models';
import { protect, authorize, requireVerifiedEmail, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { reviewLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/v1/reviews/artisan/:artisanId
router.get('/artisan/:artisanId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sort = req.query.sort as string || 'newest';
    const skip = (page - 1) * limit;

    let sortObj: any = { createdAt: -1 };
    if (sort === 'highest') sortObj = { rating: -1 };
    else if (sort === 'lowest') sortObj = { rating: 1 };

    const [reviews, total] = await Promise.all([
      Review.find({ artisan: req.params.artisanId, isFlagged: false })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('customer', 'firstName lastName avatar'),
      Review.countDocuments({ artisan: req.params.artisanId, isFlagged: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: reviews,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/reviews
router.post('/', reviewLimiter, protect, authorize('customer'), requireVerifiedEmail, validate(createReviewSchema), async (req: AuthRequest, res, next) => {
  try {
    const { artisanId, rating, title, text, jobType } = req.body;

    // Check artisan exists
    const artisan = await ArtisanProfile.findById(artisanId);
    if (!artisan) throw new AppError('Artisan not found', 404);

    // Check for duplicate review
    const existing = await Review.findOne({ artisan: artisanId, customer: req.user!._id });
    if (existing) throw new AppError('You have already reviewed this artisan', 400);

    const review = await Review.create({
      artisan: artisanId,
      customer: req.user!._id,
      rating,
      title,
      text,
      jobType,
    });

    await review.populate('customer', 'firstName lastName avatar');
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/reviews/:id
router.patch('/:id', protect, validate(editReviewSchema), async (req: AuthRequest, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) throw new AppError('Review not found', 404);
    if (review.customer.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to edit this review', 403);
    }

    Object.assign(review, req.body);
    await review.save();
    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/reviews/:id
router.delete('/:id', protect, async (req: AuthRequest, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) throw new AppError('Review not found', 404);

    const isOwner = review.customer.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new AppError('Not authorized to delete this review', 403);
    }

    await Review.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/reviews/:id/respond - Artisan responds to review
router.post(
  '/:id/respond',
  protect,
  authorize('artisan'),
  validate(artisanResponseSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) throw new AppError('Review not found', 404);

      const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
      if (!artisan || review.artisan.toString() !== artisan._id.toString()) {
        throw new AppError('Not authorized to respond to this review', 403);
      }

      review.artisanResponse = req.body.response;
      review.artisanRespondedAt = new Date();
      await review.save();
      res.status(200).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/reviews/:id/flag
router.post('/:id/flag', protect, validate(flagReviewSchema), async (req: AuthRequest, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isFlagged: true, flagReason: req.body.reason },
      { new: true }
    );
    if (!review) throw new AppError('Review not found', 404);
    res.status(200).json({ success: true, message: 'Review flagged for review' });
  } catch (error) {
    next(error);
  }
});

export default router;
