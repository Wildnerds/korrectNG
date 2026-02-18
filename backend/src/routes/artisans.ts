import { Router, Response } from 'express';
import { artisanProfileSchema, artisanSearchSchema } from '@korrectng/shared';
import { slugify } from '@korrectng/shared';
import { ArtisanProfile, SearchLog } from '../models';
import { protect, authorize, requireVerifiedEmail, AuthRequest } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

// GET /api/v1/artisans - Search & list artisans
router.get('/', searchLimiter, validateQuery(artisanSearchSchema), async (req, res, next) => {
  try {
    const { trade, location, q, sort, page, limit } = req.query as any;

    const filter: any = {
      isPublished: true,
      verificationStatus: 'approved',
      // subscriptionActive: true, // TODO: Re-enable when ready to monetize
    };

    if (trade) filter.trade = trade;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (q) filter.$text = { $search: q };

    let sortObj: any = { averageRating: -1 };
    if (sort === 'reviews') sortObj = { totalReviews: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 12;
    const skip = (pageNum - 1) * limitNum;

    const [artisans, total] = await Promise.all([
      ArtisanProfile.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'firstName lastName avatar'),
      ArtisanProfile.countDocuments(filter),
    ]);

    // Log search asynchronously
    SearchLog.create({
      trade: trade || undefined,
      location: location || undefined,
      query: q || undefined,
      resultsCount: total,
      source: 'web',
    }).catch(() => {});

    res.status(200).json({
      success: true,
      data: {
        data: artisans,
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

// GET /api/v1/artisans/my-profile - Get current artisan's own profile
router.get('/my-profile', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id }).populate(
      'user',
      'firstName lastName avatar email'
    );

    if (!artisan) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: artisan });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/artisans/featured
router.get('/featured', async (_req, res, next) => {
  try {
    const artisans = await ArtisanProfile.find({
      isPublished: true,
      verificationStatus: 'approved',
      // subscriptionActive: true, // TODO: Re-enable when ready to monetize
      averageRating: { $gte: 4.0 },
    })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(6)
      .populate('user', 'firstName lastName avatar');

    res.status(200).json({ success: true, data: artisans });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/artisans/:slugOrId - Supports both slug and ObjectId
router.get('/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;

    // Try to find by slug first, then by ID if it looks like an ObjectId
    let artisan = await ArtisanProfile.findOne({ slug: slugOrId }).populate(
      'user',
      'firstName lastName avatar'
    );

    // If not found by slug and param looks like an ObjectId, try by ID
    if (!artisan && slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      artisan = await ArtisanProfile.findById(slugOrId).populate(
        'user',
        'firstName lastName avatar'
      );
    }

    if (!artisan) {
      throw new AppError('Artisan not found', 404);
    }
    res.status(200).json({ success: true, data: artisan });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/artisans/profile - Update or create own profile
router.patch(
  '/profile',
  protect,
  authorize('artisan'),
  validate(artisanProfileSchema.partial()),
  async (req: AuthRequest, res, next) => {
    try {
      let updateData = { ...req.body };

      // Generate slug if business name provided
      if (updateData.businessName) {
        const baseSlug = slugify(`${updateData.businessName} ${updateData.location || ''}`);
        updateData.slug = baseSlug;
      }

      // Try to find existing profile
      let artisan = await ArtisanProfile.findOne({ user: req.user!._id });

      if (artisan) {
        // Update existing profile
        Object.assign(artisan, updateData);
        await artisan.save();
      } else {
        // Create new profile - requires minimum fields
        if (!updateData.businessName || !updateData.trade || !updateData.description ||
            !updateData.location || !updateData.address || !updateData.whatsappNumber ||
            !updateData.phoneNumber) {
          throw new AppError('All required fields must be provided for new profile', 400);
        }
        artisan = await ArtisanProfile.create({
          user: req.user!._id,
          ...updateData,
          verificationStatus: 'pending',
          isPublished: false,
          averageRating: 0,
          totalReviews: 0,
          jobsCompleted: 0,
          galleryImages: [],
          workingHours: '8am - 6pm',
          subscriptionActive: false,
        });
      }

      res.status(200).json({ success: true, data: artisan });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/artisans/gallery - Add gallery images
router.post('/gallery', protect, authorize('artisan'), requireVerifiedEmail, async (req: AuthRequest, res, next) => {
  try {
    const { images } = req.body; // Array of { url, publicId, caption, category }
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) {
      throw new AppError('Artisan profile not found', 404);
    }
    if (artisan.galleryImages.length + images.length > 20) {
      throw new AppError('Maximum 20 gallery images allowed', 400);
    }
    // Assign order based on current length
    const startOrder = artisan.galleryImages.length;
    const newImages = images.map((img: any, idx: number) => ({
      ...img,
      order: startOrder + idx,
      category: img.category || 'other',
    }));
    artisan.galleryImages.push(...newImages);
    await artisan.save();
    res.status(200).json({ success: true, data: artisan });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/artisans/gallery/:publicId - Update a gallery image (caption, category)
router.patch('/gallery/:publicId', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { caption, category } = req.body;
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const image = artisan.galleryImages.find((img) => img.publicId === req.params.publicId);
    if (!image) throw new AppError('Image not found', 404);

    if (caption !== undefined) image.caption = caption;
    if (category !== undefined) image.category = category;

    await artisan.save();
    res.status(200).json({ success: true, data: artisan });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/artisans/gallery/reorder - Reorder gallery images
router.put('/gallery/reorder', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { order } = req.body; // Array of publicIds in new order
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    // Create a map of publicId to image
    const imageMap = new Map(artisan.galleryImages.map((img) => [img.publicId, img]));

    // Reorder based on the provided order
    const reordered = order
      .map((publicId: string, idx: number) => {
        const img = imageMap.get(publicId);
        if (img) {
          img.order = idx;
          return img;
        }
        return null;
      })
      .filter(Boolean);

    artisan.galleryImages = reordered;
    await artisan.save();
    res.status(200).json({ success: true, data: artisan });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/artisans/gallery/:publicId - Remove gallery image
router.delete('/gallery/:publicId', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    artisan.galleryImages = artisan.galleryImages.filter(
      (img) => img.publicId !== req.params.publicId
    );
    // Re-assign order after deletion
    artisan.galleryImages.forEach((img, idx) => {
      img.order = idx;
    });
    await artisan.save();
    res.status(200).json({ success: true, data: artisan });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/artisans/:id/bookmark - Toggle bookmark
router.post('/:id/bookmark', protect, requireVerifiedEmail, async (req: AuthRequest, res, next) => {
  try {
    const artisanId = req.params.id;
    const user = req.user!;
    const idx = user.bookmarkedArtisans.findIndex((id: any) => id.toString() === artisanId);

    if (idx > -1) {
      user.bookmarkedArtisans.splice(idx, 1);
    } else {
      user.bookmarkedArtisans.push(artisanId as any);
    }
    await user.save();

    res.status(200).json({
      success: true,
      data: { bookmarked: idx === -1, bookmarkedArtisans: user.bookmarkedArtisans },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
