import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

// Routes that should skip CSRF validation
const CSRF_EXEMPT_ROUTES = [
  '/api/v1/payments/webhook', // Paystack webhooks
  '/api/health',
];

// Methods that don't modify state (safe methods)
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate a cryptographically secure CSRF token
 */
function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Check if request should skip CSRF validation
 */
function isExempt(req: Request): boolean {
  // Safe methods don't need CSRF protection
  if (SAFE_METHODS.includes(req.method)) {
    return true;
  }

  // Check exempt routes
  if (CSRF_EXEMPT_ROUTES.some((route) => req.path.startsWith(route))) {
    return true;
  }

  // Mobile apps typically use Bearer tokens without cookies
  // If Authorization header is present and no cookie-based auth, skip CSRF
  const authHeader = req.headers.authorization;
  const hasAuthCookie = !!req.cookies?.token;

  if (authHeader?.startsWith('Bearer ') && !hasAuthCookie) {
    return true;
  }

  return false;
}

/**
 * CSRF Protection Middleware using Double Submit Cookie pattern
 *
 * How it works:
 * 1. Server generates a random token and sets it in a readable cookie
 * 2. Client reads the cookie and sends it back in a header
 * 3. Server verifies the header matches the cookie
 *
 * This prevents CSRF because attackers can't read cookies from other domains
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Always ensure a CSRF token cookie exists
  let token = req.cookies[CSRF_COOKIE_NAME];

  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
  }

  // Attach token to response locals for API endpoint
  res.locals.csrfToken = token;

  // Skip validation for exempt routes
  if (isExempt(req)) {
    return next();
  }

  // Validate CSRF token for state-changing requests
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!headerToken) {
    res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      message: 'Please include the X-CSRF-Token header with your request',
    });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];

  if (!cookieToken || !timingSafeEqual(headerToken, cookieToken)) {
    res.status(403).json({
      success: false,
      error: 'CSRF token invalid',
      message: 'CSRF token mismatch. Please refresh the page and try again.',
    });
    return;
  }

  next();
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Endpoint handler to get CSRF token
 * Call this endpoint to get a fresh CSRF token for your session
 */
export function getCsrfToken(req: Request, res: Response): void {
  let token = req.cookies[CSRF_COOKIE_NAME];

  if (!token) {
    token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  res.json({
    success: true,
    data: { csrfToken: token },
  });
}
