import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { EscrowPayment, JobContract, Booking } from '../models';
import { Logger } from '@korrect/logger';
import { EVENT_TYPES, EventBus } from '@korrect/event-bus';

const router = Router();

// POST /api/v1/payments/initialize - Initialize payment for escrow
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const { escrowId, email } = req.body;

    const escrow = await EscrowPayment.findById(escrowId);
    if (!escrow) {
      return res.status(404).json({ success: false, error: 'Escrow not found' });
    }

    if (escrow.customer.toString() !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    if (escrow.status !== 'created') {
      return res.status(400).json({ success: false, error: 'Escrow already funded or in progress' });
    }

    // In production, call Paystack API to initialize transaction
    // For now, return mock response
    const reference = `ESC_${escrow._id}_${Date.now()}`;

    res.json({
      success: true,
      data: {
        authorization_url: `https://checkout.paystack.com/mock/${reference}`,
        access_code: 'mock_access_code',
        reference,
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Initialize payment error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/payments/webhook - Paystack webhook
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const logger: Logger = req.app.locals.logger;
    const eventBus: EventBus = req.app.locals.eventBus;
    const paystackSecretKey = req.app.locals.paystackSecretKey;

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(req.body)
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      logger.warn('Invalid Paystack webhook signature');
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    logger.info('Paystack webhook received', { event: event.event });

    if (event.event === 'charge.success') {
      const { reference, amount } = event.data;

      // Find escrow by reference
      const escrow = await EscrowPayment.findOne({ paystackReference: reference });
      if (escrow && escrow.status === 'created') {
        escrow.status = 'funded';
        escrow.fundedAmount = amount / 100; // Paystack sends amount in kobo
        escrow.fundedAt = new Date();
        await escrow.save();

        // Update booking status
        const booking = await Booking.findById(escrow.booking);
        if (booking) {
          booking.status = 'paid';
          await booking.save();
        }

        // Update contract status
        const contract = await JobContract.findById(escrow.contract);
        if (contract) {
          contract.status = 'active';
          await contract.save();
        }

        // Publish event
        try {
          await eventBus.publish(EVENT_TYPES.ESCROW_FUNDED, {
            escrowId: escrow._id.toString(),
            contractId: escrow.contract.toString(),
            customerId: escrow.customer.toString(),
            artisanId: escrow.artisan.toString(),
            amount: escrow.fundedAmount,
          });

          await eventBus.publish(EVENT_TYPES.PAYMENT_RECEIVED, {
            paymentId: reference,
            bookingId: escrow.booking.toString(),
            customerId: escrow.customer.toString(),
            amount: escrow.fundedAmount,
            reference,
          });
        } catch (eventError) {
          logger.error('Failed to publish payment events', { error: eventError instanceof Error ? eventError.message : eventError });
        }

        logger.info('Escrow funded via webhook', { escrowId: escrow._id.toString(), amount: escrow.fundedAmount });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Webhook processing error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// POST /api/v1/payments/verify/:reference - Verify payment
router.post('/verify/:reference', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const logger: Logger = req.app.locals.logger;
    const { reference } = req.params;

    // In production, verify with Paystack API
    // For now, return mock success

    // Find and update escrow
    const escrow = await EscrowPayment.findOne({ paystackReference: reference });
    if (!escrow) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    res.json({
      success: true,
      data: {
        status: escrow.status,
        amount: escrow.fundedAmount,
        reference,
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Verify payment error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
