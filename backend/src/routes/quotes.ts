import { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import Quote from '../models/Quote';
import Booking from '../models/Booking';
import { ArtisanProfile } from '../models/ArtisanProfile';
import { User } from '../models/User';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { z } from 'zod';
import { createNotificationWithPush } from '../services/notifications';
import { log } from '../utils/logger';
import trustService from '../services/trustService';

const router = Router();

// Validation schemas
const submitQuoteSchema = z.object({
  bookingId: z.string().min(1),
  labourCharge: z.number().min(1000, 'Labour charge must be at least ₦1,000'),
  materialsEstimate: z.number().min(0).optional(),
  message: z.string().max(1000).optional(),
  estimatedDuration: z.string().max(100).optional(),
  externalSourcingRequired: z.boolean().optional(),
});

const reviseQuoteSchema = z.object({
  labourCharge: z.number().min(1000, 'Labour charge must be at least ₦1,000'),
  materialsEstimate: z.number().min(0).optional(),
  message: z.string().max(1000).optional(),
});

/**
 * @route   POST /api/v1/quotes
 * @desc    Submit a quote for a booking (v2 flow)
 * @access  Private (Artisan)
 */
router.post('/', protect, restrictTo('artisan'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = submitQuoteSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const artisanUserId = (req as any).user._id;
    const { bookingId, labourCharge, materialsEstimate, message, estimatedDuration, externalSourcingRequired } = validation.data;

    // Get artisan profile
    const artisanProfile = await ArtisanProfile.findOne({ user: artisanUserId });
    if (!artisanProfile) {
      return res.status(400).json({
        success: false,
        error: 'Artisan profile not found',
      });
    }

    // Verify artisan is verified
    if (artisanProfile.verificationStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Only verified artisans can submit quotes',
      });
    }

    // Get booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Check if booking is open for quotes (v2)
    if (booking.bookingVersion !== 'v2' || booking.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'This booking is not accepting quotes',
      });
    }

    // Check if artisan already submitted a quote
    const existingQuote = await Quote.findOne({
      booking: bookingId,
      artisan: artisanUserId,
      status: { $in: ['pending'] },
    });

    if (existingQuote) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted a quote for this booking. Use the revise endpoint to update it.',
      });
    }

    // Calculate total
    const totalAmount = labourCharge + (materialsEstimate || 0);

    // Validate labour is at least 10% of total
    if (labourCharge < totalAmount * 0.10) {
      return res.status(400).json({
        success: false,
        error: `Labour charge must be at least 10% of total amount (₦${Math.ceil(totalAmount * 0.10).toLocaleString()})`,
      });
    }

    // Find or create conversation
    const conversation = await (Conversation as any).findOrCreate(
      booking.customer.toString(),
      artisanUserId.toString(),
      artisanProfile._id.toString()
    );

    // Create quote
    const quote = await Quote.create({
      booking: bookingId,
      artisan: artisanUserId,
      artisanProfile: artisanProfile._id,
      conversation: conversation._id,
      labourCharge,
      materialsEstimate: materialsEstimate || 0,
      totalAmount,
      message,
      estimatedDuration,
      externalSourcingRequired: externalSourcingRequired || false,
    });

    // Create quote message in conversation
    await Message.create({
      conversation: conversation._id,
      sender: artisanUserId,
      content: message || `Quote for ₦${totalAmount.toLocaleString()}`,
      type: 'quote_sent',
      metadata: {
        quoteId: quote._id.toString(),
        totalAmount,
        labourCharge,
        materialsEstimate,
        estimatedDuration,
      },
    });

    // Record response time for trust metrics
    const responseTimeMinutes = Math.round(
      (Date.now() - booking.createdAt.getTime()) / (1000 * 60)
    );
    await trustService.recordResponseTime(artisanProfile._id.toString(), responseTimeMinutes);

    // Notify customer
    const artisan = await User.findById(artisanUserId);
    const artisanName = artisan?.firstName && artisan?.lastName
      ? `${artisan.firstName} ${artisan.lastName}`
      : artisanProfile.businessName || 'An artisan';

    await createNotificationWithPush(
      booking.customer.toString(),
      {
        type: 'quote_received',
        title: 'New Quote Received',
        message: `${artisanName} sent you a quote of ₦${totalAmount.toLocaleString()} for your ${booking.jobType} request.`,
        link: `/dashboard/customer/bookings/${bookingId}/quotes`,
      }
    );

    log.info('Quote submitted', {
      quoteId: quote._id,
      bookingId,
      artisanId: artisanUserId,
      totalAmount,
    });

    const populatedQuote = await Quote.findById(quote._id)
      .populate('artisan', 'firstName lastName avatar')
      .populate('artisanProfile', 'businessName slug trade rating reviewCount');

    res.status(201).json({
      success: true,
      message: 'Quote submitted successfully',
      data: populatedQuote,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/quotes/booking/:bookingId
 * @desc    Get all quotes for a booking
 * @access  Private (Customer or Artisans who quoted)
 */
router.get('/booking/:bookingId', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      });
    }

    // Check authorization
    const isCustomer = booking.customer.toString() === userId.toString();
    const isArtisanWithQuote = await Quote.exists({
      booking: bookingId,
      artisan: userId,
    });

    if (!isCustomer && !isArtisanWithQuote) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view quotes for this booking',
      });
    }

    // Get all quotes
    const quotes = await Quote.find({
      booking: bookingId,
      status: { $in: ['pending', 'accepted'] },
    })
      .populate('artisan', 'firstName lastName avatar')
      .populate('artisanProfile', 'businessName slug trade rating reviewCount averageResponseTime')
      .sort({ createdAt: -1 });

    // If artisan, only show their own quote
    const filteredQuotes = isCustomer
      ? quotes
      : quotes.filter(q => q.artisan._id.toString() === userId.toString());

    res.status(200).json({
      success: true,
      data: {
        quotes: filteredQuotes,
        total: filteredQuotes.length,
        isCustomer,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/quotes/:id
 * @desc    Get a single quote with version history
 * @access  Private (Customer or Artisan who submitted)
 */
router.get('/:id', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;

    const quote = await Quote.findById(id)
      .populate('booking', 'jobType description location status customer')
      .populate('artisan', 'firstName lastName avatar')
      .populate('artisanProfile', 'businessName slug trade rating reviewCount');

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
      });
    }

    // Check authorization
    const booking = quote.booking as any;
    const isCustomer = booking.customer.toString() === userId.toString();
    const isArtisan = quote.artisan._id.toString() === userId.toString();

    if (!isCustomer && !isArtisan) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this quote',
      });
    }

    res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/quotes/:id
 * @desc    Revise a quote (creates new version)
 * @access  Private (Artisan who submitted)
 */
