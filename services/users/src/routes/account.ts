import { Router, Request, Response } from 'express';
import { User } from '../models';
import { AuthRequest } from '@korrect/auth-middleware';
import { sendEmail, emailTemplates } from '../services/email';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';
import { Logger } from '@korrect/logger';

const router = Router();

// Helper: Get auth middleware from app
function withAuth(handler: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: any) => {
    const { protect } = req.app.locals.authMiddleware;
    protect(req, res, () => handler(req, res).catch(next));
  };
}

/**
 * GET /api/v1/account
 * Get current user account details
 */
router.get('/', withAuth(async (req: AuthRequest, res: Response) => {
  const logger: Logger = req.app.locals.logger;

  const user = await User.findById(req.user!.id).select('-password');
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Basic stats (more stats come from other services)
  const stats = {
    memberSince: user.createdAt,
  };

  res.json({
    success: true,
    data: { user, stats },
  });
}));

/**
 * PUT /api/v1/account/profile
 * Update user profile
 */
router.put('/profile', withAuth(async (req: AuthRequest, res: Response) => {
  const logger: Logger = req.app.locals.logger;
  const eventBus: EventBus = req.app.locals.eventBus;
  const { firstName, lastName, phone, avatar } = req.body;

  const updateData: any = {};
  if (firstName) updateData.firstName = firstName.trim();
  if (lastName) updateData.lastName = lastName.trim();
  if (avatar) updateData.avatar = avatar;

  // If phone changed, mark as unverified
  const currentUser = await User.findById(req.user!.id);
  if (phone && phone !== currentUser?.phone) {
    updateData.phone = phone.trim();
    updateData.isPhoneVerified = false;
  }

  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password');

  // Publish user.updated event
  try {
    await eventBus.publish(EVENT_TYPES.USER_UPDATED, {
      userId: user!._id.toString(),
      changes: Object.keys(updateData),
    });
  } catch (eventError) {
    logger.error('Failed to publish user.updated event', { error: eventError instanceof Error ? eventError.message : eventError });
  }

  res.json({ success: true, data: { user } });
}));

/**
 * PUT /api/v1/account/password
 * Change password
 */
router.put('/password', withAuth(async (req: AuthRequest, res: Response) => {
  const logger: Logger = req.app.locals.logger;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current and new password are required',
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters',
    });
  }

  const user = await User.findById(req.user!.id).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Current password is incorrect',
    });
  }

  user.password = newPassword;
  await user.save();

  // Send email notification
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

  res.json({ success: true, message: 'Password changed successfully' });
}));

/**
 * PUT /api/v1/account/settings
 * Update notification settings
 */
router.put('/settings', withAuth(async (req: AuthRequest, res: Response) => {
  const { smsNotifications, emailNotifications, pushNotifications, marketingEmails } = req.body;

  const settings: any = {};
  if (typeof smsNotifications === 'boolean') settings['settings.smsNotifications'] = smsNotifications;
  if (typeof emailNotifications === 'boolean') settings['settings.emailNotifications'] = emailNotifications;
  if (typeof pushNotifications === 'boolean') settings['settings.pushNotifications'] = pushNotifications;
  if (typeof marketingEmails === 'boolean') settings['settings.marketingEmails'] = marketingEmails;

  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { $set: settings },
    { new: true }
  ).select('-password');

  res.json({ success: true, data: { user } });
}));

/**
 * POST /api/v1/account/deactivate
 * Deactivate account (reversible)
 */
router.post('/deactivate', withAuth(async (req: AuthRequest, res: Response) => {
  const logger: Logger = req.app.locals.logger;
  const { reason, password } = req.body;

  const user = await User.findById(req.user!.id).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Incorrect password',
    });
  }

  user.isActive = false;
  user.deactivatedAt = new Date();
  user.deactivationReason = reason || 'User requested deactivation';
  await user.save();

  // Send confirmation email
  try {
    const template = emailTemplates.accountDeactivated(user.firstName);
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
    });
  } catch (emailError) {
    logger.error('Failed to send deactivation email', { error: emailError instanceof Error ? emailError.message : emailError });
  }

  res.json({
    success: true,
    message: 'Account deactivated. You can reactivate by logging in.',
  });
}));

/**
 * POST /api/v1/account/reactivate
 * Reactivate a deactivated account
 */
router.post('/reactivate', withAuth(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  if (user.isActive) {
    return res.status(400).json({
      success: false,
      error: 'Account is already active',
    });
  }

  user.isActive = true;
  user.deactivatedAt = undefined;
  user.deactivationReason = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Account reactivated successfully',
  });
}));

/**
 * DELETE /api/v1/account
 * Permanently delete account (GDPR compliance)
 */
router.delete('/', withAuth(async (req: AuthRequest, res: Response) => {
  const logger: Logger = req.app.locals.logger;
  const eventBus: EventBus = req.app.locals.eventBus;
  const { password, confirmText } = req.body;

  if (confirmText !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({
      success: false,
      error: 'Please type "DELETE MY ACCOUNT" to confirm',
    });
  }

  const user = await User.findById(req.user!.id).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'Incorrect password',
    });
  }

  const email = user.email;
  const firstName = user.firstName;
  const userId = user._id.toString();

  // Delete user
  await User.findByIdAndDelete(user._id);

  // Publish user.deleted event (other services clean up their data)
  try {
    await eventBus.publish(EVENT_TYPES.USER_DELETED, {
      userId,
      email,
    });
  } catch (eventError) {
    logger.error('Failed to publish user.deleted event', { error: eventError instanceof Error ? eventError.message : eventError });
  }

  // Send confirmation email
  try {
    const template = emailTemplates.accountDeleted(firstName);
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
  } catch (emailError) {
    logger.error('Failed to send deletion email', { error: emailError instanceof Error ? emailError.message : emailError });
  }

  logger.info('Account permanently deleted', { email });

  res.json({
    success: true,
    message: 'Account permanently deleted',
  });
}));

/**
 * GET /api/v1/account/export
 * Export user data (GDPR/NDPR compliance)
 */
router.get('/export', withAuth(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id).select('-password').lean();
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    user: {
      ...user,
      password: '[REDACTED]',
    },
    // Note: Bookings, reviews, etc. would come from other services
    // This service only exports user account data
  };

  res.json({
    success: true,
    data: exportData,
  });
}));

export default router;
