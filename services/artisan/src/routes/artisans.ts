import { Router, Request, Response } from 'express';
import slugify from 'slugify';
import { ArtisanProfile } from '../models';
import { Logger } from '@korrect/logger';

const router = Router();

/**
 * GET /api/v1/artisans
 * List/search artisans (public)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const logger: Logger = req.app.locals.logger;
    const { trade, location, q, sort = 'rating', page = 1, limit = 10 } = req.query;

    const query: any = {
      isPublished: true,
      verificationStatus: 'approved',
      subscriptionActive: true,
    };

    if (trade) query.trade = trade;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (q) {
      query.$text = { $search: q as string };
    }

    let sortOption: any = { averageRating: -1, totalReviews: -1 };
    if (sort === 'reviews') sortOption = { totalReviews: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'trust') sortOption = { trustScore: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [artisans, total] = await Promise.all([
      ArtisanProfile.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ArtisanProfile.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: artisans,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('List artisans error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/v1/artisans/:slug
 * Get artisan by slug (public)
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const artisan = await ArtisanProfile.findOne({ slug: req.params.slug }).lean();

    if (!artisan) {
      return res.status(404).json({ success: false, error: 'Artisan not found' });
    }

    res.json({ success: true, data: artisan });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get artisan error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/artisans
 * Create artisan profile (authenticated artisan)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { trustGateway } = req.app.locals.serviceAuth;
    const logger: Logger = req.app.locals.logger;

    // Auth check via gateway headers
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    // Check if profile already exists
    const existing = await ArtisanProfile.findOne({ user: userId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Profile already exists' });
    }

    const { businessName, trade, description, location, address, whatsappNumber, phoneNumber, yearsOfExperience, workingHours } = req.body;

    // Generate slug
    const baseSlug = slugify(businessName, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (await ArtisanProfile.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const profile = await ArtisanProfile.create({
      user: userId,
      businessName,
      slug,
      trade,
      description,
      location,
      address,
      whatsappNumber,
      phoneNumber,
      yearsOfExperience: yearsOfExperience || 0,
      workingHours: workingHours || 'Mon-Sat: 8am - 6pm',
    });

    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create artisan error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * PUT /api/v1/artisans/:id
 * Update artisan profile
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const profile = await ArtisanProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    // Check ownership
    if (profile.user.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const allowedUpdates = ['description', 'address', 'whatsappNumber', 'phoneNumber', 'yearsOfExperience', 'workingHours'];
    const updates: any = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updated = await ArtisanProfile.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Update artisan error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/artisans/:id/gallery
 * Add image to gallery
 */
router.post('/:id/gallery', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const profile = await ArtisanProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (profile.user.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { url, publicId, caption, category } = req.body;

    if (!url || !publicId) {
      return res.status(400).json({ success: false, error: 'URL and publicId are required' });
    }

    profile.galleryImages.push({
      url,
      publicId,
      caption,
      category: category || 'other',
      order: profile.galleryImages.length,
    });

    await profile.save();

    res.json({ success: true, data: profile.galleryImages });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Add gallery image error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * DELETE /api/v1/artisans/:id/gallery/:imageId
 * Remove image from gallery
 */
router.delete('/:id/gallery/:imageId', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const profile = await ArtisanProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    if (profile.user.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    profile.galleryImages = profile.galleryImages.filter(
      (img: any) => img._id.toString() !== req.params.imageId
    );

    await profile.save();

    res.json({ success: true, data: profile.galleryImages });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Delete gallery image error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
