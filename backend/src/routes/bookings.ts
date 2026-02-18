import { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import Booking, { BookingStatus } from '../models/Booking';
import ArtisanProfile from '../models/ArtisanProfile';
import User from '../models/User';
import Conversation from '../models/Conversation';
import { z } from 'zod';
import { createNotification, notificationTemplates } from '../services/notifications';
import { log } from '../utils/logger';
import { bookingLimiter } from '../middleware/rateLimiter';
import trustService from '../services/trustService';

const router = Router();

// Validation schemas
const createBookingSchema = z.object({
  artisanProfileId: z.string().min(1),
  jobType: z.string().min(1).max(100),
  description: z.string().min(10).max(2000),
  location: z.string().min(1),
  address: z.string().min(5),
  estimatedPrice: z.number().min(1000), // Minimum ₦1,000
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'in_progress', 'completed']),
  note: z.string().optional(),
  finalPrice: z.number().optional(),
});

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

/**
 * @route   POST /api/v1/bookings
 * @desc    Create a new booking request
 * @access  Private (Customer)
 */
router.post('/', bookingLimiter, protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createBookingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const customerId = (req as any).user._id;
    const { artisanProfileId, jobType, description, location, address, estimatedPrice, scheduledDate, scheduledTime } = validation.data;

    // Get artisan profile
    const artisanProfile = await ArtisanProfile.findById(artisanProfileId).populate('user');
    if (!artisanProfile) {
      return res.status(404).json({
        success: false,
        error: 'Artisan not found',
      });
    }

    // Check if artisan is verified
    if (artisanProfile.verificationStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'This artisan is not currently available for bookings',
      });
    }
    // TODO: Re-enable subscription check when ready to monetize
    // if (!artisanProfile.subscriptionActive) { ... }

    const artisanId = (artisanProfile.user as any)._id;

    // Prevent booking yourself
    if (customerId.toString() === artisanId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot book yourself',
      });
    }

    // Find or create conversation
    const conversation = await (Conversation as any).findOrCreate(
      customerId.toString(),
      artisanId.toString(),
      artisanProfileId
    );

    // Create booking
    const booking = await Booking.create({
      customer: customerId,
      artisan: artisanId,
      artisanProfile: artisanProfileId,
      conversation: conversation._id,
      jobType,
      description,
      location,
      address,
      estimatedPrice,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      scheduledTime,
      status: 'pending',
    });

    // Send notification to artisan
    const customer = await User.findById(customerId);
    await createNotification(
      artisanId.toString(),
      notificationTemplates.bookingRequest(
        `${customer?.firstName} ${customer?.lastName}`,
        jobType,
        booking._id.toString()
      )
    );

    // Populate and return
    const populatedBooking = await Booking.findById(booking._id)
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('artisan', 'firstName lastName email phone avatar')
      .populate('artisanProfile', 'businessName slug trade');

    res.status(201).json({
      success: true,
      data: populatedBooking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/bookings
 * @desc    Get bookings for current user
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

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer', 'firstName lastName email phone avatar')
        .populate('artisan', 'firstName lastName email phone avatar')
        .populate('artisanProfile', 'businessName slug trade')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        total,
        hasMore: skip + bookings.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/bookings/:id
 * @desc    Get a single booking
 * @access  Private
 */
router.get('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId)
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('artisan', 'firstName lastName email phone avatar')
      .populate('artisanProfile', 'businessName slug trade whatsappNumber')
      .populate('review');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Check if user is participant
    if (booking.customer._id.toString() !== userId.toString() &&
        booking.artisan._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this booking',
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/bookings/:id/status
 * @desc    Update booking status (artisan only for accept/reject/complete)
 * @access  Private (Artisan)
 */
router.put('/:id/status', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = updateStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const userId = (req as any).user._id;
    const bookingId = req.params.id;
    const { status, note, finalPrice } = validation.data;

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
        error: 'Not authorized to update this booking',
      });
    }

    // Validate status transitions
    const validTransitions: Record<string, BookingStatus[]> = {
      pending: ['accepted', 'rejected'],
      accepted: ['payment_pending'],
      payment_pending: ['paid'], // This happens via payment webhook
      paid: ['in_progress'],
      in_progress: ['completed'],
    };

    // Special case: when accepting, set status to payment_pending and finalPrice
    if (status === 'accepted') {
      if (booking.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Can only accept pending bookings',
        });
      }

      booking.status = 'payment_pending';
      booking.finalPrice = finalPrice || booking.estimatedPrice;
      (booking as any)._statusChangedBy = userId;

      // Record response time for trust metrics
      const responseTimeMinutes = Math.round(
        (Date.now() - booking.createdAt.getTime()) / (1000 * 60)
      );
      const artisanProfile = await ArtisanProfile.findOne({ user: userId });
      if (artisanProfile) {
        await trustService.recordResponseTime(artisanProfile._id.toString(), responseTimeMinutes);
      }

      // Send notification to customer
      const artisan = await User.findById(userId);
      await createNotification(
        booking.customer.toString(),
        notificationTemplates.bookingAccepted(
          `${artisan?.firstName} ${artisan?.lastName}`,
          bookingId
        )
      );
    } else if (status === 'rejected') {
      if (booking.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Can only reject pending bookings',
        });
      }
      booking.status = 'rejected';
      (booking as any)._statusChangedBy = userId;

      // Record response time for trust metrics (rejection also counts)
      const responseTimeMinutes = Math.round(
        (Date.now() - booking.createdAt.getTime()) / (1000 * 60)
      );
      const artisanProfile = await ArtisanProfile.findOne({ user: userId });
      if (artisanProfile) {
        await trustService.recordResponseTime(artisanProfile._id.toString(), responseTimeMinutes);
      }
    } else if (status === 'in_progress') {
      if (booking.status !== 'paid') {
        return res.status(400).json({
          success: false,
          error: 'Can only start work after payment is received',
        });
      }
      booking.status = 'in_progress';
      (booking as any)._statusChangedBy = userId;
    } else if (status === 'completed') {
      if (booking.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          error: 'Can only complete jobs that are in progress',
        });
      }
      booking.status = 'completed';
      booking.completedAt = new Date();
      (booking as any)._statusChangedBy = userId;

      // Send notification to customer
      const artisan = await User.findById(userId);
      await createNotification(
        booking.customer.toString(),
        notificationTemplates.bookingCompleted(
          `${artisan?.firstName} ${artisan?.lastName}`,
          bookingId
        )
      );
    }

    if (note) {
      booking.statusHistory[booking.statusHistory.length - 1].note = note;
    }

    await booking.save();

    const populatedBooking = await Booking.findById(bookingId)
      .populate('customer', 'firstName lastName email phone avatar')
      .populate('artisan', 'firstName lastName email phone avatar')
      .populate('artisanProfile', 'businessName slug trade');

    res.status(200).json({
      success: true,
      data: populatedBooking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/bookings/:id/pay
 * @desc    Initialize payment for a booking (escrow)
 * @access  Private (Customer)
 */
router.post('/:id/pay', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Verify customer owns this booking
    if (booking.customer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Check status
    if (booking.status !== 'payment_pending') {
      return res.status(400).json({
        success: false,
        error: 'This booking is not awaiting payment',
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
        amount: booking.finalPrice! * 100, // Paystack uses kobo
        reference: booking.paymentReference,
        callback_url: `${process.env.CLIENT_URL}/dashboard/customer/bookings/${bookingId}?payment=success`,
        metadata: {
          booking_id: bookingId,
          type: 'booking_escrow',
          customer_id: userId.toString(),
          artisan_id: booking.artisan.toString(),
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      log.error('Paystack initialization failed', { error: data.message, bookingId });
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
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/bookings/:id/confirm
 * @desc    Customer confirms job completion (releases payment)
 * @access  Private (Customer)
 */
router.post('/:id/confirm', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Verify customer owns this booking
    if (booking.customer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Check status
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Can only confirm completed jobs',
      });
    }

    // Update booking
    booking.status = 'confirmed';
    booking.paymentStatus = 'released';
    booking.releasedAt = new Date();
    (booking as any)._statusChangedBy = userId;
    await booking.save();

    // Send notification to artisan about payment release
    await createNotification(
      booking.artisan.toString(),
      notificationTemplates.paymentReceived(booking.artisanEarnings, booking.jobType)
    );

    // Update artisan stats and trust metrics
    const artisanProfileId = booking.artisanProfile.toString();

    // Check if job was on time
    let wasOnTime = true;
    if (booking.scheduledDate && booking.completedAt) {
      wasOnTime = booking.completedAt <= booking.scheduledDate;
    }

    await trustService.onJobCompleted(artisanProfileId, wasOnTime);

    res.status(200).json({
      success: true,
      message: 'Job confirmed and payment released',
      data: {
        warrantyExpiresAt: booking.warrantyExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private
 */
router.post('/:id/cancel', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const bookingId = req.params.id;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Verify user is participant
    const isCustomer = booking.customer.toString() === userId.toString();
    const isArtisan = booking.artisan.toString() === userId.toString();

    if (!isCustomer && !isArtisan) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Check if cancellation is allowed
    const cancellableStatuses: BookingStatus[] = ['pending', 'accepted', 'payment_pending'];
    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: 'This booking cannot be cancelled at this stage',
      });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledBy = userId;
    (booking as any)._statusChangedBy = userId;
    await booking.save();

    // Update trust metrics if cancelled by artisan
    if (isArtisan) {
      const artisanProfileId = booking.artisanProfile.toString();
      await trustService.onJobCancelledByArtisan(artisanProfileId);
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/bookings/:id/dispute
 * @desc    Open a dispute on a booking
 * @access  Private (Customer)
 */
router.post('/:id/dispute', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const bookingId = req.params.id;
    const { reason } = req.body;

    if (!reason || reason.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a detailed reason for the dispute (at least 20 characters)',
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Verify customer owns this booking
    if (booking.customer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Can only dispute after payment and before confirmation
    const disputableStatuses: BookingStatus[] = ['paid', 'in_progress', 'completed'];
    if (!disputableStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot open dispute at this stage',
      });
    }

    booking.status = 'disputed';
    booking.disputeReason = reason;
    (booking as any)._statusChangedBy = userId;
    await booking.save();

    // TODO: Create a dispute/warranty claim record
    // TODO: Notify admin

    res.status(200).json({
      success: true,
      message: 'Dispute opened. Our team will review and contact you within 24 hours.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/bookings/stats
 * @desc    Get booking stats for artisan
 * @access  Private (Artisan)
 */
router.get('/stats/me', protect, restrictTo('artisan'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;

    const stats = await (Booking as any).getArtisanStats(userId.toString());

    // Calculate totals
    const totalBookings = Object.values(stats).reduce((sum: number, s: any) => sum + s.count, 0);
    const totalEarnings = stats.confirmed?.earnings || 0;
    const completedJobs = stats.confirmed?.count || 0;
    const pendingJobs = (stats.pending?.count || 0) + (stats.accepted?.count || 0) + (stats.in_progress?.count || 0);

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        totalEarnings,
        completedJobs,
        pendingJobs,
        byStatus: stats,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
