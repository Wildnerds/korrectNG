import { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import JobContract, { ContractStatus } from '../models/JobContract';
import Booking from '../models/Booking';
import { ArtisanProfile } from '../models/ArtisanProfile';
import { createNotification, notificationTemplates } from '../services/notifications';
import { log } from '../utils/logger';
import { getContractTemplate, getDefaultMilestones } from '../data/contractTemplates';
import {
  createContractSchema,
  updateContractSchema,
  signContractSchema,
} from '@korrectng/shared';

const router = Router();

/**
 * @route   POST /api/v1/contracts
 * @desc    Create a new contract from a booking
 * @access  Private (Artisan)
 */
router.post(
  '/',
  protect,
  validate(createContractSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const {
        bookingId,
        title,
        scopeOfWork,
        deliverables,
        exclusions,
        materialsResponsibility,
        materialsList,
        startDate,
        estimatedEndDate,
        milestones,
      } = req.body;

      // Get the booking
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
      }

      // Verify artisan owns this booking
      if (booking.artisan.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to create contract for this booking',
        });
      }

      // Check booking status - must be accepted/payment_pending
      if (!['accepted', 'payment_pending'].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          error: 'Contract can only be created for accepted bookings',
        });
      }

      // Check if contract already exists for this booking
      const existingContract = await JobContract.findOne({ booking: bookingId });
      if (existingContract) {
        return res.status(400).json({
          success: false,
          error: 'A contract already exists for this booking',
        });
      }

      // Validate milestones add up to 100%
      const totalPercentage = milestones.reduce(
        (sum: number, m: { percentage: number }) => sum + m.percentage,
        0
      );
      if (totalPercentage !== 100) {
        return res.status(400).json({
          success: false,
          error: 'Milestone percentages must add up to 100%',
        });
      }

      // Create the contract
      const contract = await JobContract.create({
        booking: bookingId,
        customer: booking.customer,
        artisan: booking.artisan,
        artisanProfile: booking.artisanProfile,
        title,
        scopeOfWork,
        deliverables,
        exclusions: exclusions || [],
        materialsResponsibility,
        materialsList: materialsList || [],
        totalAmount: booking.finalPrice || booking.estimatedPrice,
        startDate: new Date(startDate),
        estimatedEndDate: new Date(estimatedEndDate),
        milestones: milestones.map((m: any, index: number) => ({
          ...m,
          order: m.order || index + 1,
          status: 'pending',
          amount: 0, // Will be calculated by pre-save hook
        })),
        status: 'draft',
        statusHistory: [{
          status: 'draft',
          timestamp: new Date(),
          by: userId,
        }],
      });

      // Update booking with contract reference
      booking.contract = contract._id;
      await booking.save();

      // Populate and return
      const populatedContract = await JobContract.findById(contract._id)
        .populate('customer', 'firstName lastName email phone')
        .populate('artisan', 'firstName lastName email phone')
        .populate('artisanProfile', 'businessName slug trade');

      log.info('Contract created', {
        contractId: contract._id,
        bookingId,
        artisanId: userId,
      });

      res.status(201).json({
        success: true,
        data: populatedContract,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/contracts
 * @desc    Get contracts for current user
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

    const [contracts, total] = await Promise.all([
      JobContract.find(query)
        .populate('customer', 'firstName lastName email phone avatar')
        .populate('artisan', 'firstName lastName email phone avatar')
        .populate('artisanProfile', 'businessName slug trade')
        .populate('booking', 'jobType description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      JobContract.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        contracts,
        total,
        hasMore: skip + contracts.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/contracts/:id
 * @desc    Get a single contract
 * @access  Private
 */
router.get('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const contractId = req.params.id;

    const contract = await JobContract.findById(contractId)
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('artisan', 'firstName lastName email phone avatar')
      .populate('artisanProfile', 'businessName slug trade')
      .populate('booking', 'jobType description location address scheduledDate');

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    // Check if user is participant
    if (
      contract.customer._id.toString() !== userId.toString() &&
      contract.artisan._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this contract',
      });
    }

    res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/contracts/:id
 * @desc    Update a draft contract
 * @access  Private (Artisan)
 */
router.put(
  '/:id',
  protect,
  validate(updateContractSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const contractId = req.params.id;

      const contract = await JobContract.findById(contractId);

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found',
        });
      }

      // Only artisan can update
      if (contract.artisan.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this contract',
        });
      }

      // Can only update draft contracts
      if (contract.status !== 'draft') {
        return res.status(400).json({
          success: false,
          error: 'Can only update draft contracts',
        });
      }

      const updateFields = req.body;

      // Validate milestones if provided
      if (updateFields.milestones) {
        const totalPercentage = updateFields.milestones.reduce(
          (sum: number, m: { percentage: number }) => sum + m.percentage,
          0
        );
        if (totalPercentage !== 100) {
          return res.status(400).json({
            success: false,
            error: 'Milestone percentages must add up to 100%',
          });
        }
      }

      // Update allowed fields
      Object.keys(updateFields).forEach((key) => {
        if (updateFields[key] !== undefined) {
          (contract as any)[key] = updateFields[key];
        }
      });

      await contract.save();

      const populatedContract = await JobContract.findById(contractId)
        .populate('customer', 'firstName lastName email phone avatar')
        .populate('artisan', 'firstName lastName email phone avatar')
        .populate('artisanProfile', 'businessName slug trade');

      res.status(200).json({
        success: true,
        data: populatedContract,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/contracts/:id/send
 * @desc    Send contract to customer for review and signature
 * @access  Private (Artisan)
 */
router.post('/:id/send', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const contractId = req.params.id;

    const contract = await JobContract.findById(contractId)
      .populate('customer', 'firstName lastName')
      .populate('artisan', 'firstName lastName');

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    // Only artisan can send
    if (contract.artisan._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Must be in draft status
    if (contract.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Contract has already been sent',
      });
    }

    // Update status to pending_signatures
    contract.setStatus('pending_signatures', userId, 'Contract sent to customer for review');
    await contract.save();

    // Notify customer
    await createNotification(contract.customer._id.toString(), {
      type: 'contract_created' as any,
      title: 'New Contract for Review',
      message: `${(contract.artisan as any).firstName} ${(contract.artisan as any).lastName} has sent you a contract for review and signature.`,
      link: `/dashboard/customer/contracts/${contractId}`,
      data: { contractId },
    });

    log.info('Contract sent to customer', { contractId, customerId: contract.customer._id });

    res.status(200).json({
      success: true,
      message: 'Contract sent to customer for review',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/contracts/:id/sign
 * @desc    Sign a contract
 * @access  Private
 */
router.post(
  '/:id/sign',
  protect,
  validate(signContractSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const role = (req as any).user.role;
      const contractId = req.params.id;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

      const contract = await JobContract.findById(contractId)
        .populate('customer', 'firstName lastName')
        .populate('artisan', 'firstName lastName');

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found',
        });
      }

      // Verify user is participant
      const isCustomer = contract.customer._id.toString() === userId.toString();
      const isArtisan = contract.artisan._id.toString() === userId.toString();

      if (!isCustomer && !isArtisan) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to sign this contract',
        });
      }

      // Check status
      if (contract.status !== 'pending_signatures') {
        return res.status(400).json({
          success: false,
          error: 'Contract is not ready for signing',
        });
      }

      // Check if already signed by this party
      if (isCustomer && contract.customerSignature) {
        return res.status(400).json({
          success: false,
          error: 'You have already signed this contract',
        });
      }

      if (isArtisan && contract.artisanSignature) {
        return res.status(400).json({
          success: false,
          error: 'You have already signed this contract',
        });
      }

      // Add signature
      const signature = {
        signedBy: userId,
        signedAt: new Date(),
        ipAddress: String(ipAddress),
      };

      if (isCustomer) {
        contract.customerSignature = signature;
      } else {
        contract.artisanSignature = signature;
      }

      // Check if both parties have signed
      if (contract.customerSignature && contract.artisanSignature) {
        contract.setStatus('signed', userId, 'Both parties have signed');
      }

      await contract.save();

      // Notify the other party
      const otherPartyId = isCustomer
        ? contract.artisan._id.toString()
        : contract.customer._id.toString();
      const signerName = isCustomer
        ? `${(contract.customer as any).firstName} ${(contract.customer as any).lastName}`
        : `${(contract.artisan as any).firstName} ${(contract.artisan as any).lastName}`;

      await createNotification(otherPartyId, {
        type: 'signature_received' as any,
        title: 'Contract Signed',
        message: `${signerName} has signed the contract.`,
        link: `/dashboard/${isCustomer ? 'artisan' : 'customer'}/contracts/${contractId}`,
        data: { contractId },
      });

      // If both signed, notify both parties
      if (contract.status === 'signed') {
        const bothSignedNotification = {
          type: 'contract_signed' as any,
          title: 'Contract Fully Executed',
          message: 'Both parties have signed the contract. You can now proceed to escrow payment.',
          link: `/dashboard/${role}/contracts/${contractId}`,
          data: { contractId },
        };

        await Promise.all([
          createNotification(contract.customer._id.toString(), bothSignedNotification),
          createNotification(contract.artisan._id.toString(), bothSignedNotification),
        ]);
      }

      log.info('Contract signed', {
        contractId,
        signedBy: userId,
        role: isCustomer ? 'customer' : 'artisan',
        fullyExecuted: contract.status === 'signed',
      });

      res.status(200).json({
        success: true,
        message: contract.status === 'signed'
          ? 'Contract fully executed! Both parties have signed.'
          : 'Contract signed successfully. Waiting for other party to sign.',
        data: {
          status: contract.status,
          customerSigned: !!contract.customerSignature,
          artisanSigned: !!contract.artisanSignature,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/contracts/templates/:trade
 * @desc    Get contract template for a specific trade
 * @access  Private
 */
router.get(
  '/templates/:trade',
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trade = req.params.trade;

      const template = getContractTemplate(trade as any);

      if (!template) {
        // Return default milestones if no trade-specific template
        return res.status(200).json({
          success: true,
          data: {
            trade,
            defaultMilestones: getDefaultMilestones(),
            commonDeliverables: [],
            commonExclusions: [],
            materialsNote: 'Discuss materials responsibility with your customer.',
          },
        });
      }

      res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/contracts/:id/cancel
 * @desc    Cancel a contract
 * @access  Private
 */
router.post('/:id/cancel', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const contractId = req.params.id;
    const { reason } = req.body;

    const contract = await JobContract.findById(contractId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    // Verify user is participant
    const isCustomer = contract.customer.toString() === userId.toString();
    const isArtisan = contract.artisan.toString() === userId.toString();

    if (!isCustomer && !isArtisan) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Can only cancel draft or pending_signatures contracts
    const cancellableStatuses: ContractStatus[] = ['draft', 'pending_signatures'];
    if (!cancellableStatuses.includes(contract.status)) {
      return res.status(400).json({
        success: false,
        error: 'This contract cannot be cancelled at this stage',
      });
    }

    contract.setStatus('cancelled', userId, reason || 'Cancelled by user');
    await contract.save();

    // Notify the other party
    const otherPartyId = isCustomer
      ? contract.artisan.toString()
      : contract.customer.toString();

    await createNotification(otherPartyId, {
      type: 'contract_cancelled' as any,
      title: 'Contract Cancelled',
      message: `The contract has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      link: `/dashboard/${isCustomer ? 'artisan' : 'customer'}/contracts/${contractId}`,
      data: { contractId, reason },
    });

    log.info('Contract cancelled', { contractId, cancelledBy: userId, reason });

    res.status(200).json({
      success: true,
      message: 'Contract cancelled',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/contracts/booking/:bookingId
 * @desc    Get contract by booking ID
 * @access  Private
 */
router.get(
  '/booking/:bookingId',
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user._id;
      const bookingId = req.params.bookingId;

      const contract = await JobContract.findOne({ booking: bookingId })
        .populate('customer', 'firstName lastName email phone avatar')
        .populate('artisan', 'firstName lastName email phone avatar')
        .populate('artisanProfile', 'businessName slug trade')
        .populate('booking', 'jobType description location address');

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'No contract found for this booking',
        });
      }

      // Check if user is participant
      if (
        contract.customer._id.toString() !== userId.toString() &&
        contract.artisan._id.toString() !== userId.toString()
      ) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this contract',
        });
      }

      res.status(200).json({
        success: true,
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
