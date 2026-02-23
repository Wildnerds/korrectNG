import { Router } from 'express';
import { warrantyClaimSchema, warrantyResponseSchema } from '@korrectng/shared';
import { WarrantyClaim, ArtisanProfile } from '../models';
import Booking from '../models/Booking';
import { protect, authorize, requireVerifiedEmail, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { warrantyLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/warranty/claim
// Warranty claims now require:
// 1. A valid bookingId
// 2. Booking was paid via escrow
// 3. Customer has certified the job
// 4. Claim is within 7-day grace period
router.post('/claim', warrantyLimiter, protect, authorize('customer'), requireVerifiedEmail, validate(warrantyClaimSchema), async (req: AuthRequest, res, next) => {
  try {
    const { bookingId, artisanId, jobDescription, issueDescription } = req.body;

    // Validate booking exists and belongs to customer
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.customer.toString() !== req.user!._id.toString()) {
      throw new AppError('This booking does not belong to you', 403);
    }

    // Validate booking was paid via escrow (paymentStatus must be 'escrow' or 'released')
    const paidViaEscrow = booking.paymentStatus === 'escrow' || booking.paymentStatus === 'released';
    if (!paidViaEscrow) {
      throw new AppError(
        'Warranty claims are only valid for bookings paid through the KorrectNG platform. Off-platform payments are not protected.',
        400
      );
    }

    // Validate customer has certified the job
    if (!booking.customerCertifiedAt) {
      throw new AppError(
        'You must certify the job completion before filing a warranty claim',
        400
      );
    }

    // Validate claim is within 7-day grace period
    const now = new Date();
    const gracePeriodExpiry = booking.gracePeriodExpiresAt || booking.warrantyExpiresAt;
    const claimWithinGracePeriod = gracePeriodExpiry ? now <= gracePeriodExpiry : false;

    if (!claimWithinGracePeriod) {
      throw new AppError(
        'The 7-day protection period has expired. Warranty claims must be filed within 7 days of job certification.',
        400
      );
    }

    const artisan = await ArtisanProfile.findById(artisanId);
    if (!artisan) throw new AppError('Artisan not found', 404);

    const claim = await WarrantyClaim.create({
      customer: req.user!._id,
      artisan: artisanId,
      booking: bookingId,
      escrowPaymentId: booking.escrow,
      paidViaEscrow: true,
      customerCertifiedAt: booking.customerCertifiedAt,
      claimWithinGracePeriod: true,
      jobDescription,
      issueDescription,
    });

    res.status(201).json({
      success: true,
      data: claim,
      message: 'Warranty claim filed successfully. The artisan has 7 days to respond and re-check the work.'
    });
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
