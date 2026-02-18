import { Router, Request, Response } from 'express';
import { VerificationApplication, ArtisanProfile } from '../models';
import { Logger } from '@korrect/logger';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';

const router = Router();

/**
 * GET /api/v1/verification
 * Get current user's verification application
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const profile = await ArtisanProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Artisan profile not found' });
    }

    const application = await VerificationApplication.findOne({ artisan: profile._id });

    res.json({ success: true, data: application });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get verification error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/verification
 * Create or update verification application
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;

    const profile = await ArtisanProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Artisan profile not found' });
    }

    let application = await VerificationApplication.findOne({ artisan: profile._id });

    if (application) {
      // Update existing
      const { documents, currentStep } = req.body;
      if (documents) application.documents = documents;
      if (currentStep) application.currentStep = currentStep;
      await application.save();
    } else {
      // Create new
      application = await VerificationApplication.create({
        artisan: profile._id,
        documents: req.body.documents || [],
        currentStep: req.body.currentStep || 'personal-info',
      });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create/update verification error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/verification/submit
 * Submit verification for review
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;

    const profile = await ArtisanProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Artisan profile not found' });
    }

    const application = await VerificationApplication.findOne({ artisan: profile._id });
    if (!application) {
      return res.status(404).json({ success: false, error: 'No verification application found' });
    }

    // Check required documents
    const hasGovtId = application.documents.some(d => d.type === 'govtId');
    const hasTradeCredential = application.documents.some(d => d.type === 'tradeCredential');

    if (!hasGovtId || !hasTradeCredential) {
      return res.status(400).json({
        success: false,
        error: 'Government ID and trade credential are required',
      });
    }

    application.status = 'in-review';
    application.currentStep = 'review';
    await application.save();

    // Update profile status
    profile.verificationStatus = 'in-review';
    await profile.save();

    // Publish event
    try {
      await eventBus.publish(EVENT_TYPES.VERIFICATION_SUBMITTED, {
        applicationId: application._id.toString(),
        artisanProfileId: profile._id.toString(),
        userId,
      });
    } catch (eventError) {
      logger.error('Failed to publish verification.submitted event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.json({ success: true, data: application });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Submit verification error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/verification/:id/approve (Admin only)
 * Approve verification application
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    // TODO: Check admin role via users service

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;

    const application = await VerificationApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    application.status = 'approved';
    application.reviewedBy = userId as any;
    application.reviewedAt = new Date();
    application.adminNotes = req.body.notes;
    await application.save();

    // Update profile
    const profile = await ArtisanProfile.findById(application.artisan);
    if (profile) {
      profile.verificationStatus = 'approved';
      await profile.save();

      // Publish event
      try {
        await eventBus.publish(EVENT_TYPES.VERIFICATION_APPROVED, {
          applicationId: application._id.toString(),
          artisanProfileId: profile._id.toString(),
          userId: profile.user.toString(),
        });
      } catch (eventError) {
        logger.error('Failed to publish verification.approved event', { error: eventError instanceof Error ? eventError.message : eventError });
      }
    }

    res.json({ success: true, data: application });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Approve verification error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/v1/verification/:id/reject (Admin only)
 * Reject verification application
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;

    const application = await VerificationApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' });
    }

    application.status = 'rejected';
    application.reviewedBy = userId as any;
    application.reviewedAt = new Date();
    application.adminNotes = reason;
    await application.save();

    // Update profile
    const profile = await ArtisanProfile.findById(application.artisan);
    if (profile) {
      profile.verificationStatus = 'rejected';
      await profile.save();

      // Publish event
      try {
        await eventBus.publish(EVENT_TYPES.VERIFICATION_REJECTED, {
          applicationId: application._id.toString(),
          artisanProfileId: profile._id.toString(),
          userId: profile.user.toString(),
          reason,
        });
      } catch (eventError) {
        logger.error('Failed to publish verification.rejected event', { error: eventError instanceof Error ? eventError.message : eventError });
      }
    }

    res.json({ success: true, data: application });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Reject verification error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
