import { Router } from 'express';
import { VerificationApplication, ArtisanProfile } from '../models';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validateDocument, isAutomatedVerificationAvailable, getProvider } from '../services';
import { verificationLimiter, uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/verification/apply
router.post('/apply', verificationLimiter, protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Create an artisan profile first', 400);

    const existing = await VerificationApplication.findOne({ artisan: artisan._id });
    if (existing) throw new AppError('Application already exists', 400);

    const application = await VerificationApplication.create({
      artisan: artisan._id,
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/verification/my-application
router.get('/my-application', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const application = await VerificationApplication.findOne({ artisan: artisan._id });
    if (!application) throw new AppError('No application found', 404);

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/verification/step/:step
router.patch('/step/:step', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const application = await VerificationApplication.findOne({ artisan: artisan._id });
    if (!application) throw new AppError('No application found', 404);

    const validSteps = ['personal-info', 'documents', 'review'];
    if (!validSteps.includes(req.params.step)) {
      throw new AppError('Invalid step', 400);
    }

    application.currentStep = req.params.step as any;
    await application.save();
    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/verification/upload-document
router.post('/upload-document', uploadLimiter, protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { type, url, publicId, validationResult } = req.body;
    if (!type || !url || !publicId) {
      throw new AppError('type, url, and publicId are required', 400);
    }

    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const application = await VerificationApplication.findOne({ artisan: artisan._id });
    if (!application) throw new AppError('No application found', 404);

    // Remove existing document of same type, then add new
    application.documents = application.documents.filter((d) => d.type !== type);
    application.documents.push({
      type,
      url,
      publicId,
      validationResult: validationResult || null,
    });
    await application.save();

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/verification/validate-document - Validate a document before/after upload
router.post('/validate-document', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { imageUrl, documentType } = req.body;
    if (!imageUrl || !documentType) {
      throw new AppError('imageUrl and documentType are required', 400);
    }

    // Fetch the image and validate it
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new AppError('Failed to fetch image for validation', 400);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const validationResult = await validateDocument(buffer, documentType);

    res.status(200).json({
      success: true,
      data: {
        ...validationResult,
        documentType,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/verification/status - Get verification system status
router.get('/status', async (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      automatedVerification: isAutomatedVerificationAvailable(),
      provider: getProvider(),
      message: isAutomatedVerificationAvailable()
        ? 'Automated ID verification is enabled'
        : 'Manual verification mode - documents will be reviewed by admin',
    },
  });
});

// POST /api/v1/verification/submit
router.post('/submit', verificationLimiter, protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const application = await VerificationApplication.findOne({ artisan: artisan._id });
    if (!application) throw new AppError('No application found', 404);

    // Validate all required documents
    const hasGovtId = application.documents.some((d) => d.type === 'govtId');
    const hasTradeCredential = application.documents.some((d) => d.type === 'tradeCredential');
    if (!hasGovtId || !hasTradeCredential) {
      throw new AppError('Government ID and trade credential are required', 400);
    }

    // Payment is no longer required before verification
    // Artisans can pay later after approval to get listed

    application.status = 'in-review';
    application.currentStep = 'review';
    await application.save();

    artisan.verificationStatus = 'in-review';
    await artisan.save();

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/verification/init-payment - Initialize Paystack payment for verification fee
router.post('/init-payment', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const application = await VerificationApplication.findOne({ artisan: artisan._id });
    if (!application) throw new AppError('No application found', 404);

    if (application.paymentStatus === 'paid') {
      throw new AppError('Verification fee already paid', 400);
    }

    // Initialize Paystack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user!.email,
        amount: 10000 * 100, // Paystack uses kobo
        currency: 'NGN',
        reference: `VER-${artisan._id}-${Date.now()}`,
        callback_url: `${process.env.CLIENT_URL}/dashboard/artisan/verification?step=payment`,
        metadata: {
          type: 'verification',
          artisanId: artisan._id.toString(),
          applicationId: application._id.toString(),
        },
      }),
    });

    const data = await response.json();
    if (!data.status) {
      throw new AppError('Failed to initialize payment', 500);
    }

    res.status(200).json({ success: true, data: data.data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/verification/verify-payment?reference=xxx
router.get('/verify-payment', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) throw new AppError('Reference is required', 400);

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });

    const data = await response.json();
    if (!data.status || data.data.status !== 'success') {
      throw new AppError('Payment verification failed', 400);
    }

    const { artisanId, applicationId } = data.data.metadata;
    const application = await VerificationApplication.findById(applicationId);
    if (!application) throw new AppError('Application not found', 404);

    application.paymentStatus = 'paid';
    application.paymentReference = reference as string;
    application.currentStep = 'review';
    await application.save();

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

export default router;
