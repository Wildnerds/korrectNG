import { Router, Response } from 'express';
import { merchantProfileSchema, merchantSearchSchema, merchantBankAccountSchema } from '@korrectng/shared';
import { slugify } from '@korrectng/shared';
import { MerchantProfile } from '../models';
import { protect, authorize, requireVerifiedEmail, AuthRequest } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// GET /api/v1/merchants - Search & list merchants
router.get('/', searchLimiter, validateQuery(merchantSearchSchema), async (req, res, next) => {
  try {
    const { category, location, q, sort, page, limit } = req.query as any;

    const filter: any = {
      isPublished: true,
      verificationStatus: 'approved',
    };

    if (category) filter.category = category;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (q) filter.$text = { $search: q };

    let sortObj: any = { averageRating: -1 };
    if (sort === 'reviews') sortObj = { totalReviews: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'orders') sortObj = { ordersCompleted: -1 };

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const [merchants, total] = await Promise.all([
      MerchantProfile.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'firstName lastName avatar'),
      MerchantProfile.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: merchants,
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

// GET /api/v1/merchants/my-profile - Get current merchant's own profile
router.get('/my-profile', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchant = await MerchantProfile.findOne({ user: req.user!._id }).populate(
      'user',
      'firstName lastName avatar email'
    );

    if (!merchant) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: merchant });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/merchants/featured - Get featured merchants
router.get('/featured', async (_req, res, next) => {
  try {
    const merchants = await MerchantProfile.find({
      isPublished: true,
      verificationStatus: 'approved',
      averageRating: { $gte: 4.0 },
    })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(6)
      .populate('user', 'firstName lastName avatar');

    res.status(200).json({ success: true, data: merchants });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/merchants/:slugOrId - Get merchant by slug or ID
router.get('/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;

    // Try to find by slug first, then by ID if it looks like an ObjectId
    let merchant = await MerchantProfile.findOne({ slug: slugOrId }).populate(
      'user',
      'firstName lastName avatar'
    );

    // If not found by slug and param looks like an ObjectId, try by ID
    if (!merchant && slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      merchant = await MerchantProfile.findById(slugOrId).populate(
        'user',
        'firstName lastName avatar'
      );
    }

    if (!merchant) {
      throw new AppError('Merchant not found', 404);
    }
    res.status(200).json({ success: true, data: merchant });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/merchants/my-profile - Update or create own profile
router.patch(
  '/my-profile',
  protect,
  authorize('merchant'),
  validate(merchantProfileSchema.partial()),
  async (req: AuthRequest, res, next) => {
    try {
      let updateData = { ...req.body };

      // Generate slug if business name provided
      if (updateData.businessName) {
        const baseSlug = slugify(`${updateData.businessName} ${updateData.location || ''}`);
        updateData.slug = baseSlug;
      }

      // Try to find existing profile
      let merchant = await MerchantProfile.findOne({ user: req.user!._id });

      if (merchant) {
        // Update existing profile
        Object.assign(merchant, updateData);
        await merchant.save();
      } else {
        // Create new profile - requires minimum fields
        if (!updateData.businessName || !updateData.category || !updateData.description ||
            !updateData.location || !updateData.address || !updateData.whatsappNumber ||
            !updateData.phoneNumber) {
          throw new AppError('All required fields must be provided for new profile', 400);
        }
        merchant = await MerchantProfile.create({
          user: req.user!._id,
          ...updateData,
          categories: updateData.categories || [updateData.category],
          verificationStatus: 'pending',
          isPublished: false,
          averageRating: 0,
          totalReviews: 0,
          ordersCompleted: 0,
          trustScore: 50,
          trustLevel: 'bronze',
          badges: [],
          deliveryAreas: updateData.deliveryAreas || [],
          defaultDeliveryFee: updateData.defaultDeliveryFee || 0,
        });
      }

      res.status(200).json({ success: true, data: merchant });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/merchants/bank-account - Add or update bank details
router.post(
  '/bank-account',
  protect,
  authorize('merchant'),
  requireVerifiedEmail,
  validate(merchantBankAccountSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { bankCode, accountNumber, accountName } = req.body;

      const merchant = await MerchantProfile.findOne({ user: req.user!._id });
      if (!merchant) {
        throw new AppError('Merchant profile not found', 404);
      }

      // Verify account with Paystack
      const verifyResponse = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET}`,
          },
        }
      );

      const verifyData = await verifyResponse.json() as {
        status: boolean;
        message?: string;
        data?: { account_name: string };
      };

      if (!verifyData.status) {
        throw new AppError('Could not verify bank account', 400);
      }

      // Create transfer recipient
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: verifyData.data!.account_name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        }),
      });

      const recipientData = await recipientResponse.json() as {
        status: boolean;
        message?: string;
        data?: { recipient_code: string };
      };

      if (!recipientData.status) {
        throw new AppError('Could not create transfer recipient', 400);
      }

      // Update merchant with bank details
      merchant.bankCode = bankCode;
      merchant.accountNumber = accountNumber;
      merchant.accountName = verifyData.data!.account_name;
      merchant.paystackRecipientCode = recipientData.data!.recipient_code;
      await merchant.save();

      res.status(200).json({
        success: true,
        data: {
          bankCode: merchant.bankCode,
          accountNumber: merchant.accountNumber,
          accountName: merchant.accountName,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/merchants/stats - Get merchant stats
router.get('/stats/overview', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchant = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchant) {
      throw new AppError('Merchant profile not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        ordersCompleted: merchant.ordersCompleted,
        totalOrdersReceived: merchant.totalOrdersReceived,
        averageRating: merchant.averageRating,
        totalReviews: merchant.totalReviews,
        trustScore: merchant.trustScore,
        trustLevel: merchant.trustLevel,
        fulfillmentRate: merchant.fulfillmentRate,
        onTimeDeliveryRate: merchant.onTimeDeliveryRate,
        defectRate: merchant.defectRate,
        badges: merchant.badges,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
