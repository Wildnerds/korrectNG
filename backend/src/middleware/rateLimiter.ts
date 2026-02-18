import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request } from 'express';

/**
 * Custom key generator that uses user ID for authenticated requests
 * Falls back to IP for unauthenticated requests
 */
function getUserKeyGenerator(req: Request): string {
  const user = (req as any).user;
  if (user && user._id) {
    return `user_${user._id}`;
  }
  return req.ip || 'unknown';
}

/**
 * Global rate limiter - 100 requests per 15 minutes
 * Applied to all API routes
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth routes rate limiter - strict limits to prevent brute force
 * 5 requests per minute for login/register
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, error: 'Too many authentication attempts, please try again in a minute' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Password reset rate limiter - very strict to prevent abuse
 * 3 requests per hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, error: 'Too many password reset requests, please try again in an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Email verification resend limiter
 * 3 requests per 10 minutes
 */
export const emailVerificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: { success: false, error: 'Too many verification email requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Payment routes rate limiter
 * 10 requests per minute to prevent payment spam
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, error: 'Too many payment requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKeyGenerator,
});

/**
 * Booking creation rate limiter
 * 5 bookings per minute per user
 */
export const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, error: 'Too many booking requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKeyGenerator,
});

/**
 * Review creation rate limiter
 * 3 reviews per 5 minutes per user
 */
export const reviewLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: { success: false, error: 'Too many review submissions, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKeyGenerator,
});

/**
 * Message sending rate limiter
 * 30 messages per minute per user
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, error: 'Too many messages, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKeyGenerator,
});

/**
 * Upload rate limiter
 * 10 uploads per minute per user
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, error: 'Too many uploads, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKeyGenerator,
});

/**
 * Search rate limiter - more generous for browsing
 * 60 requests per minute
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { success: false, error: 'Too many search requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin routes rate limiter
 * 50 requests per minute for admin operations
 */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: { success: false, error: 'Too many admin requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKeyGenerator,
});

/**
 * Verification submission rate limiter
 * 3 submissions per hour
 */
export const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, error: 'Too many verification submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKeyGenerator,
});

/**
 * Warranty claim rate limiter
 * 5 claims per hour per user
 */
export const warrantyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: 'Too many warranty claims, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKeyGenerator,
});

export default {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  paymentLimiter,
  bookingLimiter,
  reviewLimiter,
  messageLimiter,
  uploadLimiter,
  searchLimiter,
  adminLimiter,
  verificationLimiter,
  warrantyLimiter,
};
