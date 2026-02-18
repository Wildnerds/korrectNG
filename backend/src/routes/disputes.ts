import { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import Dispute from '../models/Dispute';
import {
  openDispute,
  submitArtisanResponse,
  submitCustomerCounter,
  addEvidence,
  resolveDispute,
  getDisputeWithDetails,
} from '../services/disputeService';
import { log } from '../utils/logger';
import {
  openDisputeSchema,
  artisanDisputeResponseSchema,
  customerCounterSchema,
  resolveDisputeSchema,
  uploadEvidenceSchema,
} from '@korrectng/shared';

const router = Router();

/**
 * @route   POST /api/v1/disputes
 * @desc    Open a new dispute
 * @access  Private (Customer)
 */
router.post(
  '/',
  protect,
  validate(openDisputeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const role = (req as any).user.role;

      if (role !== 'customer') {
        return res.status(403).json({
          success: false,
          error: 'Only customers can open disputes',
        });
      }

      const { contractId, category, description } = req.body;

      const dispute = await openDispute({
        contractId,
        customerId: userId,
        category,
        description,
      });

      res.status(201).json({
        success: true,
        data: dispute,
      });
    } catch (error: any) {
      if (error.message) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/disputes
 * @desc    Get disputes for current user
 * @access  Private
 */
router.get('/', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const role = (req as any).user.role;
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;

    const query: any = role === 'artisan' ? { artisan: userId } : { customer: userId };

    if (status) {
      query.status = status;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('customer', 'firstName lastName')
        .populate('artisan', 'firstName lastName')
        .populate('contract', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Dispute.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        disputes,
        total,
        hasMore: skip + disputes.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/disputes/:id
 * @desc    Get dispute details
 * @access  Private
 */
router.get('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;

    const dispute = await getDisputeWithDetails(id);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        error: 'Dispute not found',
      });
    }

    // Verify user is participant or admin
    const isCustomer = dispute.customer._id.toString() === userId.toString();
    const isArtisan = dispute.artisan._id.toString() === userId.toString();
    const isAdmin = (req as any).user.role === 'admin';

    if (!isCustomer && !isArtisan && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this dispute',
      });
    }

    res.status(200).json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/disputes/:id/artisan-response
 * @desc    Artisan submits response to dispute
 * @access  Private (Artisan)
 */
router.post(
  '/:id/artisan-response',
  protect,
  validate(artisanDisputeResponseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { id } = req.params;
      const { response } = req.body;

      const dispute = await submitArtisanResponse(id, userId, response);

      res.status(200).json({
        success: true,
        message: 'Response submitted successfully',
        data: dispute,
      });
    } catch (error: any) {
      if (error.message) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/disputes/:id/customer-counter
 * @desc    Customer submits counter to artisan response
 * @access  Private (Customer)
 */
router.post(
  '/:id/customer-counter',
  protect,
  validate(customerCounterSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { id } = req.params;
      const { counter } = req.body;

      const dispute = await submitCustomerCounter(id, userId, counter);

      res.status(200).json({
        success: true,
        message: 'Counter submitted successfully. The dispute is now under review.',
        data: dispute,
      });
    } catch (error: any) {
      if (error.message) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/disputes/:id/evidence
 * @desc    Upload evidence to dispute
 * @access  Private
 */
router.post(
  '/:id/evidence',
  protect,
  validate(uploadEvidenceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { id } = req.params;
      const { type, url, publicId, description } = req.body;

      const dispute = await addEvidence(id, userId, {
        type,
        url,
        publicId,
        description,
      });

      res.status(200).json({
        success: true,
        message: 'Evidence uploaded successfully',
        data: dispute,
      });
    } catch (error: any) {
      if (error.message) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/disputes/:id/resolve
 * @desc    Admin resolves dispute
 * @access  Private (Admin)
 */
router.post(
  '/:id/resolve',
  protect,
  restrictTo('admin'),
  validate(resolveDisputeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { id } = req.params;
      const { decision, notes, customerRefundAmount, artisanPaymentAmount } = req.body;

      const dispute = await resolveDispute(
        id,
        userId,
        decision,
        notes,
        customerRefundAmount,
        artisanPaymentAmount
      );

      res.status(200).json({
        success: true,
        message: 'Dispute resolved successfully',
        data: dispute,
      });
    } catch (error: any) {
      if (error.message) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/admin/disputes
 * @desc    Get all disputes (admin)
 * @access  Private (Admin)
 */
router.get(
  '/admin/all',
  protect,
  restrictTo('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      const query: any = {};
      if (status) {
        query.status = status;
      }

      const [disputes, total] = await Promise.all([
        Dispute.find(query)
          .populate('customer', 'firstName lastName email')
          .populate('artisan', 'firstName lastName email')
          .populate('contract', 'title totalAmount')
          .populate('assignedAdmin', 'firstName lastName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Dispute.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          disputes,
          total,
          hasMore: skip + disputes.length < total,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/disputes/:id/assign
 * @desc    Assign admin to dispute
 * @access  Private (Admin)
 */
router.post(
  '/:id/assign',
  protect,
  restrictTo('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { id } = req.params;

      const dispute = await Dispute.findById(id);
      if (!dispute) {
        return res.status(404).json({
          success: false,
          error: 'Dispute not found',
        });
      }

      dispute.assignedAdmin = userId;
      dispute.addTimelineEvent('Admin assigned', userId);
      await dispute.save();

      res.status(200).json({
        success: true,
        message: 'Dispute assigned successfully',
        data: dispute,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
