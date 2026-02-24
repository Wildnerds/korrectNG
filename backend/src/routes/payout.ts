import { Router, Response } from 'express';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ArtisanProfile } from '../models';
import {
  getBanks,
  verifyBankAccount,
  saveArtisanBankDetails,
  hasArtisanBankDetails,
} from '../services/payoutService';

const router = Router();

/**
 * GET /api/v1/payout/banks
 * Get list of Nigerian banks
 */
router.get('/banks', async (_req, res: Response, next) => {
  try {
    const banks = await getBanks();

    res.status(200).json({
      success: true,
      data: banks.map((bank) => ({
        code: bank.code,
        name: bank.name,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/payout/verify-account
 * Verify a bank account number
 */
router.post('/verify-account', protect, authorize('artisan'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      throw new AppError('Account number and bank code are required', 400);
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      throw new AppError('Account number must be 10 digits', 400);
    }

    const result = await verifyBankAccount(accountNumber, bankCode);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.message.includes('Could not resolve')) {
      return next(new AppError('Invalid account number or bank code', 400));
    }
    next(error);
  }
});

/**
 * POST /api/v1/payout/bank-account
 * Save artisan's bank account details
 */
router.post('/bank-account', protect, authorize('artisan'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { accountNumber, bankCode } = req.body;

    if (!accountNumber || !bankCode) {
      throw new AppError('Account number and bank code are required', 400);
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      throw new AppError('Account number must be 10 digits', 400);
    }

    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) {
      throw new AppError('Artisan profile not found', 404);
    }

    const result = await saveArtisanBankDetails(artisan._id.toString(), accountNumber, bankCode);

    res.status(200).json({
      success: true,
      message: 'Bank account saved successfully',
      data: {
        accountName: result.accountName,
        accountNumber,
        bankCode,
      },
    });
  } catch (error: any) {
    if (error.message.includes('Could not verify')) {
      return next(new AppError('Could not verify bank account. Please check the details.', 400));
    }
    next(error);
  }
});

/**
 * GET /api/v1/payout/bank-account
 * Get artisan's saved bank account
 */
router.get('/bank-account', protect, authorize('artisan'), async (req: AuthRequest, res: Response, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id })
      .select('bankCode accountNumber accountName paystackRecipientCode');

    if (!artisan) {
      throw new AppError('Artisan profile not found', 404);
    }

    if (!artisan.accountNumber) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No bank account configured',
      });
    }

    // Mask account number for security (show only last 4 digits)
    const maskedAccountNumber = artisan.accountNumber
      ? '******' + artisan.accountNumber.slice(-4)
      : null;

    res.status(200).json({
      success: true,
      data: {
        bankCode: artisan.bankCode,
        accountNumber: maskedAccountNumber,
        accountName: artisan.accountName,
        isConfigured: !!artisan.paystackRecipientCode,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/payout/bank-account
 * Remove artisan's bank account
 */
router.delete('/bank-account', protect, authorize('artisan'), async (req: AuthRequest, res: Response, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });

    if (!artisan) {
      throw new AppError('Artisan profile not found', 404);
    }

    artisan.bankCode = undefined;
    artisan.accountNumber = undefined;
    artisan.accountName = undefined;
    artisan.paystackRecipientCode = undefined;
    await artisan.save();

    res.status(200).json({
      success: true,
      message: 'Bank account removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/payout/status
 * Check if artisan has bank account configured
 */
router.get('/status', protect, authorize('artisan'), async (req: AuthRequest, res: Response, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });

    if (!artisan) {
      throw new AppError('Artisan profile not found', 404);
    }

    const hasBankAccount = await hasArtisanBankDetails(artisan._id.toString());

    res.status(200).json({
      success: true,
      data: {
        hasBankAccount,
        message: hasBankAccount
          ? 'Bank account configured. You will receive automatic payouts.'
          : 'Please add your bank account to receive payouts.',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
