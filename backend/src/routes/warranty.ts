import { Router } from 'express';
import { warrantyClaimSchema, warrantyResponseSchema } from '@korrectng/shared';
import { WarrantyClaim, ArtisanProfile } from '../models';
import { protect, authorize, requireVerifiedEmail, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { warrantyLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/warranty/claim
router.post('/claim', warrantyLimiter, protect, authorize('customer'), requireVerifiedEmail, validate(warrantyClaimSchema), async (req: AuthRequest, res, next) => {
  try {
    const { artisanId, jobDescription, issueDescription } = req.body;

    const artisan = await ArtisanProfile.findById(artisanId);
    if (!artisan) throw new AppError('Artisan not found', 404);

    const claim = await WarrantyClaim.create({
      customer: req.user!._id,
      artisan: artisanId,
      jobDescription,
      issueDescription,
    });

    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/warranty/my-claims
router.get('/my-claims', protect, async (req: AuthRequest, res, next) => {
  try {
    const claims = await WarrantyClaim.find({ customer: req.user!._id })
      .populate({
        path: 'artisan',
        select: 'businessName trade slug',
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: claims });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/warranty/claims-against-me
router.get('/claims-against-me', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const claims = await WarrantyClaim.find({ artisan: artisan._id })
      .populate('customer', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: claims });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/warranty/:id/respond
router.patch('/:id/respond', protect, authorize('artisan'), validate(warrantyResponseSchema), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const claim = await WarrantyClaim.findById(req.params.id);
    if (!claim) throw new AppError('Claim not found', 404);
    if (claim.artisan.toString() !== artisan._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    claim.artisanResponse = req.body.response;
    if (req.body.status) {
      claim.status = req.body.status;
      if (req.body.status === 'resolved') {
        claim.resolvedAt = new Date();
        claim.resolution = req.body.response;
      }
    }
    await claim.save();

    res.status(200).json({ success: true, data: claim });
  } catch (error) {
    next(error);
  }
});

export default router;
