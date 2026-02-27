import { Router } from 'express';
import { User, ArtisanProfile, Review, VerificationApplication, Subscription, SearchLog, WarrantyClaim, MerchantProfile, MerchantVerificationApplication, Product, MaterialOrder } from '../models';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { adminLimiter } from '../middleware/rateLimiter';

const router = Router();

// All admin routes require admin role and rate limiting
router.use(adminLimiter, protect, authorize('admin'));

// GET /api/v1/admin/dashboard
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [
      totalUsers,
      totalArtisans,
      totalMerchants,
      totalReviews,
      pendingVerifications,
      pendingMerchantVerifications,
      pendingProducts,
      activeSubscriptions,
      openWarrantyClaims,
      totalMaterialOrders,
    ] = await Promise.all([
      User.countDocuments(),
      ArtisanProfile.countDocuments(),
      MerchantProfile.countDocuments(),
      Review.countDocuments(),
      VerificationApplication.countDocuments({ status: 'in-review' }),
      MerchantVerificationApplication.countDocuments({ status: 'in-review' }),
      Product.countDocuments({ isApproved: false, isActive: true }),
      Subscription.countDocuments({ status: 'active' }),
      WarrantyClaim.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      MaterialOrder.countDocuments(),
    ]);

    const [revenueAgg, merchantRevenueAgg] = await Promise.all([
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      MaterialOrder.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } },
      ]),
    ]);
    const revenue = revenueAgg[0]?.total || 0;
    const merchantRevenue = merchantRevenueAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalArtisans,
        totalMerchants,
        totalReviews,
        pendingVerifications,
        pendingMerchantVerifications,
        pendingProducts,
        activeSubscriptions,
        openWarrantyClaims,
        totalMaterialOrders,
        revenue,
        merchantRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/verifications
