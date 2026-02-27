import { Router } from 'express';
import { productSchema, productSearchSchema } from '@korrectng/shared';
import { Product, MerchantProfile } from '../models';
import { protect, authorize, requireVerifiedEmail, AuthRequest } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { searchLimiter } from '../middleware/rateLimiter';
import { findMatchingProducts, getMerchantQuotesForMaterials } from '../services/materialMatchingService';

const router = Router();

// GET /api/v1/products - Search products
router.get('/', searchLimiter, validateQuery(productSearchSchema), async (req, res, next) => {
  try {
    const { category, merchant, trade, q, minPrice, maxPrice, sort, page, limit } = req.query as any;

    const filter: any = {
      isActive: true,
      isApproved: true,
    };

    if (category) filter.category = category;
    if (merchant) filter.merchant = merchant;
    if (trade) filter.compatibleTrades = trade;
    if (q) filter.$text = { $search: q };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortObj: any = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    else if (sort === 'price_desc') sortObj = { price: -1 };
    else if (sort === 'rating') sortObj = { 'merchantProfile.averageRating': -1 };

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('merchant', 'businessName slug averageRating location'),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: products,
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

// POST /api/v1/products/by-materials - Match materials list to products
router.post('/by-materials', async (req, res, next) => {
  try {
    const { materials, deliveryLocation } = req.body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      throw new AppError('Materials list is required', 400);
    }

    const results = await findMatchingProducts(materials, deliveryLocation);

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/products/merchant-quotes - Get quotes from all merchants
router.post('/merchant-quotes', async (req, res, next) => {
  try {
    const { materials, deliveryLocation } = req.body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      throw new AppError('Materials list is required', 400);
    }

    const quotes = await getMerchantQuotesForMaterials(materials, deliveryLocation);

    res.status(200).json({
      success: true,
      data: quotes,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/products/my-products - Merchant's own products
router.get('/my-products', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchantProfile = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchantProfile) {
      throw new AppError('Merchant profile not found', 404);
    }

    const { isActive, isApproved, page, limit } = req.query as any;

    const filter: any = { merchant: merchantProfile._id };
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: products,
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

// GET /api/v1/products/:id - Get product details
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('merchant', 'businessName slug averageRating totalReviews location address phoneNumber deliveryAreas defaultDeliveryFee freeDeliveryThreshold');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/products - Create product
router.post(
  '/',
  protect,
  authorize('merchant'),
  requireVerifiedEmail,
  validate(productSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const merchantProfile = await MerchantProfile.findOne({ user: req.user!._id });
      if (!merchantProfile) {
        throw new AppError('Merchant profile not found', 404);
      }

      if (merchantProfile.verificationStatus !== 'approved') {
        throw new AppError('Merchant must be verified to add products', 403);
      }

      // Generate slug
      const baseSlug = req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${baseSlug}-${randomSuffix}`;

      const product = await Product.create({
        ...req.body,
        merchant: merchantProfile._id,
        slug,
        isActive: true,
        isApproved: false, // Requires admin approval
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/products/:id - Update product
router.patch(
  '/:id',
  protect,
  authorize('merchant'),
  validate(productSchema.partial()),
  async (req: AuthRequest, res, next) => {
    try {
      const merchantProfile = await MerchantProfile.findOne({ user: req.user!._id });
      if (!merchantProfile) {
        throw new AppError('Merchant profile not found', 404);
      }

      const product = await Product.findOne({
        _id: req.params.id,
        merchant: merchantProfile._id,
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Update fields
      Object.assign(product, req.body);

      // If significant changes, mark as pending approval again
      if (req.body.name || req.body.description || req.body.price) {
        product.isApproved = false;
      }

      await product.save();

      res.status(200).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/products/:id - Delete product
router.delete('/:id', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchantProfile = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchantProfile) {
      throw new AppError('Merchant profile not found', 404);
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      merchant: merchantProfile._id,
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/products/:id/stock - Update stock quantity
router.patch('/:id/stock', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const { quantity, operation } = req.body; // operation: 'set', 'add', 'subtract'

    const merchantProfile = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchantProfile) {
      throw new AppError('Merchant profile not found', 404);
    }

    const product = await Product.findOne({
      _id: req.params.id,
      merchant: merchantProfile._id,
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    switch (operation) {
      case 'set':
        product.stockQuantity = quantity;
        break;
      case 'add':
        product.stockQuantity += quantity;
        break;
      case 'subtract':
        product.stockQuantity = Math.max(0, product.stockQuantity - quantity);
        break;
      default:
        product.stockQuantity = quantity;
    }

    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/products/:id/toggle-active - Toggle product active status
router.patch('/:id/toggle-active', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchantProfile = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchantProfile) {
      throw new AppError('Merchant profile not found', 404);
    }

    const product = await Product.findOne({
      _id: req.params.id,
      merchant: merchantProfile._id,
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

export default router;
