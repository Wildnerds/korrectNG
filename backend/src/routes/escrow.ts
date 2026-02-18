import { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import EscrowPayment from '../models/EscrowPayment';
import JobContract from '../models/JobContract';
import User from '../models/User';
import {
  createEscrow,
  fundEscrow,
  requestMilestoneRelease,
  approveMilestoneRelease,
  canTransition,
} from '../services/escrowStateMachine';
import { log } from '../utils/logger';
import {
  fundEscrowSchema,
  releaseRequestSchema,
  approveReleaseSchema,
} from '@korrectng/shared';

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * @route   POST /api/v1/escrow/:contractId/create
 * @desc    Create escrow for a signed contract
 * @access  Private (Customer)
 */
router.post(
  '/:contractId/create',
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { contractId } = req.params;

      // Verify contract exists and user is customer
      const contract = await JobContract.findById(contractId);
      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found',
        });
      }

      if (contract.customer.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only the customer can create escrow',
        });
      }

      const escrow = await createEscrow(contractId, userId);

      res.status(201).json({
        success: true,
        data: escrow,
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
 * @route   POST /api/v1/escrow/:contractId/fund
 * @desc    Initialize payment to fund escrow
 * @access  Private (Customer)
 */
router.post(
  '/:contractId/fund',
  protect,
  validate(fundEscrowSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { contractId } = req.params;
      const { callbackUrl } = req.body;

      // Get or create escrow
      let escrow = await EscrowPayment.findOne({ contract: contractId });

      if (!escrow) {
        // Auto-create escrow if contract is signed
        const contract = await JobContract.findById(contractId);
        if (!contract) {
          return res.status(404).json({
            success: false,
            error: 'Contract not found',
          });
        }

        if (contract.customer.toString() !== userId.toString()) {
          return res.status(403).json({
            success: false,
            error: 'Only the customer can fund escrow',
          });
        }

        escrow = await createEscrow(contractId, userId);
      }

      if (escrow.customer.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only the customer can fund escrow',
        });
      }

      if (escrow.status !== 'created') {
        return res.status(400).json({
          success: false,
          error: 'Escrow has already been funded or is not in a valid state',
        });
      }

      const user = await User.findById(userId);

      // Initialize Paystack transaction
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email,
          amount: escrow.totalAmount * 100, // Convert to kobo
          reference: escrow.paystackReference,
          callback_url: callbackUrl || `${process.env.CLIENT_URL}/dashboard/customer/escrow/${contractId}?payment=success`,
          metadata: {
            escrow_id: escrow._id.toString(),
            contract_id: contractId,
            type: 'escrow_funding',
            customer_id: userId.toString(),
            artisan_id: escrow.artisan.toString(),
          },
        }),
      });

      const data = await response.json();

      if (!data.status) {
        log.error('Paystack escrow initialization failed', {
          error: data.message,
          escrowId: escrow._id,
        });
        return res.status(400).json({
          success: false,
          error: 'Failed to initialize payment',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          authorization_url: data.data.authorization_url,
          reference: data.data.reference,
          escrowId: escrow._id,
        },
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
 * @route   GET /api/v1/escrow/:contractId/status
 * @desc    Get escrow status for a contract
 * @access  Private
 */
router.get(
  '/:contractId/status',
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { contractId } = req.params;

      const escrow = await EscrowPayment.findOne({ contract: contractId })
        .populate('customer', 'firstName lastName email')
        .populate('artisan', 'firstName lastName email');

      if (!escrow) {
        return res.status(404).json({
          success: false,
          error: 'Escrow not found for this contract',
        });
      }

      // Verify user is participant
      if (
        escrow.customer._id.toString() !== userId.toString() &&
        escrow.artisan._id.toString() !== userId.toString()
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this escrow',
        });
      }

      res.status(200).json({
        success: true,
        data: escrow,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/escrow/:id
 * @desc    Get escrow by ID
 * @access  Private
 */
router.get(
  '/:id',
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { id } = req.params;

      const escrow = await EscrowPayment.findById(id)
        .populate('customer', 'firstName lastName email')
        .populate('artisan', 'firstName lastName email')
        .populate('contract');

      if (!escrow) {
        return res.status(404).json({
          success: false,
          error: 'Escrow not found',
        });
      }

      // Verify user is participant
      if (
        escrow.customer._id.toString() !== userId.toString() &&
        escrow.artisan._id.toString() !== userId.toString()
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this escrow',
        });
      }

      res.status(200).json({
        success: true,
        data: escrow,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/escrow/:id/request-release/:milestone
 * @desc    Artisan requests milestone payment release
 * @access  Private (Artisan)
 */
router.post(
  '/:id/request-release/:milestone',
  protect,
  validate(releaseRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { id, milestone } = req.params;
      const { notes } = req.body;

      const escrow = await EscrowPayment.findById(id);
      if (!escrow) {
        return res.status(404).json({
          success: false,
          error: 'Escrow not found',
        });
      }

      // Verify artisan
      if (escrow.artisan.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only the artisan can request milestone release',
        });
      }

      const milestoneNum = parseInt(milestone);
      if (isNaN(milestoneNum) || milestoneNum < 1 || milestoneNum > 3) {
        return res.status(400).json({
          success: false,
          error: 'Invalid milestone number',
        });
      }

      const updatedEscrow = await requestMilestoneRelease(
        id,
        milestoneNum,
        userId,
        notes
      );

      res.status(200).json({
        success: true,
        message: `Milestone ${milestoneNum} release requested. Awaiting customer approval.`,
        data: updatedEscrow,
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
 * @route   POST /api/v1/escrow/:id/approve-release/:milestone
 * @desc    Customer approves milestone payment release
 * @access  Private (Customer)
 */
router.post(
  '/:id/approve-release/:milestone',
  protect,
  validate(approveReleaseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const { id, milestone } = req.params;
      const { approved, notes } = req.body;

      const escrow = await EscrowPayment.findById(id);
      if (!escrow) {
        return res.status(404).json({
          success: false,
          error: 'Escrow not found',
        });
      }

      // Verify customer
      if (escrow.customer.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Only the customer can approve milestone release',
        });
      }

      const milestoneNum = parseInt(milestone);
      if (isNaN(milestoneNum) || milestoneNum < 1 || milestoneNum > 3) {
        return res.status(400).json({
          success: false,
          error: 'Invalid milestone number',
        });
      }

      if (!approved) {
        // Customer rejected - could open dispute
        return res.status(200).json({
          success: true,
          message: 'Milestone release rejected. Consider opening a dispute if there are issues.',
          data: escrow,
        });
      }

      const updatedEscrow = await approveMilestoneRelease(
        id,
        milestoneNum,
        userId,
        notes
      );

      res.status(200).json({
        success: true,
        message: `Milestone ${milestoneNum} payment released successfully.`,
        data: updatedEscrow,
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
 * @route   GET /api/v1/escrow
 * @desc    Get all escrows for current user
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

    const [escrows, total] = await Promise.all([
      EscrowPayment.find(query)
        .populate('customer', 'firstName lastName email')
        .populate('artisan', 'firstName lastName email')
        .populate('contract', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EscrowPayment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        escrows,
        total,
        hasMore: skip + escrows.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
