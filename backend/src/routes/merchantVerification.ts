import { Router } from 'express';
import { MerchantVerificationApplication, MerchantProfile } from '../models';
import { protect, authorize, requireProfileComplete, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { verificationLimiter, uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/merchant-verification/apply
router.post('/apply', verificationLimiter, protect, authorize('merchant'), requireProfileComplete('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchant = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchant) throw new AppError('Create a merchant profile first', 400);

    const existing = await MerchantVerificationApplication.findOne({ merchant: merchant._id });
    if (existing) throw new AppError('Application already exists', 400);

    const application = await MerchantVerificationApplication.create({
      merchant: merchant._id,
      paymentStatus: 'paid', // Verification is free - platform takes 5% from transactions
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/merchant-verification/my-application
router.get('/my-application', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchant = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchant) throw new AppError('Merchant profile not found', 404);

    const application = await MerchantVerificationApplication.findOne({ merchant: merchant._id });
    if (!application) throw new AppError('No application found', 404);

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/merchant-verification/step/:step
router.patch('/step/:step', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchant = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchant) throw new AppError('Merchant profile not found', 404);

    const application = await MerchantVerificationApplication.findOne({ merchant: merchant._id });
    if (!application) throw new AppError('No application found', 404);

    const validSteps = ['business-info', 'documents', 'review'];
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

// POST /api/v1/merchant-verification/upload-document
router.post('/upload-document', uploadLimiter, protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const { type, url, publicId, validationResult } = req.body;
    if (!type || !url || !publicId) {
      throw new AppError('type, url, and publicId are required', 400);
    }

    const validTypes = ['govtId', 'cacDocument', 'businessPermit', 'storePhotos'];
    if (!validTypes.includes(type)) {
      throw new AppError('Invalid document type', 400);
    }

    const merchant = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchant) throw new AppError('Merchant profile not found', 404);

    const application = await MerchantVerificationApplication.findOne({ merchant: merchant._id });
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

// POST /api/v1/merchant-verification/submit
router.post('/submit', verificationLimiter, protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const merchant = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchant) throw new AppError('Merchant profile not found', 404);

    const application = await MerchantVerificationApplication.findOne({ merchant: merchant._id });
    if (!application) throw new AppError('No application found', 404);

    // Validate all required documents
    const hasGovtId = application.documents.some((d) => d.type === 'govtId');
    const hasCAC = application.documents.some((d) => d.type === 'cacDocument');
    const hasBusinessPermit = application.documents.some((d) => d.type === 'businessPermit');

    // Either CAC or business permit is required
    if (!hasGovtId) {
      throw new AppError('Government ID is required', 400);
    }
    if (!hasCAC && !hasBusinessPermit) {
      throw new AppError('CAC document or business permit is required', 400);
    }

    application.status = 'in-review';
    application.currentStep = 'review';
    await application.save();

    merchant.verificationStatus = 'in-review';
    await merchant.save();

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
});

export default router;
