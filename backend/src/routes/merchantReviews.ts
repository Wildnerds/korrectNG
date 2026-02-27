import { Router } from 'express';
import { merchantReviewSchema, merchantReviewResponseSchema } from '@korrectng/shared';
import { MerchantReview, MaterialOrder, MerchantProfile } from '../models';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notifications';

const router = Router();

// GET /api/v1/merchant-reviews/:merchantId - Get reviews for a merchant
router.get('/:merchantId', async (req, res, next) => {
  try {
    const { page, limit, sort } = req.query as any;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    let sortObj: any = { createdAt: -1 };
    if (sort === 'highest') sortObj = { rating: -1 };
    else if (sort === 'lowest') sortObj = { rating: 1 };

    const [reviews, total] = await Promise.all([
      MerchantReview.find({
        merchantProfile: req.params.merchantId,
        isVisible: true,
        isFlagged: false,
      })
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('customer', 'firstName lastName avatar')
        .populate('order', 'orderNumber'),
      MerchantReview.countDocuments({
        merchantProfile: req.params.merchantId,
        isVisible: true,
        isFlagged: false,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/merchant-reviews - Create review
router.post(
  '/',
  protect,
  authorize('customer'),
  validate(merchantReviewSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { orderId, rating, title, text, productQualityRating, deliveryRating } = req.body;

      // Verify order exists and belongs to customer
      const order = await MaterialOrder.findById(orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.customer.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to review this order', 403);
      }

      if (order.status !== 'completed' && order.status !== 'received') {
        throw new AppError('Can only review completed orders', 400);
      }

      // Check if review already exists
      const existingReview = await MerchantReview.findOne({ order: orderId });
      if (existingReview) {
        throw new AppError('Review already exists for this order', 400);
      }

      const review = await MerchantReview.create({
        merchant: order.merchant,
        merchantProfile: order.merchantProfile,
        customer: req.user!._id,
        order: orderId,
        rating,
        title,
        text,
        productQualityRating,
        deliveryRating,
      });

      // Notify merchant
      await createNotification(order.merchant.toString(), {
        type: 'new_merchant_review' as any,
        title: 'New Review Received!',
        message: `You received a ${rating}-star review for order ${order.orderNumber}.`,
        link: `/dashboard/merchant/reviews`,
        data: { reviewId: review._id, rating },
      });

      res.status(201).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/merchant-reviews/:id/respond - Merchant responds
router.post(
  '/:id/respond',
  protect,
  authorize('merchant'),
  validate(merchantReviewResponseSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { response } = req.body;

      const review = await MerchantReview.findById(req.params.id);
      if (!review) {
        throw new AppError('Review not found', 404);
      }

      if (review.merchant.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized', 403);
      }

      if (review.merchantResponse) {
        throw new AppError('Already responded to this review', 400);
      }

      review.merchantResponse = response;
      review.merchantRespondedAt = new Date();
      await review.save();

      // Notify customer
      await createNotification(review.customer.toString(), {
        type: 'merchant_review_response' as any,
        title: 'Merchant Responded to Your Review',
        message: `A merchant responded to your review.`,
        link: `/merchant/${(await MerchantProfile.findById(review.merchantProfile))?.slug}`,
        data: { reviewId: review._id },
      });

      res.status(200).json({ success: true, data: review });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/merchant-reviews/:id/flag - Flag review
router.post('/:id/flag', protect, async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;

    const review = await MerchantReview.findById(req.params.id);
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    if (!reason || reason.length < 10) {
      throw new AppError('Reason must be at least 10 characters', 400);
    }

    review.isFlagged = true;
    review.flagReason = reason;
    await review.save();

    res.status(200).json({ success: true, message: 'Review flagged for moderation' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/merchant-reviews/my-reviews - Get reviews for current merchant
router.get('/my-reviews/list', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchant = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchant) {
      throw new AppError('Merchant profile not found', 404);
    }

    const { page, limit } = req.query as any;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      MerchantReview.find({ merchantProfile: merchant._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customer', 'firstName lastName avatar')
        .populate('order', 'orderNumber'),
      MerchantReview.countDocuments({ merchantProfile: merchant._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: reviews,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
