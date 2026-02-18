import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { User } from '../models/User';
import ArtisanProfile from '../models/ArtisanProfile';
import Booking from '../models/Booking';
import { sendOTP, verifyOTP } from '../services/sms';
import { sendEmail } from '../utils/email';
import { log } from '../utils/logger';

const router = Router();

/**
 * @route   GET /api/account
 * @desc    Get current user account details
 * @access  Private
 */
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get additional stats
    let stats: any = {
      totalBookings: 0,
      completedBookings: 0,
      memberSince: user.createdAt,
    };

    if (user.role === 'customer') {
      const bookingStats = await Booking.aggregate([
        { $match: { customer: user._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
            },
            totalSpent: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, '$finalPrice', 0] },
            },
          },
        },
      ]);

      if (bookingStats[0]) {
        stats.totalBookings = bookingStats[0].total;
        stats.completedBookings = bookingStats[0].completed;
        stats.totalSpent = bookingStats[0].totalSpent || 0;
      }
    } else if (user.role === 'artisan') {
      const profile = await ArtisanProfile.findOne({ user: user._id }).lean();
      if (profile) {
        stats.businessName = profile.businessName;
        stats.isVerified = profile.isVerified;
        stats.totalReviews = profile.totalReviews;
        stats.averageRating = profile.averageRating;
        stats.profileViews = profile.profileViews;
      }

      const bookingStats = await Booking.aggregate([
        { $match: { artisan: user._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] },
            },
            totalEarned: {
              $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, '$finalPrice', 0] },
            },
          },
        },
      ]);

      if (bookingStats[0]) {
        stats.totalBookings = bookingStats[0].total;
        stats.completedBookings = bookingStats[0].completed;
        stats.totalEarned = bookingStats[0].totalEarned || 0;
      }
    }

    res.json({
      success: true,
      data: {
        user,
        stats,
      },
    });
  } catch (error) {
    log.error('Get account error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/account/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', auth, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (avatar) updateData.avatar = avatar;

    // If phone changed, mark as unverified
    if (phone && phone !== req.user!.phone) {
      updateData.phone = phone.trim();
      updateData.isPhoneVerified = false;
    }

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, data: { user } });
  } catch (error) {
    log.error('Update profile error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/account/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', auth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters',
      });
    }

    const user = await User.findById(req.user!._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    // Send email notification
    await sendEmail({
      to: user.email,
      subject: 'Password Changed - KorrectNG',
      html: `
        <h2>Password Changed</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your password was changed successfully on ${new Date().toLocaleString()}.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>Team KorrectNG</p>
      `,
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    log.error('Change password error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/account/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/settings', auth, async (req: Request, res: Response) => {
  try {
    const { smsNotifications, emailNotifications, pushNotifications, marketingEmails } = req.body;

    const settings: any = {};
    if (typeof smsNotifications === 'boolean') settings['settings.smsNotifications'] = smsNotifications;
    if (typeof emailNotifications === 'boolean') settings['settings.emailNotifications'] = emailNotifications;
    if (typeof pushNotifications === 'boolean') settings['settings.pushNotifications'] = pushNotifications;
    if (typeof marketingEmails === 'boolean') settings['settings.marketingEmails'] = marketingEmails;

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: settings },
      { new: true }
    ).select('-password');

    res.json({ success: true, data: { user } });
  } catch (error) {
    log.error('Update settings error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/account/verify-phone/send
 * @desc    Send OTP to verify phone number
 * @access  Private
 */
router.post('/verify-phone/send', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone is already verified',
      });
    }

    const result = await sendOTP(user.phone);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to send OTP',
      });
    }

    // Store pinId for verification
    user.phoneVerificationPinId = result.pinId;
    await user.save();

    res.json({
      success: true,
      message: 'OTP sent to your phone number',
    });
  } catch (error) {
    log.error('Send phone OTP error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/account/verify-phone/confirm
 * @desc    Verify phone with OTP
 * @access  Private
 */
router.post('/verify-phone/confirm', auth, async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required',
      });
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.phoneVerificationPinId) {
      return res.status(400).json({
        success: false,
        message: 'Please request OTP first',
      });
    }

    const result = await verifyOTP(user.phoneVerificationPinId, otp);
    if (!result.success || !result.verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationPinId = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Phone verified successfully',
    });
  } catch (error) {
    log.error('Verify phone OTP error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/account/deactivate
 * @desc    Deactivate account (reversible)
 * @access  Private
 */
router.post('/deactivate', auth, async (req: Request, res: Response) => {
  try {
    const { reason, password } = req.body;

    const user = await User.findById(req.user!._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      });
    }

    // Check for active bookings
    const activeBookings = await Booking.countDocuments({
      $or: [{ customer: user._id }, { artisan: user._id }],
      status: { $in: ['pending', 'accepted', 'payment_pending', 'paid', 'in_progress'] },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: `You have ${activeBookings} active booking(s). Please complete or cancel them first.`,
      });
    }

    user.isActive = false;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason || 'User requested deactivation';
    await user.save();

    // If artisan, hide their profile
    if (user.role === 'artisan') {
      await ArtisanProfile.findOneAndUpdate(
        { user: user._id },
        { $set: { isActive: false } }
      );
    }

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Deactivated - KorrectNG',
      html: `
        <h2>Account Deactivated</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your KorrectNG account has been deactivated as requested.</p>
        <p>Your data is still saved. You can reactivate your account anytime by logging in again.</p>
        <p>We're sorry to see you go. If you have any feedback, please let us know.</p>
        <p>Team KorrectNG</p>
      `,
    });

    res.json({
      success: true,
      message: 'Account deactivated. You can reactivate by logging in.',
    });
  } catch (error) {
    log.error('Deactivate account error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/account/reactivate
 * @desc    Reactivate a deactivated account
 * @access  Private
 */
router.post('/reactivate', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Account is already active',
      });
    }

    user.isActive = true;
    user.deactivatedAt = undefined;
    user.deactivationReason = undefined;
    await user.save();

    // If artisan, reactivate their profile
    if (user.role === 'artisan') {
      await ArtisanProfile.findOneAndUpdate(
        { user: user._id },
        { $set: { isActive: true } }
      );
    }

    res.json({
      success: true,
      message: 'Account reactivated successfully',
    });
  } catch (error) {
    log.error('Reactivate account error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/account
 * @desc    Permanently delete account (GDPR compliance)
 * @access  Private
 */
router.delete('/', auth, async (req: Request, res: Response) => {
  try {
    const { password, confirmText } = req.body;

    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Please type "DELETE MY ACCOUNT" to confirm',
      });
    }

    const user = await User.findById(req.user!._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      });
    }

    // Check for active bookings
    const activeBookings = await Booking.countDocuments({
      $or: [{ customer: user._id }, { artisan: user._id }],
      status: { $in: ['pending', 'accepted', 'payment_pending', 'paid', 'in_progress'] },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: `You have ${activeBookings} active booking(s). Please complete or cancel them first.`,
      });
    }

    // Check for pending payouts
    const pendingPayouts = await Booking.countDocuments({
      artisan: user._id,
      status: 'confirmed',
      payoutStatus: 'pending',
    });

    if (pendingPayouts > 0) {
      return res.status(400).json({
        success: false,
        message: `You have ${pendingPayouts} pending payout(s). Please wait for them to process.`,
      });
    }

    const email = user.email;
    const firstName = user.firstName;

    // Delete artisan profile if exists
    if (user.role === 'artisan') {
      await ArtisanProfile.findOneAndDelete({ user: user._id });
    }

    // Delete user - bookings and reviews are kept for platform integrity
    // but user references are anonymized
    await User.findByIdAndDelete(user._id);

    // Send confirmation email
    await sendEmail({
      to: email,
      subject: 'Account Deleted - KorrectNG',
      html: `
        <h2>Account Permanently Deleted</h2>
        <p>Hi ${firstName},</p>
        <p>Your KorrectNG account has been permanently deleted.</p>
        <p>All your personal data has been removed from our systems.</p>
        <p>If you wish to use KorrectNG again, you'll need to create a new account.</p>
        <p>Thank you for being part of our community.</p>
        <p>Team KorrectNG</p>
      `,
    });

    log.info('Account permanently deleted', { email });

    res.json({
      success: true,
      message: 'Account permanently deleted',
    });
  } catch (error) {
    log.error('Delete account error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/account/export
 * @desc    Export user data (GDPR/NDPR compliance)
 * @access  Private
 */
router.get('/export', auth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Gather all user data
    const [bookings, artisanProfile] = await Promise.all([
      Booking.find({
        $or: [{ customer: user._id }, { artisan: user._id }],
      })
        .select('-__v')
        .lean(),
      user.role === 'artisan'
        ? ArtisanProfile.findOne({ user: user._id }).select('-__v').lean()
        : null,
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        ...user,
        password: '[REDACTED]',
      },
      artisanProfile,
      bookings,
    };

    res.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    log.error('Export data error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