router.put('/:id', protect, restrictTo('artisan'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = reviseQuoteSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const userId = (req as any).user._id;
    const { id } = req.params;
    const { labourCharge, materialsEstimate, message } = validation.data;

    const quote = await Quote.findById(id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
      });
    }

    // Verify artisan owns this quote
    if (quote.artisan.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to revise this quote',
      });
    }

    // Can only revise pending quotes
    if (quote.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Can only revise pending quotes',
      });
    }

    // Calculate new total
    const newTotalAmount = labourCharge + (materialsEstimate || 0);

    // Validate labour is at least 10% of total
    if (labourCharge < newTotalAmount * 0.10) {
      return res.status(400).json({
        success: false,
        error: `Labour charge must be at least 10% of total amount (₦${Math.ceil(newTotalAmount * 0.10).toLocaleString()})`,
      });
    }

    // Create revision
    quote.createRevision(labourCharge, materialsEstimate, message);
    await quote.save();

    // Create revision message in conversation
    await Message.create({
      conversation: quote.conversation,
      sender: userId,
      content: message || `Revised quote to ₦${newTotalAmount.toLocaleString()}`,
      type: 'quote_revised',
      metadata: {
        quoteId: quote._id.toString(),
        version: quote.version,
        totalAmount: newTotalAmount,
        labourCharge,
        materialsEstimate,
        previousTotalAmount: quote.previousVersions[quote.previousVersions.length - 1]?.totalAmount,
      },
    });

    // Notify customer
    const booking = await Booking.findById(quote.booking);
    const artisan = await User.findById(userId);
    const artisanProfile = await ArtisanProfile.findOne({ user: userId });
    const artisanName = artisan?.firstName && artisan?.lastName
      ? `${artisan.firstName} ${artisan.lastName}`
      : artisanProfile?.businessName || 'An artisan';

    if (booking) {
      await createNotificationWithPush(
        booking.customer.toString(),
        {
          type: 'quote_revised',
          title: 'Quote Updated',
          message: `${artisanName} revised their quote to ₦${newTotalAmount.toLocaleString()} for your ${booking.jobType} request.`,
          link: `/dashboard/customer/bookings/${booking._id}/quotes`,
        }
      );
    }

    log.info('Quote revised', {
      quoteId: quote._id,
      version: quote.version,
      newTotalAmount,
    });

    const populatedQuote = await Quote.findById(quote._id)
      .populate('artisan', 'firstName lastName avatar')
      .populate('artisanProfile', 'businessName slug trade rating reviewCount');

    res.status(200).json({
      success: true,
      message: 'Quote revised successfully',
      data: populatedQuote,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/quotes/:id/accept
 * @desc    Customer accepts a quote
 * @access  Private (Customer)
 */
router.post('/:id/accept', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;

    const quote = await Quote.findById(id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
      });
    }

    const booking = await Booking.findById(quote.booking);

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
        error: 'Not authorized to accept this quote',
      });
    }

    // Can only accept pending quotes on open bookings
    if (quote.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'This quote cannot be accepted',
      });
    }

    if (booking.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'This booking is no longer accepting quotes',
      });
    }

    // Accept this quote
    quote.status = 'accepted';
    await quote.save();

    // Reject all other pending quotes for this booking
    await Quote.updateMany(
      {
        booking: booking._id,
        _id: { $ne: quote._id },
        status: 'pending',
      },
      { status: 'superseded' }
    );

    // Update booking with accepted quote and artisan
    booking.acceptedQuote = quote._id;
    booking.artisan = quote.artisan;
    booking.artisanProfile = quote.artisanProfile;
    booking.conversation = quote.conversation;
    booking.status = 'payment_pending';
    booking.quotedPrice = quote.totalAmount;
    booking.finalPrice = quote.totalAmount;
    booking.platformFee = quote.platformFee;
    booking.artisanEarnings = quote.artisanEarnings;
    (booking as any)._statusChangedBy = userId;
    await booking.save();

    // Create accepted message in conversation
    const customer = await User.findById(userId);
    const customerName = customer?.firstName && customer?.lastName
      ? `${customer.firstName} ${customer.lastName}`
      : 'The customer';

    await Message.create({
      conversation: quote.conversation,
      sender: userId,
      content: `${customerName} accepted your quote of ₦${quote.totalAmount.toLocaleString()}`,
      type: 'quote_accepted',
      metadata: {
        quoteId: quote._id.toString(),
        totalAmount: quote.totalAmount,
      },
    });

    // Notify artisan
    const artisan = await User.findById(quote.artisan);
    const artisanProfile = await ArtisanProfile.findOne({ user: quote.artisan });

    await createNotificationWithPush(
      quote.artisan.toString(),
      {
        type: 'quote_accepted',
        title: 'Quote Accepted!',
        message: `${customerName} accepted your quote of ₦${quote.totalAmount.toLocaleString()} for ${booking.jobType}. Awaiting payment.`,
        link: `/dashboard/artisan/bookings/${booking._id}`,
      }
    );

    // Notify other artisans their quotes were superseded
    const supersededQuotes = await Quote.find({
      booking: booking._id,
      status: 'superseded',
    }).distinct('artisan');

    for (const artisanId of supersededQuotes) {
      await createNotificationWithPush(
        artisanId.toString(),
        {
          type: 'quote_rejected',
          title: 'Quote Not Selected',
          message: `The customer chose another artisan for their ${booking.jobType} request.`,
          link: `/dashboard/artisan/bookings`,
        }
      );
    }

    log.info('Quote accepted', {
      quoteId: quote._id,
      bookingId: booking._id,
      artisanId: quote.artisan,
      totalAmount: quote.totalAmount,
    });

    res.status(200).json({
      success: true,
      message: 'Quote accepted. Please proceed to payment.',
      data: {
        quote,
        booking: await Booking.findById(booking._id)
          .populate('customer', 'firstName lastName email phone avatar')
          .populate('artisan', 'firstName lastName email phone avatar')
          .populate('artisanProfile', 'businessName slug trade'),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/quotes/:id/reject
 * @desc    Customer rejects a specific quote
 * @access  Private (Customer)
 */
router.post('/:id/reject', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const { id } = req.params;
    const { reason } = req.body;

    const quote = await Quote.findById(id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
      });
    }

    const booking = await Booking.findById(quote.booking);

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
        error: 'Not authorized to reject this quote',
      });
    }

    // Can only reject pending quotes
    if (quote.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'This quote cannot be rejected',
      });
    }

    // Reject the quote
    quote.status = 'rejected';
    await quote.save();

    // Create rejected message in conversation
    const customer = await User.findById(userId);
    const customerName = customer?.firstName && customer?.lastName
      ? `${customer.firstName} ${customer.lastName}`
      : 'The customer';

    await Message.create({
      conversation: quote.conversation,
      sender: userId,
      content: reason || `${customerName} declined this quote`,
      type: 'quote_rejected',
      metadata: {
        quoteId: quote._id.toString(),
        reason,
      },
    });

    // Notify artisan
    await createNotificationWithPush(
      quote.artisan.toString(),
      {
        type: 'quote_rejected',
        title: 'Quote Declined',
        message: `${customerName} declined your quote for ${booking.jobType}.${reason ? ` Reason: ${reason}` : ''}`,
        link: `/dashboard/artisan/bookings`,
      }
    );

    log.info('Quote rejected', {
      quoteId: quote._id,
      bookingId: booking._id,
      reason,
    });

    res.status(200).json({
      success: true,
      message: 'Quote rejected',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/quotes/my-quotes
 * @desc    Get artisan's own quotes
 * @access  Private (Artisan)
 */
router.get('/my-quotes', protect, restrictTo('artisan'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;

    const query: any = { artisan: userId };
    if (status) {
      query.status = status;
    }

    const [quotes, total] = await Promise.all([
      Quote.find(query)
        .populate('booking', 'jobType description location status createdAt')
        .populate('artisanProfile', 'businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Quote.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        quotes,
        total,
        hasMore: skip + quotes.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
