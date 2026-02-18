import { Router, Request, Response } from 'express';
import { TermsAcceptance } from '../models';
import { Logger } from '@korrect/logger';

const router = Router();

// Current terms versions
const TERMS_VERSIONS = {
  terms_of_service: '2024-01-15',
  privacy_policy: '2024-01-15',
  artisan_agreement: '2024-01-15',
  customer_agreement: '2024-01-15',
};

// GET /api/v1/legal/terms - Get current terms content
router.get('/terms', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        version: TERMS_VERSIONS.terms_of_service,
        content: `
# Terms of Service

**Effective Date: January 15, 2024**

Welcome to Korrect. By using our platform, you agree to these terms.

## 1. Acceptance of Terms
By accessing or using Korrect, you agree to be bound by these Terms of Service.

## 2. Description of Service
Korrect is a platform connecting customers with skilled artisans for various services.

## 3. User Accounts
- You must provide accurate information when creating an account
- You are responsible for maintaining the security of your account
- You must be at least 18 years old to use our services

## 4. Booking and Payments
- All payments are processed through secure escrow
- Platform fees are deducted from artisan payments
- Refunds are subject to our dispute resolution process

## 5. User Conduct
Users must not:
- Engage in fraudulent activities
- Harass or abuse other users
- Violate any applicable laws

## 6. Limitation of Liability
Korrect is not liable for disputes between customers and artisans beyond our dispute resolution process.

## 7. Changes to Terms
We may update these terms at any time. Continued use constitutes acceptance.

## 8. Contact
For questions, contact us at legal@korrect.ng
        `.trim(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/legal/privacy - Get privacy policy
router.get('/privacy', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        version: TERMS_VERSIONS.privacy_policy,
        content: `
# Privacy Policy

**Effective Date: January 15, 2024**

## 1. Information We Collect
- Personal information (name, email, phone number)
- Location data (with your consent)
- Transaction and booking history
- Device information

## 2. How We Use Your Information
- To provide and improve our services
- To process transactions and bookings
- To communicate with you
- To ensure platform safety and security

## 3. Information Sharing
We may share your information with:
- Artisans/Customers for service delivery
- Payment processors
- Law enforcement when required

## 4. Data Security
We implement industry-standard security measures to protect your data.

## 5. Your Rights
You have the right to:
- Access your personal data
- Request data correction
- Request data deletion
- Export your data

## 6. Cookies
We use cookies to improve your experience and analyze platform usage.

## 7. Contact
For privacy concerns, contact privacy@korrect.ng
        `.trim(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/legal/artisan-agreement - Get artisan agreement
router.get('/artisan-agreement', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        version: TERMS_VERSIONS.artisan_agreement,
        content: `
# Artisan Service Agreement

**Effective Date: January 15, 2024**

## 1. Eligibility
- You must be a skilled professional in your trade
- You must have valid identification
- You must be legally authorized to work in Nigeria

## 2. Service Standards
- Provide services as described in your profile
- Maintain professional conduct at all times
- Complete jobs within agreed timeframes
- Communicate promptly with customers

## 3. Verification
- You may apply for verified status
- Verification requires identity and skill documentation
- Verified artisans receive enhanced visibility

## 4. Payments
- Payments are held in escrow until job completion
- Platform fee: 10% of transaction value
- Payouts processed within 24-48 hours

## 5. Disputes
- Respond to disputes within 48 hours
- Cooperate with the resolution process
- Repeated disputes may result in account suspension

## 6. Termination
Korrect may suspend or terminate your account for:
- Violation of these terms
- Poor service quality
- Fraudulent behavior
        `.trim(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/legal/versions - Get current versions
router.get('/versions', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: TERMS_VERSIONS,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/legal/acceptance - Get user's acceptance status (authenticated)
router.get('/acceptance', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const acceptances = await TermsAcceptance.find({ user: userId }).lean();

    const status: Record<string, { accepted: boolean; version?: string; acceptedAt?: Date }> = {};

    for (const [type, currentVersion] of Object.entries(TERMS_VERSIONS)) {
      const acceptance = acceptances.find((a) => a.termsType === type);
      status[type] = {
        accepted: acceptance?.termsVersion === currentVersion,
        version: acceptance?.termsVersion,
        acceptedAt: acceptance?.acceptedAt,
      };
    }

    // Check if all required terms are accepted
    const allAccepted = status.terms_of_service.accepted && status.privacy_policy.accepted;

    res.json({
      success: true,
      data: {
        status,
        allAccepted,
        currentVersions: TERMS_VERSIONS,
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get acceptance status error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/legal/accept - Accept terms (authenticated)
router.post('/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const { termsType } = req.body;

    if (!termsType || !TERMS_VERSIONS[termsType as keyof typeof TERMS_VERSIONS]) {
      return res.status(400).json({ success: false, error: 'Invalid terms type' });
    }

    const version = TERMS_VERSIONS[termsType as keyof typeof TERMS_VERSIONS];

    // Upsert acceptance
    await TermsAcceptance.findOneAndUpdate(
      { user: userId, termsType },
      {
        user: userId,
        termsType,
        termsVersion: version,
        acceptedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      { upsert: true, new: true }
    );

    logger.info('Terms accepted', { userId, termsType, version });

    res.json({
      success: true,
      message: `${termsType} accepted`,
      data: { termsType, version },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Accept terms error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/legal/accept-all - Accept all required terms (authenticated)
router.post('/accept-all', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const requiredTerms = ['terms_of_service', 'privacy_policy'];

    for (const termsType of requiredTerms) {
      const version = TERMS_VERSIONS[termsType as keyof typeof TERMS_VERSIONS];
      await TermsAcceptance.findOneAndUpdate(
        { user: userId, termsType },
        {
          user: userId,
          termsType,
          termsVersion: version,
          acceptedAt: new Date(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
        { upsert: true, new: true }
      );
    }

    logger.info('All terms accepted', { userId });

    res.json({
      success: true,
      message: 'All terms accepted',
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Accept all terms error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
