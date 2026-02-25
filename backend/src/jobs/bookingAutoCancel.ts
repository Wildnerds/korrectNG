import Booking from '../models/Booking';
import { createNotificationWithPush } from '../services/notifications';
import { log } from '../utils/logger';

const AUTO_CANCEL_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes

let autoCancelInterval: NodeJS.Timeout | null = null;

/**
 * Auto-cancel bookings that have expired without action:
 * - pending: Artisan didn't respond within 48 hours
 * - quoted: Customer didn't accept/decline within 48 hours
 * - accepted: Customer didn't pay within 24 hours
 */
export async function runBookingAutoCancelCheck(): Promise<void> {
  try {
    const now = new Date();

    // Find all bookings that have passed their expiry time
    const expiredBookings = await Booking.find({
      status: { $in: ['pending', 'quoted', 'accepted'] },
      expiresAt: { $lt: now },
    }).populate('customer artisan', 'firstName lastName');

    if (expiredBookings.length === 0) {
      return;
    }

    log.info('Auto-cancel job found expired bookings', { count: expiredBookings.length });

    let cancelledCount = 0;

    for (const booking of expiredBookings) {
      try {
        const previousStatus = booking.status;

        booking.status = 'cancelled';
        booking.cancellationReason = `Auto-cancelled: No action taken within the required timeframe`;
        booking.expiresAt = undefined;
        (booking as any)._statusChangedBy = booking.customer; // System action

        await booking.save();

        const customer = booking.customer as any;
        const artisan = booking.artisan as any;
        const customerName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Customer';
        const artisanName = `${artisan?.firstName || ''} ${artisan?.lastName || ''}`.trim() || 'Artisan';

        // Send notifications based on why it was cancelled
        if (previousStatus === 'pending') {
          // Artisan didn't respond - notify both
          await createNotificationWithPush(
            booking.customer.toString(),
            {
              type: 'booking_rejected',
              title: 'Booking Expired',
              message: `Your booking for ${booking.jobType} was cancelled because the artisan didn't respond in time. Try another artisan.`,
              link: '/search',
            }
          );
          await createNotificationWithPush(
            booking.artisan.toString(),
            {
              type: 'booking_rejected',
              title: 'Booking Expired',
              message: `A booking request from ${customerName} for ${booking.jobType} expired because you didn't respond in time.`,
              link: '/dashboard/artisan/bookings',
            }
          );
        } else if (previousStatus === 'quoted') {
          // Customer didn't respond to quote - notify both
          await createNotificationWithPush(
            booking.customer.toString(),
            {
              type: 'booking_rejected',
              title: 'Quote Expired',
              message: `Your quote for ${booking.jobType} expired because you didn't respond in time.`,
              link: '/search',
            }
          );
          await createNotificationWithPush(
            booking.artisan.toString(),
            {
              type: 'booking_rejected',
              title: 'Quote Expired',
              message: `Your quote to ${customerName} for ${booking.jobType} expired because they didn't respond in time.`,
              link: '/dashboard/artisan/bookings',
            }
          );
        } else if (previousStatus === 'accepted') {
          // Customer didn't pay - notify both
          await createNotificationWithPush(
            booking.customer.toString(),
            {
              type: 'booking_rejected',
              title: 'Booking Cancelled',
              message: `Your booking for ${booking.jobType} was cancelled because payment wasn't completed in time.`,
              link: '/search',
            }
          );
          await createNotificationWithPush(
            booking.artisan.toString(),
            {
              type: 'booking_rejected',
              title: 'Booking Cancelled',
              message: `The booking from ${customerName} for ${booking.jobType} was cancelled because they didn't complete payment in time.`,
              link: '/dashboard/artisan/bookings',
            }
          );
        }

        cancelledCount++;
        log.info('Auto-cancelled booking', {
          bookingId: booking._id,
          previousStatus,
          jobType: booking.jobType,
        });
      } catch (bookingError) {
        log.error('Failed to auto-cancel booking', {
          bookingId: booking._id,
          error: bookingError,
        });
      }
    }

    if (cancelledCount > 0) {
      log.info('Auto-cancel job completed', { cancelledCount });
    }
  } catch (error) {
    log.error('Auto-cancel job failed', { error });
  }
}

/**
 * Start the auto-cancel job (runs every 15 minutes)
 */
export function startBookingAutoCancelJob(): void {
  if (autoCancelInterval) {
    log.warn('Auto-cancel job already running');
    return;
  }

  log.info('Starting booking auto-cancel job', { intervalMs: AUTO_CANCEL_INTERVAL_MS });

  // Run immediately on start
  runBookingAutoCancelCheck();

  // Then run periodically
  autoCancelInterval = setInterval(runBookingAutoCancelCheck, AUTO_CANCEL_INTERVAL_MS);
}

/**
 * Stop the auto-cancel job
 */
export function stopBookingAutoCancelJob(): void {
  if (autoCancelInterval) {
    clearInterval(autoCancelInterval);
    autoCancelInterval = null;
    log.info('Auto-cancel job stopped');
  }
}

export default {
  runBookingAutoCancelCheck,
  startBookingAutoCancelJob,
  stopBookingAutoCancelJob,
};
