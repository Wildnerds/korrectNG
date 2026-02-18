import { Request, Response, NextFunction } from 'express';
import TermsAcceptance from '../models/TermsAcceptance';
import { CURRENT_TERMS_VERSION } from '../data/legalContent';
import { log } from '../utils/logger';

/**
 * Middleware to check if user has accepted current terms version
 * Returns 403 with TERMS_ACCEPTANCE_REQUIRED if not accepted
 */
export async function requireTermsAcceptance(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;

    if (!user) {
      // If no user, let the auth middleware handle it
      return next();
    }

    // Check if user has accepted current terms
    const hasAccepted = await TermsAcceptance.hasAccepted(
      user._id,
      CURRENT_TERMS_VERSION
    );

    if (!hasAccepted) {
      log.info('User has not accepted current terms', {
        userId: user._id,
        requiredVersion: CURRENT_TERMS_VERSION,
      });

      return res.status(403).json({
        success: false,
        error: 'TERMS_ACCEPTANCE_REQUIRED',
        message: 'You must accept the current terms of service to continue',
        data: {
          requiredVersion: CURRENT_TERMS_VERSION,
        },
      });
    }

    next();
  } catch (error) {
    log.error('Error checking terms acceptance', { error });
    next(error);
  }
}

/**
 * Optional middleware that adds terms status to request but doesn't block
 */
export async function checkTermsStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;

    if (user) {
      const hasAccepted = await TermsAcceptance.hasAccepted(
        user._id,
        CURRENT_TERMS_VERSION
      );
      (req as any).termsAccepted = hasAccepted;
      (req as any).currentTermsVersion = CURRENT_TERMS_VERSION;
    }

    next();
  } catch (error) {
    log.error('Error checking terms status', { error });
    next();
  }
}

/**
 * Routes that are exempt from terms check
 */
export const TERMS_EXEMPT_ROUTES = [
  '/api/v1/legal',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/me',
];

/**
 * Conditional terms check - only enforces for protected routes
 */
export function conditionalTermsCheck(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip terms check for exempt routes
  const isExempt = TERMS_EXEMPT_ROUTES.some(route =>
    req.path.startsWith(route)
  );

  if (isExempt) {
    return next();
  }

  return requireTermsAcceptance(req, res, next);
}

export default {
  requireTermsAcceptance,
  checkTermsStatus,
  conditionalTermsCheck,
  TERMS_EXEMPT_ROUTES,
};
