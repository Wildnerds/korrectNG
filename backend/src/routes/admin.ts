import { Router } from 'express';
import { User, ArtisanProfile, Review, VerificationApplication, Subscription, SearchLog, WarrantyClaim } from '../models';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { adminLimiter } from '../middleware/rateLimiter';

const router = Router();

// All admin routes require admin role and rate limiting
router.use(adminLimiter, protect, authorize('admin'));

// GET /api/v1/admin/dashboard
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [totalUsers, totalArtisans, totalReviews, pendingVerifications, activeSubscriptions, openWarrantyClaims] =
      await Promise.all([
        User.countDocuments(),
        ArtisanProfile.countDocuments(),
        Review.countDocuments(),
        VerificationApplication.countDocuments({ status: 'in-review' }),
        Subscription.countDocuments({ status: 'active' }),
        WarrantyClaim.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      ]);

    const revenueAgg = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenue = revenueAgg[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalArtisans,
        totalReviews,
        pendingVerifications,
        activeSubscriptions,
        openWarrantyClaims,
        revenue,
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

export default router;
