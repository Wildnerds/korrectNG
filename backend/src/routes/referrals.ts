import express from 'express';
import { protect, authorize } from '../middleware/auth';
import { User } from '../models/User';
import Referral from '../models/Referral';
import { ArtisanProfile } from '../models/ArtisanProfile';
import { MerchantProfile } from '../models/MerchantProfile';

const router = express.Router();

// =====================================================
// ARTISAN ROUTES
// =====================================================

/**
 * @route   GET /api/v1/referrals/my-code
 * @desc    Get artisan's referral code and link
 * @access  Private (Artisan)
 */
router.get('/my-code', protect, authorize('artisan'), async (req, res) => {
  try {
    const user = await User.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate referral code if not exists
    if (!user.referralCode) {
      const crypto = await import('crypto');
      const namePrefix = (user.firstName || 'ART').substring(0, 3).toUpperCase();
      const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
      user.referralCode = `${namePrefix}${randomPart}`;
      user.referralStats = {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
      };
      await user.save();
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://korrect.ng';
    const referralLink = `${baseUrl}/auth/register?role=merchant&ref=${user.referralCode}`;

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink,
        stats: user.referralStats,
      },
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral code',
    });
  }
});

/**
 * @route   GET /api/v1/referrals/stats
 * @desc    Get artisan's referral statistics
 * @access  Private (Artisan)
 */
router.get('/stats', protect, authorize('artisan'), async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user!._id })
      .populate('referred', 'firstName lastName email')
      .populate('referredProfile', 'businessName verificationStatus ordersCompleted')
      .sort({ createdAt: -1 });

    const stats = {
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter((r) => r.status === 'active' || r.status === 'bonus_paid')
        .length,
      pendingReferrals: referrals.filter((r) => r.status === 'pending').length,
      totalBonusEarned: referrals
        .filter((r) => r.signupBonusPaid)
        .reduce((sum, r) => sum + r.signupBonusAmount, 0),
      totalCommissionEarned: referrals.reduce((sum, r) => sum + r.totalCommissionEarned, 0),
      pendingBonus: referrals
        .filter((r) => !r.signupBonusPaid && r.status !== 'inactive')
        .reduce((sum, r) => sum + r.signupBonusAmount, 0),
    };

    res.json({
      success: true,
      data: {
        stats,
        referrals: referrals.map((r) => ({
          _id: r._id,
          merchant: r.referred,
          merchantProfile: r.referredProfile,
          status: r.status,
          signupBonusAmount: r.signupBonusAmount,
          signupBonusPaid: r.signupBonusPaid,
          signupBonusPaidAt: r.signupBonusPaidAt,
          totalCommissionEarned: r.totalCommissionEarned,
          merchantFirstSaleAt: r.merchantFirstSaleAt,
          merchantTotalSales: r.merchantTotalSales,
          merchantOrderCount: r.merchantOrderCount,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral stats',
    });
  }
});

/**
 * @route   GET /api/v1/referrals/earnings
 * @desc    Get detailed earnings breakdown
 * @access  Private (Artisan)
 */
router.get('/earnings', protect, authorize('artisan'), async (req, res) => {
  try {
    const referrals = await Referral.find({
      referrer: req.user!._id,
      $or: [{ signupBonusPaid: true }, { totalCommissionEarned: { $gt: 0 } }],
    })
      .populate('referredProfile', 'businessName')
      .sort({ updatedAt: -1 });

    const earnings: Array<{
      type: 'bonus' | 'commission';
      amount: number;
      merchantName: string;
      date: Date;
      orderId?: string;
    }> = [];

    referrals.forEach((r) => {
      // Add bonus payment
      if (r.signupBonusPaid && r.signupBonusPaidAt) {
        earnings.push({
          type: 'bonus',
          amount: r.signupBonusAmount,
          merchantName: (r.referredProfile as any)?.businessName || 'Unknown',
          date: r.signupBonusPaidAt,
        });
      }

      // Add commission payments
      r.commissionPayments.forEach((cp) => {
        earnings.push({
          type: 'commission',
          amount: cp.commissionAmount,
          merchantName: (r.referredProfile as any)?.businessName || 'Unknown',
          date: cp.paidAt,
          orderId: cp.orderId?.toString(),
        });
      });
    });

    // Sort by date descending
    earnings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      success: true,
      data: {
        totalEarnings,
        earnings,
      },
    });
  } catch (error) {
    console.error('Get referral earnings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral earnings',
    });
  }
});

// =====================================================
// VALIDATION ROUTES (Public)
// =====================================================

