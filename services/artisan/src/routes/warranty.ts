import { Router, Request, Response } from 'express';
import { WarrantyClaim, ArtisanProfile } from '../models';
import { Logger } from '@korrect/logger';

const router = Router();

/**
 * GET /api/v1/warranty
 * Get warranty claims for current user (customer or artisan)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { role = 'customer' } = req.query;

    let query: any;
    if (role === 'artisan') {
      const profile = await ArtisanProfile.findOne({ user: userId });
      if (!profile) {
        return res.json({ success: true, data: [] });
      }
      query = { artisan: profile._id };
    } else {
      query = { customer: userId };
    }

    const claims = await WarrantyClaim.find(query)
      .sort({ createdAt: -1 })
      .populate('artisan', 'businessName slug')
      .lean();

    res.json({ success: true, data: claims });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get warranty claims error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/warranty
 * Create a warranty claim
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const { artisanId, jobDescription, issueDescription } = req.body;

    const artisan = await ArtisanProfile.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ success: false, error: 'Artisan not found' });
    }

    const claim = await WarrantyClaim.create({
      customer: userId,
      artisan: artisanId,
      jobDescription,
      issueDescription,
    });

    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create warranty claim error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/v1/warranty/:id
 * Get warranty claim by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const claim = await WarrantyClaim.findById(req.params.id)
      .populate('artisan', 'businessName slug user')
      .lean();

    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    // Check authorization
    const profile = await ArtisanProfile.findOne({ user: userId });
    const isCustomer = claim.customer.toString() === userId;
    const isArtisan = profile && claim.artisan._id.toString() === profile._id.toString();

    if (!isCustomer && !isArtisan) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, data: claim });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get warranty claim error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/warranty/:id/respond
 * Artisan responds to warranty claim
 */
router.post('/:id/respond', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const claim = await WarrantyClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    // Check if user is the artisan
    const profile = await ArtisanProfile.findOne({ user: userId });
    if (!profile || claim.artisan.toString() !== profile._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { response } = req.body;
    if (!response) {
      return res.status(400).json({ success: false, error: 'Response is required' });
    }

    claim.artisanResponse = response;
    claim.status = 'in-progress';
    await claim.save();

    res.json({ success: true, data: claim });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Respond to warranty claim error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/warranty/:id/resolve
 * Mark warranty claim as resolved
 */
router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const claim = await WarrantyClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    // Only customer can mark as resolved
    if (claim.customer.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Only customer can resolve claim' });
    }

    const { resolution } = req.body;

    claim.resolution = resolution || 'Issue resolved';
    claim.status = 'resolved';
    claim.resolvedAt = new Date();
    await claim.save();

    res.json({ success: true, data: claim });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Resolve warranty claim error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
