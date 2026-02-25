import { Router, Response } from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, updatePasswordSchema, updateProfileSchema } from '@korrectng/shared';
import { User } from '../models';
import { protect, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { sendEmail, emailTemplates } from '../utils/email';
import { log } from '../utils/logger';
import { authLimiter, passwordResetLimiter, emailVerificationLimiter } from '../middleware/rateLimiter';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = Router();

function sendTokenResponse(user: any, statusCode: number, res: Response) {
  const token = user.getSignedJwtToken();
  const cookieExpire = parseInt(process.env.COOKIE_EXPIRE || '30', 10);
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin
    maxAge: cookieExpire * 24 * 60 * 60 * 1000,
  });

  const { password: _, ...userData } = user.toObject();
  res.status(statusCode).json({ success: true, data: { user: userData, token } });
}

// POST /api/v1/auth/register
// Simplified registration - only email, password, role required
// firstName, lastName, phone are optional (needed for profile completion)
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    // Create user with optional fields - isProfileComplete will be false
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      isProfileComplete: false  // Explicitly set false for new users
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${verificationToken}`;

    // Send welcome email with verification link
    try {
      const displayName = firstName || 'there';
      const template = emailTemplates.verifyEmail(displayName, verifyUrl);
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
      log.info('Welcome email sent', { email });
    } catch (emailError) {
      log.error('Failed to send welcome email', { error: emailError instanceof Error ? emailError.message : emailError });
      // Don't fail registration if email fails
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }
    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/google
// Sign in or register with Google
router.post('/google', authLimiter, async (req, res, next) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      throw new AppError('Google credential is required', 400);
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError('Invalid Google token', 401);
    }

    const { email, given_name, family_name, picture, email_verified } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Existing user - update Google info and fill missing profile fields
      let needsSave = false;

      if (!user.googleId) {
        user.googleId = payload.sub;
        needsSave = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        needsSave = true;
      }
      if (!user.firstName && given_name) {
        user.firstName = given_name;
        needsSave = true;
      }
      if (!user.lastName && family_name) {
        user.lastName = family_name;
        needsSave = true;
      }
      if (!user.isEmailVerified && email_verified) {
        user.isEmailVerified = true;
        needsSave = true;
      }

      if (needsSave) {
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // New user - create account
      const userRole = role === 'artisan' ? 'artisan' : 'customer';

      user = await User.create({
        email,
        firstName: given_name || '',
        lastName: family_name || '',
        avatar: picture,
        googleId: payload.sub,
        isEmailVerified: email_verified || false,
        role: userRole,
        isProfileComplete: false,
        // Random password for Google users (they won't use it)
        password: crypto.randomBytes(32).toString('hex'),
      });

      // Send welcome email
      try {
        const displayName = given_name || 'there';
        const template = emailTemplates.welcome(displayName, userRole);
        await sendEmail({
          to: email,
          subject: template.subject,
          html: template.html,
        });
      } catch (emailError) {
        log.error('Failed to send welcome email', { error: emailError });
      }
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    log.info('Google auth successful', { email, isNewUser: !user.googleId });
    sendTokenResponse(user, 200, res);
  } catch (error: any) {
    log.error('Google auth failed', { error: error.message });
    if (error.message?.includes('Token used too late') || error.message?.includes('Invalid token')) {
      return next(new AppError('Google sign-in expired. Please try again.', 401));
    }
    next(error);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (_req, res) => {
  res.cookie('token', 'none', { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ success: true, data: {} });
});

// GET /api/v1/auth/me
router.get('/me', protect, async (req: AuthRequest, res) => {
  res.status(200).json({ success: true, data: req.user });
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      // Don't reveal whether email exists
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent' });
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;

    // Send email
    try {
      const template = emailTemplates.resetPassword(user.firstName, resetUrl);
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });
    } catch (emailError) {
      // Log error but don't fail the request (security - don't reveal if email exists)
      log.error('Failed to send password reset email', { error: emailError instanceof Error ? emailError.message : emailError });
    }

    res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/verify-email
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError('Token is required', 400);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });
    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();
    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/resend-verification
router.post('/resend-verification', emailVerificationLimiter, protect, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    if (user.isEmailVerified) {
      return res.status(200).json({ success: true, message: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${verificationToken}`;

    // Send email
    try {
      const displayName = user.firstName || 'there';
      const template = emailTemplates.verifyEmail(displayName, verifyUrl);
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });
    } catch (emailError) {
      log.error('Failed to send verification email', { error: emailError instanceof Error ? emailError.message : emailError });
    }

    res.status(200).json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/auth/update-password
router.put('/update-password', protect, validate(updatePasswordSchema), async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(req.user!._id).select('+password');
    if (!user) throw new AppError('User not found', 404);
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }
    user.password = req.body.newPassword;
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/auth/update-profile
router.put('/update-profile', protect, validate(updateProfileSchema), async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user!._id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
