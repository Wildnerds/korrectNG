import { Router, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, updatePasswordSchema } from '@korrectng/shared';
import { User } from '../models';
import { AuthRequest } from '@korrect/auth-middleware';
import { sendEmail, emailTemplates } from '../services/email';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';
import { Logger } from '@korrect/logger';

const router = Router();

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: 'Too many attempts, please try again later' },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, error: 'Too many password reset requests' },
});

const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: 'Too many verification requests' },
});

// Helper: Validation middleware
function validate(schema: any) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: result.error.errors,
      });
    }
    req.body = result.data;
    next();
  };
}

// Helper: Send token response
function sendTokenResponse(user: any, statusCode: number, res: Response) {
  const token = user.getSignedJwtToken();
  const cookieExpire = parseInt(process.env.COOKIE_EXPIRE || '30', 10);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: cookieExpire * 24 * 60 * 60 * 1000,
  });

  const { password: _, ...userData } = user.toObject();
  res.status(statusCode).json({ success: true, data: { user: userData, token } });
}

// POST /api/v1/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;
    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;

    const user = await User.create({ firstName, lastName, email, phone, password, role });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${verificationToken}`;

    // Send welcome email with verification link
    try {
      const template = emailTemplates.verifyEmail(firstName, verifyUrl);
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
      logger.info('Welcome email sent', { email });
    } catch (emailError) {
      logger.error('Failed to send welcome email', { error: emailError instanceof Error ? emailError.message : emailError });
    }

    // Publish user.created event
    try {
      await eventBus.publish(EVENT_TYPES.USER_CREATED, {
        userId: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
      logger.debug('Published user.created event', { userId: user._id.toString() });
    } catch (eventError) {
      logger.error('Failed to publish user.created event', { error: eventError instanceof Error ? eventError.message : eventError });
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
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if account is deactivated
    if (!user.isActive) {
      // Reactivate on login
      user.isActive = true;
      user.deactivatedAt = undefined;
      user.deactivationReason = undefined;
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (_req, res) => {
  res.cookie('token', 'none', { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ success: true, data: {} });
});

// GET /api/v1/auth/me
router.get('/me', (req: AuthRequest, res, next) => {
  const { protect } = req.app.locals.authMiddleware;
  protect(req, res, async () => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  });
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const logger: Logger = req.app.locals.logger;
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      // Don't reveal whether email exists
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent' });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${resetToken}`;

    try {
      const template = emailTemplates.resetPassword(user.firstName, resetUrl);
      await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email', { error: emailError instanceof Error ? emailError.message : emailError });
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
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
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
    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // Publish email verified event
    try {
      await eventBus.publish(EVENT_TYPES.USER_EMAIL_VERIFIED, {
        userId: user._id.toString(),
        email: user.email,
      });
    } catch (eventError) {
      logger.error('Failed to publish email verified event', { error: eventError instanceof Error ? eventError.message : eventError });
    }

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/resend-verification
router.post('/resend-verification', emailVerificationLimiter, (req: AuthRequest, res, next) => {
  const { protect } = req.app.locals.authMiddleware;
  protect(req, res, async () => {
    try {
      const logger: Logger = req.app.locals.logger;
      const user = await User.findById(req.user!.id);

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (user.isEmailVerified) {
        return res.status(200).json({ success: true, message: 'Email already verified' });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(20).toString('hex');
      user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
      user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email?token=${verificationToken}`;

      try {
        const template = emailTemplates.verifyEmail(user.firstName, verifyUrl);
        await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
        });
      } catch (emailError) {
        logger.error('Failed to send verification email', { error: emailError instanceof Error ? emailError.message : emailError });
      }

      res.status(200).json({ success: true, message: 'Verification email sent' });
    } catch (error) {
      next(error);
    }
  });
});

// PUT /api/v1/auth/update-password
router.put('/update-password', validate(updatePasswordSchema), (req: AuthRequest, res, next) => {
  const { protect } = req.app.locals.authMiddleware;
  protect(req, res, async () => {
    try {
      const logger: Logger = req.app.locals.logger;
      const user = await User.findById(req.user!.id).select('+password');

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }

      user.password = req.body.newPassword;
      await user.save();

      // Send password changed notification
      try {
        const template = emailTemplates.passwordChanged(user.firstName);
        await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
        });
      } catch (emailError) {
        logger.error('Failed to send password changed email', { error: emailError instanceof Error ? emailError.message : emailError });
      }

      sendTokenResponse(user, 200, res);
    } catch (error) {
      next(error);
    }
  });
});

export default router;
