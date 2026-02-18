import { Router, Request, Response, NextFunction } from 'express';
import { protect } from '../middleware/auth';
import TermsAcceptance from '../models/TermsAcceptance';
import {
  CURRENT_TERMS_VERSION,
  getTermsContent,
  getPrivacyPolicyContent,
} from '../data/legalContent';
import { log } from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/v1/legal/terms
 * @desc    Get current terms of service
 * @access  Public
 */
router.get('/terms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const terms = getTermsContent();

    res.status(200).json({
      success: true,
      data: {
        version: terms.version,
        effectiveDate: terms.effectiveDate,
        content: terms.content,
        keyChanges: terms.keyChanges,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/legal/privacy
 * @desc    Get privacy policy
 * @access  Public
 */
router.get('/privacy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const privacy = getPrivacyPolicyContent();

    res.status(200).json({
      success: true,
      data: {
        version: privacy.version,
        effectiveDate: privacy.effectiveDate,
        content: privacy.content,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/legal/current-version
 * @desc    Get current terms version
 * @access  Public
 */
router.get('/current-version', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        version: CURRENT_TERMS_VERSION,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/legal/acceptance-status
 * @desc    Check if user has accepted current terms
 * @access  Private
 */
router.get('/acceptance-status', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;

    const hasAccepted = await TermsAcceptance.hasAccepted(userId, CURRENT_TERMS_VERSION);
    const latestAcceptance = await TermsAcceptance.getLatestAcceptance(userId);

    res.status(200).json({
      success: true,
      data: {
        currentVersion: CURRENT_TERMS_VERSION,
        hasAcceptedCurrentVersion: hasAccepted,
        latestAcceptedVersion: latestAcceptance?.termsVersion || null,
        latestAcceptedAt: latestAcceptance?.acceptedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/legal/accept-terms
 * @desc    Accept current terms of service
 * @access  Private
 */
router.post('/accept-terms', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;

    // Check if already accepted this version
    const alreadyAccepted = await TermsAcceptance.hasAccepted(userId, CURRENT_TERMS_VERSION);
    if (alreadyAccepted) {
      return res.status(200).json({
        success: true,
        message: 'Terms already accepted',
        data: {
          version: CURRENT_TERMS_VERSION,
        },
      });
    }

    // Get client info
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create acceptance record
    const acceptance = await TermsAcceptance.create({
      user: userId,
      termsVersion: CURRENT_TERMS_VERSION,
      acceptedAt: new Date(),
      ipAddress,
      userAgent,
    });

    log.info('Terms accepted', {
      userId: userId.toString(),
      version: CURRENT_TERMS_VERSION,
      ipAddress,
    });

    res.status(201).json({
      success: true,
      message: 'Terms accepted successfully',
      data: {
        version: acceptance.termsVersion,
        acceptedAt: acceptance.acceptedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/legal/my-acceptances
 * @desc    Get user's terms acceptance history
 * @access  Private
 */
router.get('/my-acceptances', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;

    const acceptances = await TermsAcceptance.getUserAcceptances(userId);

    res.status(200).json({
      success: true,
      data: acceptances.map(a => ({
        version: a.termsVersion,
        acceptedAt: a.acceptedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
