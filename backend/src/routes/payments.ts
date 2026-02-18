import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Subscription, ArtisanProfile, VerificationApplication } from '../models';
import Booking from '../models/Booking';
import EscrowPayment from '../models/EscrowPayment';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification, notificationTemplates } from '../services/notifications';
import { fundEscrow, confirmTransfer } from '../services/escrowStateMachine';
import { log } from '../utils/logger';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

// Track processed webhook references for idempotency
const processedReferences = new Set<string>();

// POST /api/v1/payments/subscribe
router.post('/subscribe', paymentLimiter, protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    // Check verification
    if (artisan.verificationStatus !== 'approved') {
      throw new AppError('You must be verified before subscribing', 400);
    }

    // Check existing active subscription
    const existing = await Subscription.findOne({ artisan: artisan._id, status: 'active' });
    if (existing) throw new AppError('You already have an active subscription', 400);

    // Initialize Paystack subscription
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user!.email,
        amount: 5000 * 100, // 5000 NGN in kobo
        currency: 'NGN',
        plan: process.env.PAYSTACK_PLAN_CODE,
        reference: `SUB-${artisan._id}-${Date.now()}`,
        callback_url: `${process.env.CLIENT_URL}/dashboard/artisan?tab=subscription`,
        metadata: {
          type: 'subscription',
          artisanId: artisan._id.toString(),
        },
      }),
    });

    const data = await response.json();
    if (!data.status) throw new AppError('Failed to initialize payment', 500);

    res.status(200).json({ success: true, data: data.data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/payments/subscription
router.get('/subscription', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const subscription = await Subscription.findOne({ artisan: artisan._id });
    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/payments/cancel
router.post('/cancel', paymentLimiter, protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const subscription = await Subscription.findOne({ artisan: artisan._id, status: 'active' });
    if (!subscription) throw new AppError('No active subscription found', 404);

    // Cancel on Paystack
    const response = await fetch('https://api.paystack.co/subscription/disable', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: subscription.paystackSubscriptionCode,
        token: subscription.paystackCustomerCode,
      }),
    });

    const data = await response.json();
    if (!data.status) throw new AppError('Failed to cancel subscription', 500);

    subscription.status = 'cancelled';
    await subscription.save();

    artisan.subscriptionActive = false;
    artisan.isPublished = false;
    await artisan.save();

    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/payments/webhook - Paystack webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    log.error('PAYSTACK_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Get raw body as string (express.raw() provides Buffer)
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);

  // Verify Paystack signature using HMAC SHA512
  const expectedSignature = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  const receivedSignature = req.headers['x-paystack-signature'] as string;

  if (!receivedSignature) {
    log.warn('Webhook received without signature');
    return res.status(400).json({ error: 'Missing signature' });
  }

  // Constant-time comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const receivedBuffer = Buffer.from(receivedSignature, 'hex');

  if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    log.warn('Webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Parse the verified body
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    log.error('Failed to parse webhook body');
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const reference = event.data?.reference;

  // Idempotency check
  if (reference && processedReferences.has(reference)) {
    return res.status(200).json({ received: true });
  }

  try {
    switch (event.event) {
      case 'charge.success': {
        const metadata = event.data.metadata;

        if (metadata?.type === 'verification') {
          // Handle verification payment
          const { applicationId } = metadata;
          const application = await VerificationApplication.findById(applicationId);
          if (application && application.paymentStatus !== 'paid') {
            application.paymentStatus = 'paid';
            application.paymentReference = reference;
            await application.save();
          }
        } else if (metadata?.type === 'booking_escrow') {
          // Handle booking escrow payment (legacy flow)
          const { booking_id } = metadata;
          const booking = await Booking.findById(booking_id);
          if (booking && booking.paymentStatus !== 'escrow') {
            booking.status = 'paid';
            booking.paymentStatus = 'escrow';
            booking.paystackReference = reference;
            booking.paidAt = new Date();
            await booking.save();

            // Notify artisan that payment is received and they can start work
            await createNotification(
              booking.artisan.toString(),
              {
                type: 'payment_received',
                title: 'Payment Received - Start Work',
                message: `Customer has paid ₦${booking.finalPrice?.toLocaleString()} for ${booking.jobType}. You can now start the job.`,
                link: `/dashboard/artisan/bookings/${booking_id}`,
                data: { bookingId: booking_id },
              }
            );
          }
        } else if (metadata?.type === 'escrow_funding') {
          // Handle contract escrow funding
          const { escrow_id, customer_id } = metadata;
          const escrow = await EscrowPayment.findById(escrow_id);
          if (escrow && escrow.status === 'created') {
            await fundEscrow(escrow_id, customer_id, reference);
            log.info('Escrow funded via webhook', { escrowId: escrow_id, reference });
          }
        }
        break;
      }

      case 'subscription.create': {
        const { customer, subscription_code, next_payment_date } = event.data;
        const artisanId = event.data.metadata?.artisanId;

        if (artisanId) {
          await Subscription.findOneAndUpdate(
            { artisan: artisanId },
            {
              artisan: artisanId,
              paystackSubscriptionCode: subscription_code,
              paystackCustomerCode: customer.customer_code,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(next_payment_date),
              amount: 5000,
            },
            { upsert: true, new: true }
          );

          await ArtisanProfile.findByIdAndUpdate(artisanId, {
            subscriptionActive: true,
            isPublished: true,
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const subCode = event.data.subscription?.subscription_code;
        if (subCode) {
          const sub = await Subscription.findOne({ paystackSubscriptionCode: subCode });
          if (sub) {
            sub.status = 'past_due';
            await sub.save();
            await ArtisanProfile.findByIdAndUpdate(sub.artisan, {
              subscriptionActive: false,
              isPublished: false,
            });
          }
        }
        break;
      }

      case 'subscription.not_renew': {
        const subCode2 = event.data.subscription_code;
        if (subCode2) {
          const sub = await Subscription.findOne({ paystackSubscriptionCode: subCode2 });
          if (sub) {
            sub.status = 'cancelled';
            await sub.save();
            await ArtisanProfile.findByIdAndUpdate(sub.artisan, {
              subscriptionActive: false,
              isPublished: false,
            });
          }
        }
        break;
      }

      case 'transfer.success': {
        // Handle successful milestone payout
        const transferRef = event.data.transfer_code;
        if (transferRef) {
          await confirmTransfer(transferRef, true);
          log.info('Transfer confirmed successful', { transferRef });
        }
        break;
      }

      case 'transfer.failed': {
        // Handle failed milestone payout
        const transferRef = event.data.transfer_code;
        if (transferRef) {
          await confirmTransfer(transferRef, false);
          log.error('Transfer failed', { transferRef, reason: event.data.reason });
          // TODO: Notify admin for manual intervention
        }
        break;
      }

      case 'transfer.reversed': {
        // Handle reversed transfer
        const transferRef = event.data.transfer_code;
        log.warn('Transfer reversed', { transferRef, reason: event.data.reason });
        // TODO: Notify admin and potentially refund customer
        break;
      }
    }

    if (reference) processedReferences.add(reference);
  } catch (error) {
    log.error('Webhook processing error', { error: error instanceof Error ? error.message : error, event: event?.event });
  }

  res.status(200).json({ received: true });
});

// GET /api/v1/payments/history
router.get('/history', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const artisan = await ArtisanProfile.findOne({ user: req.user!._id });
    if (!artisan) throw new AppError('Artisan profile not found', 404);

    const subscription = await Subscription.findOne({ artisan: artisan._id });
    const verification = await VerificationApplication.findOne({ artisan: artisan._id });

    const history: any[] = [];
    if (verification?.paymentStatus === 'paid') {
      history.push({
        type: 'verification',
        amount: 10000,
        status: 'paid',
        reference: verification.paymentReference,
        date: verification.updatedAt,
      });
    }
    if (subscription) {
      history.push({
        type: 'subscription',
        amount: subscription.amount,
        status: subscription.status,
        date: subscription.createdAt,
      });
    }

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

export default router;
