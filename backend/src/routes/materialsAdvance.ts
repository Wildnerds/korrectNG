import { Router, Request, Response, NextFunction } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { MaterialsAdvanceRequest, EscrowPayment, JobContract } from '../models';
import { createNotification } from '../services/notifications';
import { z } from 'zod';
import { log } from '../utils/logger';

const router = Router();

// Validation schemas
const createRequestSchema = z.object({
  escrowId: z.string(),
  items: z.array(z.object({
    name: z.string().min(1).max(100),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
  })).min(1).max(20),
  reason: z.string().min(10).max(500),
});

const respondSchema = z.object({
  approved: z.boolean(),
  note: z.string().max(500).optional(),
});

const uploadReceiptSchema = z.object({
  receiptUrl: z.string().url(),
});

/**
 * @route   POST /api/v1/materials-advance/request
 * @desc    Create a materials advance request (artisan)
 * @access  Private (Artisan)
 */
router.post(
  '/request',
  protect,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!._id;
      const validation = createRequestSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { escrowId, items, reason } = validation.data;

      // Find escrow
      const escrow = await EscrowPayment.findById(escrowId);
      if (!escrow) {
        return res.status(404).json({
          success: false,
          error: 'Escrow not found',
        });
      }

      // Verify user is the artisan
      if (escrow.artisan.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only the artisan can request materials advance',
        });
      }

      // Check escrow is in valid state
      if (!['funded', 'milestone_1_released', 'milestone_2_released'].includes(escrow.status)) {
        return res.status(400).json({
          success: false,
          error: 'Escrow must be funded and active to request materials advance',
        });
      }

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

      // Check if total doesn't exceed remaining escrow balance
      const remainingBalance = escrow.fundedAmount - escrow.releasedAmount - escrow.refundedAmount;
      if (totalAmount > remainingBalance) {
        return res.status(400).json({
          success: false,
          error: `Requested amount (₦${totalAmount.toLocaleString()}) exceeds remaining escrow balance (₦${remainingBalance.toLocaleString()})`,
        });
      }

      // Check for pending requests
      const pendingRequest = await MaterialsAdvanceRequest.findOne({
        escrow: escrowId,
        status: 'pending',
      });

      if (pendingRequest) {
        return res.status(400).json({
          success: false,
          error: 'You already have a pending materials advance request',
        });
      }

      // Create the request
      const advanceRequest = await MaterialsAdvanceRequest.create({
        escrow: escrowId,
        contract: escrow.contract,
        booking: escrow.booking,
        artisan: escrow.artisan,
        customer: escrow.customer,
        items,
        totalAmount,
        reason,
        status: 'pending',
        requestedAt: new Date(),
      });

      // Notify customer
      await createNotification(escrow.customer.toString(), {
        type: 'materials_advance_request' as any,
        title: 'Materials Advance Request',
        message: `The artisan has requested ₦${totalAmount.toLocaleString()} for materials. Please review and approve.`,
        link: `/dashboard/customer/contracts/${escrow.contract}`,
        data: { requestId: advanceRequest._id, amount: totalAmount },
      });

      log.info('Materials advance requested', {
        requestId: advanceRequest._id,
        escrowId,
        amount: totalAmount,
      });

      res.status(201).json({
        success: true,
        data: advanceRequest,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/materials-advance/escrow/:escrowId
 * @desc    Get all materials advance requests for an escrow
 * @access  Private (Customer or Artisan)
 */
router.get(
  '/escrow/:escrowId',
  protect,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!._id;
      const { escrowId } = req.params;

      // Find escrow
      const escrow = await EscrowPayment.findById(escrowId);
      if (!escrow) {
        return res.status(404).json({
          success: false,
          error: 'Escrow not found',
        });
      }

      // Verify user is customer or artisan
      if (
        escrow.customer.toString() !== userId.toString() &&
        escrow.artisan.toString() !== userId.toString()
      ) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const requests = await MaterialsAdvanceRequest.find({ escrow: escrowId })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/materials-advance/:requestId/respond
 * @desc    Approve or reject a materials advance request (customer)
 * @access  Private (Customer)
 */
router.post(
  '/:requestId/respond',
  protect,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!._id;
      const { requestId } = req.params;

      const validation = respondSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { approved, note } = validation.data;

      // Find request
      const advanceRequest = await MaterialsAdvanceRequest.findById(requestId);
      if (!advanceRequest) {
        return res.status(404).json({
          success: false,
          error: 'Request not found',
        });
      }

      // Verify user is the customer
      if (advanceRequest.customer.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only the customer can respond to this request',
        });
      }

      // Check request is pending
      if (advanceRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'This request has already been processed',
        });
      }

      advanceRequest.status = approved ? 'approved' : 'rejected';
      advanceRequest.respondedAt = new Date();
      advanceRequest.respondedBy = userId;
      advanceRequest.responseNote = note;
      await advanceRequest.save();

      // If approved, release the funds from escrow
      if (approved) {
        const escrow = await EscrowPayment.findById(advanceRequest.escrow);
        if (escrow) {
          escrow.releases.push({
            milestone: 0, // 0 indicates materials advance, not a milestone
            amount: advanceRequest.totalAmount,
            releasedAt: new Date(),
            releasedBy: userId,
            status: 'completed',
          });
          escrow.releasedAmount += advanceRequest.totalAmount;
          await escrow.save();

          advanceRequest.status = 'released';
          advanceRequest.releasedAt = new Date();
          await advanceRequest.save();
        }

        // Notify artisan
        await createNotification(advanceRequest.artisan.toString(), {
          type: 'materials_advance_approved' as any,
          title: 'Materials Advance Approved!',
          message: `Your materials advance request of ₦${advanceRequest.totalAmount.toLocaleString()} has been approved and released.`,
          link: `/dashboard/artisan/contracts/${advanceRequest.contract}`,
          data: { requestId: advanceRequest._id, amount: advanceRequest.totalAmount },
        });

        log.info('Materials advance approved and released', {
          requestId,
          amount: advanceRequest.totalAmount,
        });
      } else {
        // Notify artisan of rejection
        await createNotification(advanceRequest.artisan.toString(), {
          type: 'materials_advance_rejected' as any,
          title: 'Materials Advance Rejected',
          message: `Your materials advance request has been rejected.${note ? ` Reason: ${note}` : ''}`,
          link: `/dashboard/artisan/contracts/${advanceRequest.contract}`,
          data: { requestId: advanceRequest._id },
        });

        log.info('Materials advance rejected', { requestId, reason: note });
      }

      res.json({
        success: true,
        data: advanceRequest,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/materials-advance/:requestId/receipt
 * @desc    Upload receipt for materials purchased (artisan)
 * @access  Private (Artisan)
 */
router.post(
  '/:requestId/receipt',
  protect,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!._id;
      const { requestId } = req.params;

      const validation = uploadReceiptSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { receiptUrl } = validation.data;

      // Find request
      const advanceRequest = await MaterialsAdvanceRequest.findById(requestId);
      if (!advanceRequest) {
        return res.status(404).json({
          success: false,
          error: 'Request not found',
        });
      }

      // Verify user is the artisan
      if (advanceRequest.artisan.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only the artisan can upload receipts',
        });
      }

      // Check request is released
      if (advanceRequest.status !== 'released') {
        return res.status(400).json({
          success: false,
          error: 'Can only upload receipts for released advances',
        });
      }

      advanceRequest.receiptUrl = receiptUrl;
      advanceRequest.receiptUploadedAt = new Date();
      await advanceRequest.save();

      // Notify customer
      await createNotification(advanceRequest.customer.toString(), {
        type: 'materials_receipt_uploaded' as any,
        title: 'Materials Receipt Uploaded',
        message: 'The artisan has uploaded a receipt for materials purchased.',
        link: `/dashboard/customer/contracts/${advanceRequest.contract}`,
        data: { requestId: advanceRequest._id },
      });

      res.json({
        success: true,
        data: advanceRequest,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
