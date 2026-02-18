import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  role?: string;
  email?: string;
  isEmailVerified?: boolean;
  [key: string]: unknown;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  token?: string;
}

export interface AuthMiddlewareConfig {
  jwtSecret: string;
  cookieName?: string;
  headerName?: string;
  onUserLookup?: (userId: string) => Promise<AuthUser | null>;
  enableTokenRefresh?: boolean;
  tokenRefreshCallback?: (user: AuthUser) => string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  };
}

// ─── Default Configuration ───────────────────────────────────────────────────

const defaultConfig: Partial<AuthMiddlewareConfig> = {
  cookieName: 'token',
  headerName: 'Authorization',
  enableTokenRefresh: false,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
};

// ─── Token Extraction ────────────────────────────────────────────────────────

function extractToken(
  req: Request,
  cookieName: string,
  headerName: string
): { token: string | null; isFromCookie: boolean } {
  // Check cookie first
  if (req.cookies?.[cookieName]) {
    return { token: req.cookies[cookieName], isFromCookie: true };
  }

  // Check Authorization header
  const authHeader = req.headers[headerName.toLowerCase()] as string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    return { token: authHeader.slice(7), isFromCookie: false };
  }

  return { token: null, isFromCookie: false };
}

// ─── JWT Verification ────────────────────────────────────────────────────────

export function verifyToken(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

export function signToken(
  payload: { id: string },
  secret: string,
  expiresIn: string = '30d'
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

// ─── Create Auth Middleware ──────────────────────────────────────────────────

export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const mergedConfig = { ...defaultConfig, ...config };
  const {
    jwtSecret,
    cookieName,
    headerName,
    onUserLookup,
    enableTokenRefresh,
    tokenRefreshCallback,
    cookieOptions,
  } = mergedConfig;

  /**
   * Protect middleware - requires authentication
   */
  const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { token, isFromCookie } = extractToken(req, cookieName!, headerName!);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized - no token provided',
      });
    }

    const decoded = verifyToken(token, jwtSecret);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized - invalid token',
      });
    }

    // Store token on request
    req.token = token;

    // If user lookup function provided, fetch full user
    if (onUserLookup) {
      const user = await onUserLookup(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized - user not found',
        });
      }
      req.user = user;
    } else {
      // Use minimal user info from token
      req.user = { id: decoded.id };
    }

    // Auto-refresh token if enabled
    if (enableTokenRefresh && tokenRefreshCallback && req.user) {
      const newToken = tokenRefreshCallback(req.user);

      if (isFromCookie) {
        res.cookie(cookieName!, newToken, cookieOptions);
      } else {
        res.setHeader('X-Refreshed-Token', newToken);
      }
    }

    next();
  };

  /**
   * Optional auth middleware - attaches user if token exists but doesn't require it
   */
  const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { token } = extractToken(req, cookieName!, headerName!);

    if (token) {
      const decoded = verifyToken(token, jwtSecret);
      if (decoded) {
        req.token = token;

        if (onUserLookup) {
          const user = await onUserLookup(decoded.id);
          if (user) {
            req.user = user;
          }
        } else {
          req.user = { id: decoded.id };
        }
      }
    }

    next();
  };

  /**
   * Authorize middleware - requires specific roles
   */
  const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized - no user',
        });
      }

      if (!req.user.role || !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized for this action',
        });
      }

      next();
    };
  };

  /**
   * Require verified email middleware
   */
  const requireVerifiedEmail = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.isEmailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address to perform this action',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }
    next();
  };

  return {
    protect,
    optionalAuth,
    authorize,
    requireVerifiedEmail,
    // Aliases for backwards compatibility
    auth: protect,
    restrictTo: authorize,
  };
}

// ─── Gateway-Specific Middleware ─────────────────────────────────────────────

/**
 * Lightweight JWT validation for API Gateway
 * Only validates token, doesn't lookup user from database
 */
export function createGatewayAuthMiddleware(jwtSecret: string) {
  return {
    /**
     * Validates JWT and attaches user ID to request
     * For full user data, services should fetch from Users service
     */
    validateToken: (req: AuthRequest, res: Response, next: NextFunction) => {
      const { token } = extractToken(req, 'token', 'Authorization');

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized - no token provided',
        });
      }

      const decoded = verifyToken(token, jwtSecret);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized - invalid token',
        });
      }

      req.user = { id: decoded.id };
      req.token = token;

      // Forward user ID to downstream services
      (req as Request).headers['x-user-id'] = decoded.id;
      (req as Request).headers['x-auth-token'] = token;

      next();
    },

    /**
     * Optional token validation - continues even without valid token
     */
    optionalValidation: (req: AuthRequest, res: Response, next: NextFunction) => {
      const { token } = extractToken(req, 'token', 'Authorization');

      if (token) {
        const decoded = verifyToken(token, jwtSecret);
        if (decoded) {
          req.user = { id: decoded.id };
          req.token = token;
          (req as Request).headers['x-user-id'] = decoded.id;
          (req as Request).headers['x-auth-token'] = token;
        }
      }

      next();
    },
  };
}

// ─── Service-to-Service Auth ─────────────────────────────────────────────────

/**
 * Extract user ID from headers (set by gateway)
 */
export function extractUserFromHeaders(req: Request): AuthUser | null {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) return null;

  return { id: userId };
}

/**
 * Middleware for services to trust gateway-forwarded user info
 */
export function createServiceAuthMiddleware() {
  return {
    /**
     * Trust user info from gateway headers
     */
    trustGateway: (req: AuthRequest, res: Response, next: NextFunction) => {
      const user = extractUserFromHeaders(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized - no user ID in headers',
        });
      }

      req.user = user;
      next();
    },

    /**
     * Optional - attach user if header exists
     */
    optionalTrustGateway: (req: AuthRequest, res: Response, next: NextFunction) => {
      const user = extractUserFromHeaders(req);
      if (user) {
        req.user = user;
      }
      next();
    },
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export default createAuthMiddleware;