router.get('/verifications', async (req, res, next) => {
  try {
    const status = req.query.status as string || 'in-review';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [applications, total] = await Promise.all([
      VerificationApplication.find({ status })
        .populate({
          path: 'artisan',
          select: 'businessName trade location user',
          populate: { path: 'user', select: 'firstName lastName email phone' },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      VerificationApplication.countDocuments({ status }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: applications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/verifications/:id
router.patch('/verifications/:id', async (req: AuthRequest, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      throw new AppError('Status must be approved or rejected', 400);
    }

    const application = await VerificationApplication.findById(req.params.id);
    if (!application) throw new AppError('Application not found', 404);

    application.status = status;
    application.adminNotes = adminNotes;
    application.reviewedBy = req.user!._id;
    application.reviewedAt = new Date();
    await application.save();

    // Update artisan profile
    const artisan = await ArtisanProfile.findById(application.artisan);
    if (artisan) {
      artisan.verificationStatus = status;
      if (status === 'approved') {
        // Auto-publish verified artisans (subscription check disabled for MVP)
        artisan.isPublished = true;
      }
      await artisan.save();
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;

    const filter: any = {};
    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/artisans
router.get('/artisans', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [artisans, total] = await Promise.all([
      ArtisanProfile.find()
        .populate('user', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ArtisanProfile.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: artisans,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/flagged-reviews
router.get('/flagged-reviews', async (req, res, next) => {
  try {
    const reviews = await Review.find({ isFlagged: true })
      .populate('customer', 'firstName lastName')
      .populate('artisan', 'businessName slug')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/analytics
router.get('/analytics', async (_req, res, next) => {
  try {
    const [topTrades, topLocations, recentSearches] = await Promise.all([
      SearchLog.aggregate([
        { $match: { trade: { $ne: null } } },
        { $group: { _id: '$trade', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SearchLog.aggregate([
        { $match: { location: { $ne: null } } },
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SearchLog.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: { topTrades, topLocations, totalSearches: recentSearches },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/warranty
router.get('/warranty', async (req, res, next) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    const [claims, total] = await Promise.all([
      WarrantyClaim.find(filter)
        .populate('customer', 'firstName lastName email phone')
        .populate({
          path: 'artisan',
          select: 'businessName trade slug user',
          populate: { path: 'user', select: 'firstName lastName email phone' },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      WarrantyClaim.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: claims,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/warranty/:id
router.patch('/warranty/:id', async (req: AuthRequest, res, next) => {
  try {
    const { status, resolution, adminNotes } = req.body;

    const claim = await WarrantyClaim.findById(req.params.id);
    if (!claim) throw new AppError('Warranty claim not found', 404);

    if (status) {
      claim.status = status;
      if (status === 'resolved' || status === 'closed') {
        claim.resolvedAt = new Date();
      }
    }
    if (resolution) claim.resolution = resolution;

    await claim.save();

    res.status(200).json({ success: true, data: claim });
  } catch (error) {
    next(error);
  }
});

// ─── Merchant Admin Routes ───────────────────────────────────────────────────

// GET /api/v1/admin/merchants
router.get('/merchants', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const filter: any = {};
    if (status === 'verified') {
      filter.verificationStatus = 'approved';
    } else if (status === 'pending') {
      filter.verificationStatus = { $in: ['pending', 'in-review'] };
    }
    // 'all' - no filter

    const [merchants, total] = await Promise.all([
      MerchantProfile.find(filter)
        .populate('user', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      MerchantProfile.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: merchants,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/merchant-verifications
router.get('/merchant-verifications', async (req, res, next) => {
  try {
    const status = req.query.status as string || 'in-review';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [applications, total] = await Promise.all([
      MerchantVerificationApplication.find({ status })
        .populate({
          path: 'merchant',
          select: 'businessName category location user',
          populate: { path: 'user', select: 'firstName lastName email phone' },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      MerchantVerificationApplication.countDocuments({ status }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: applications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/merchant-verifications/:id/approve
router.post('/merchant-verifications/:id/approve', async (req: AuthRequest, res, next) => {
  try {
    const { adminNotes } = req.body;

    const application = await MerchantVerificationApplication.findById(req.params.id);
    if (!application) throw new AppError('Application not found', 404);

    application.status = 'approved';
    application.adminNotes = adminNotes;
    application.reviewedBy = req.user!._id;
    application.reviewedAt = new Date();
    await application.save();

    // Update merchant profile
    const merchant = await MerchantProfile.findById(application.merchant);
    if (merchant) {
      merchant.verificationStatus = 'approved';
      merchant.isPublished = true;
      await merchant.save();
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/merchant-verifications/:id/reject
router.post('/merchant-verifications/:id/reject', async (req: AuthRequest, res, next) => {
  try {
    const { adminNotes, reason } = req.body;

    if (!reason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const application = await MerchantVerificationApplication.findById(req.params.id);
    if (!application) throw new AppError('Application not found', 404);

    application.status = 'rejected';
    application.adminNotes = adminNotes || reason;
    application.reviewedBy = req.user!._id;
    application.reviewedAt = new Date();
    await application.save();

    // Update merchant profile
    const merchant = await MerchantProfile.findById(application.merchant);
    if (merchant) {
      merchant.verificationStatus = 'rejected';
      await merchant.save();
    }

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/products
router.get('/products', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const approval = req.query.approval as string;

    const filter: any = {};
    if (approval === 'pending') {
      filter.isApproved = false;
      filter.isActive = true;
    } else if (approval === 'approved') {
      filter.isApproved = true;
    }
    // 'all' - no filter

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('merchant', 'businessName slug verificationStatus')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: products,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/products/:id/approve
router.post('/products/:id/approve', async (req: AuthRequest, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    product.isApproved = true;
    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/products/:id/reject
router.post('/products/:id/reject', async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found', 404);

    product.isApproved = false;
    product.isActive = false;
    await product.save();

    res.status(200).json({ success: true, data: product, message: 'Product rejected' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/material-orders
router.get('/material-orders', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const filter: any = {};
    if (status && status !== 'all') filter.status = status;

    // Get stats
    const [
      total,
      pending,
      paid,
      completed,
      disputed,
      revenueAgg,
    ] = await Promise.all([
      MaterialOrder.countDocuments(),
      MaterialOrder.countDocuments({ status: 'pending' }),
      MaterialOrder.countDocuments({ status: { $in: ['paid', 'preparing', 'shipped', 'delivered'] } }),
      MaterialOrder.countDocuments({ status: 'completed' }),
      MaterialOrder.countDocuments({ status: 'disputed' }),
      MaterialOrder.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$platformFee' } } },
      ]),
    ]);

    const orders = await MaterialOrder.find(filter)
      .populate('customer', 'firstName lastName email')
      .populate('merchantProfile', 'businessName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        data: orders,
        stats: {
          total,
          pending,
          paid,
          completed,
          disputed,
          totalRevenue: revenueAgg[0]?.totalRevenue || 0,
        },
        pagination: { page, limit, total: await MaterialOrder.countDocuments(filter), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/merchant-stats
router.get('/merchant-stats', async (_req, res, next) => {
  try {
    const [totalMerchants, verifiedMerchants, pendingVerifications, totalProducts, pendingProducts, totalOrders, completedOrders] =
      await Promise.all([
        MerchantProfile.countDocuments(),
        MerchantProfile.countDocuments({ verificationStatus: 'approved' }),
        MerchantVerificationApplication.countDocuments({ status: 'in-review' }),
        Product.countDocuments(),
        Product.countDocuments({ isApproved: false, isActive: true }),
        MaterialOrder.countDocuments(),
        MaterialOrder.countDocuments({ status: 'completed' }),
      ]);

    // Calculate total merchant earnings from completed orders
    const earningsAgg = await MaterialOrder.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalEarnings: { $sum: '$merchantEarnings' }, platformFees: { $sum: '$platformFee' } } },
    ]);
    const totalEarnings = earningsAgg[0]?.totalEarnings || 0;
    const totalPlatformFees = earningsAgg[0]?.platformFees || 0;

    res.status(200).json({
      success: true,
      data: {
        totalMerchants,
        verifiedMerchants,
        pendingVerifications,
        totalProducts,
        pendingProducts,
        totalOrders,
        completedOrders,
        totalEarnings,
        totalPlatformFees,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