/**
 * @route   GET /api/v1/referrals/validate/:code
 * @desc    Validate a referral code (for merchant signup)
 * @access  Public
 */
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const referrer = await User.findOne({
      referralCode: code.toUpperCase(),
      role: 'artisan',
      isActive: true,
    }).select('firstName lastName referralCode');

    if (!referrer) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code',
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        referrerName: `${referrer.firstName} ${referrer.lastName}`,
        referralCode: referrer.referralCode,
      },
    });
  } catch (error) {
    console.error('Validate referral code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate referral code',
    });
  }
});

/**
 * @route   POST /api/v1/referrals/apply
 * @desc    Apply referral code to merchant (called after merchant profile creation)
 * @access  Private (Merchant)
 */
router.post('/apply', protect, authorize('merchant'), async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        error: 'Referral code is required',
      });
    }

    // Find referring artisan
    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase(),
      role: 'artisan',
      isActive: true,
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        error: 'Invalid referral code',
      });
    }

    // Get artisan profile
    const artisanProfile = await ArtisanProfile.findOne({ user: referrer._id });
    if (!artisanProfile) {
      return res.status(404).json({
        success: false,
        error: 'Referrer profile not found',
      });
    }

    // Get merchant profile
    const merchantProfile = await MerchantProfile.findOne({ user: req.user!._id });
    if (!merchantProfile) {
      return res.status(404).json({
        success: false,
        error: 'Merchant profile not found',
      });
    }

    // Check if already referred
    const existingReferral = await Referral.findOne({ referred: req.user!._id });
    if (existingReferral) {
      return res.status(400).json({
        success: false,
        error: 'This merchant is already referred',
      });
    }

    // Check if merchant profile already has referredBy
    if (merchantProfile.referredBy) {
      return res.status(400).json({
        success: false,
        error: 'Referral already applied to this merchant',
      });
    }

    // Create referral record
    const referral = await Referral.create({
      referrer: referrer._id,
      referrerProfile: artisanProfile._id,
      referred: req.user!._id,
      referredProfile: merchantProfile._id,
      referralCode: referralCode.toUpperCase(),
      status: 'pending',
    });

    // Update merchant profile
    merchantProfile.referredBy = referrer._id;
    merchantProfile.referredByCode = referralCode.toUpperCase();
    await merchantProfile.save();

    // Update referrer stats
    if (referrer.referralStats) {
      referrer.referralStats.totalReferrals += 1;
      await referrer.save();
    }

    res.status(201).json({
      success: true,
      data: {
        referral: {
          _id: referral._id,
          referrerName: `${referrer.firstName} ${referrer.lastName}`,
          status: referral.status,
        },
      },
    });
  } catch (error) {
    console.error('Apply referral error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply referral code',
    });
  }
});

// =====================================================
// ADMIN ROUTES
// =====================================================

/**
 * @route   GET /api/v1/referrals/admin/all
 * @desc    Get all referrals (admin)
 * @access  Private (Admin)
 */
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) query.status = status;

    const referrals = await Referral.find(query)
      .populate('referrer', 'firstName lastName email')
      .populate('referred', 'firstName lastName email')
      .populate('referrerProfile', 'businessName')
      .populate('referredProfile', 'businessName verificationStatus ordersCompleted')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Referral.countDocuments(query);

    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Admin get referrals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referrals',
    });
  }
});

/**
 * @route   POST /api/v1/referrals/admin/:id/pay-bonus
 * @desc    Manually pay referral bonus (admin)
 * @access  Private (Admin)
 */
router.post('/admin/:id/pay-bonus', protect, authorize('admin'), async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id);

    if (!referral) {
      return res.status(404).json({
        success: false,
        error: 'Referral not found',
      });
    }

    if (referral.signupBonusPaid) {
      return res.status(400).json({
        success: false,
        error: 'Bonus already paid',
      });
    }

    // Mark bonus as paid
    referral.signupBonusPaid = true;
    referral.signupBonusPaidAt = new Date();
    referral.status = 'bonus_paid';
    await referral.save();

    // Update referrer stats
    const referrer = await User.findById(referral.referrer);
    if (referrer && referrer.referralStats) {
      referrer.referralStats.totalEarnings += referral.signupBonusAmount;
      referrer.referralStats.activeReferrals += 1;
      await referrer.save();
    }

    res.json({
      success: true,
      data: {
        referral,
        message: `Bonus of ${referral.signupBonusAmount} NGN paid`,
      },
    });
  } catch (error) {
    console.error('Admin pay bonus error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pay bonus',
    });
  }
});

export default router;
