import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { ArtisanProfile } from '../models/ArtisanProfile';

export interface AuthRequest extends Request {
  user?: IUser;
}

export async function protect(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;
  let isFromCookie = false;

  // Check cookie first, then Authorization header
  if (req.cookies?.token) {
    token = req.cookies.token;
    isFromCookie = true;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    req.user = user;

    // Auto-extend session: refresh token on each authenticated request
    // This keeps active users logged in indefinitely
    const newToken = user.getSignedJwtToken();

    if (isFromCookie) {
      // Web: refresh the cookie
      const cookieExpire = parseInt(process.env.COOKIE_EXPIRE || '30', 10);
      res.cookie('token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: cookieExpire * 24 * 60 * 60 * 1000,
      });
    } else {
      // Mobile: send refreshed token in response header
      res.setHeader('X-Refreshed-Token', newToken);
    }

    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Not authorized' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized for this action' });
    }
    next();
  };
}

// Require verified email for certain actions
export function requireVerifiedEmail(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isEmailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Please verify your email address to perform this action',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }
  next();
}

// Require profile to be complete before allowing certain actions
// For customers: Check firstName, lastName, phone, address
// For artisans: Check ArtisanProfile exists with all required fields
export function requireProfileComplete(userType?: 'customer' | 'artisan') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Not authorized' });
      }

      // If a specific user type is required, check it
      if (userType && user.role !== userType) {
        return res.status(403).json({
          success: false,
          error: `This action requires a ${userType} account`,
          code: 'WRONG_ROLE'
        });
      }

      if (user.role === 'customer') {
        // For customers, check basic profile fields
        const isComplete = !!(user.firstName && user.lastName && user.phone && user.address);
        if (!isComplete) {
          return res.status(403).json({
            success: false,
            error: 'Please complete your profile (name, phone, address) before proceeding',
            code: 'PROFILE_INCOMPLETE',
            requiredFields: ['firstName', 'lastName', 'phone', 'address']
          });
        }
      } else if (user.role === 'artisan') {
        // For artisans, check ArtisanProfile exists and is complete
        const artisanProfile = await ArtisanProfile.findOne({ user: user._id });
        if (!artisanProfile) {
          return res.status(403).json({
            success: false,
            error: 'Please create your artisan profile before proceeding',
            code: 'PROFILE_INCOMPLETE',
            requiredFields: ['businessName', 'trade', 'description', 'location', 'address', 'whatsappNumber', 'phoneNumber']
          });
        }
        if (!artisanProfile.isProfileComplete) {
          return res.status(403).json({
            success: false,
            error: 'Please complete your artisan profile before proceeding',
            code: 'PROFILE_INCOMPLETE',
            requiredFields: ['businessName', 'trade', 'description', 'location', 'address', 'whatsappNumber', 'phoneNumber']
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Aliases used in some route files
export const restrictTo = authorize;
export const auth = protect;
