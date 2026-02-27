import { Router } from 'express';
import { MaterialEscrow, MaterialOrder } from '../models';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { requestRelease, disputeMaterialEscrow, releaseMaterialEscrow, refundMaterialEscrow } from '../services/materialEscrowStateMachine';

const router = Router();

// GET /api/v1/material-escrow/:orderId - Get escrow status
router.get('/:orderId', protect, async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Authorization check
    const isCustomer = order.customer.toString() === req.user!._id.toString();
    const isMerchant = order.merchant.toString() === req.user!._id.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isCustomer && !isMerchant && !isAdmin) {
      throw new AppError('Not authorized to view this escrow', 403);
    }

    const escrow = await MaterialEscrow.findOne({ order: req.params.orderId })
      .populate('customer', 'firstName lastName email')
      .populate('merchant', 'firstName lastName email')
      .populate('merchantProfile', 'businessName');

    if (!escrow) {
      throw new AppError('Escrow not found', 404);
    }

    res.status(200).json({ success: true, data: escrow });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-escrow/:orderId/request-release - Merchant requests release
router.post('/:orderId/request-release', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.merchant.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    if (order.status !== 'received') {
      throw new AppError('Order must be received before requesting release', 400);
    }

    const escrow = await MaterialEscrow.findOne({ order: req.params.orderId });
    if (!escrow) {
      throw new AppError('Escrow not found', 404);
    }

    const { notes } = req.body;
    const updatedEscrow = await requestRelease(escrow._id.toString(), req.user!._id, notes);

    res.status(200).json({ success: true, data: updatedEscrow });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-escrow/:orderId/release - Admin releases escrow
router.post('/:orderId/release', protect, authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const escrow = await MaterialEscrow.findOne({ order: req.params.orderId });
    if (!escrow) {
      throw new AppError('Escrow not found', 404);
    }

    const { notes } = req.body;
    const updatedEscrow = await releaseMaterialEscrow(escrow._id.toString(), req.user!._id, notes);

    res.status(200).json({ success: true, data: updatedEscrow });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-escrow/:orderId/dispute - Raise dispute
router.post('/:orderId/dispute', protect, async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Customer or merchant can raise dispute
    const isCustomer = order.customer.toString() === req.user!._id.toString();
    const isMerchant = order.merchant.toString() === req.user!._id.toString();

    if (!isCustomer && !isMerchant) {
      throw new AppError('Not authorized', 403);
    }

    const escrow = await MaterialEscrow.findOne({ order: req.params.orderId });
    if (!escrow) {
      throw new AppError('Escrow not found', 404);
    }

    const { reason } = req.body;
    if (!reason || reason.length < 20) {
      throw new AppError('Reason must be at least 20 characters', 400);
    }

    const updatedEscrow = await disputeMaterialEscrow(escrow._id.toString(), reason, req.user!._id);

    res.status(200).json({ success: true, data: updatedEscrow });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/material-escrow/:orderId/refund - Admin processes refund
router.post('/:orderId/refund', protect, authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const order = await MaterialOrder.findById(req.params.orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const escrow = await MaterialEscrow.findOne({ order: req.params.orderId });
    if (!escrow) {
      throw new AppError('Escrow not found', 404);
    }

    const { amount, reason } = req.body;
    if (!amount || amount <= 0) {
      throw new AppError('Valid refund amount is required', 400);
    }
    if (!reason) {
      throw new AppError('Reason is required', 400);
    }

    const updatedEscrow = await refundMaterialEscrow(escrow._id.toString(), amount, reason, req.user!._id);

    res.status(200).json({ success: true, data: updatedEscrow });
  } catch (error) {
    next(error);
  }
});

export default router;
