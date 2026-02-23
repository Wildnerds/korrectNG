import Booking from '../models/Booking';
import { createNotification, notificationTemplates } from '../services/notifications';
import trustService from '../services/trustService';
import { log } from '../utils/logger';

const AUTO_CERTIFICATION_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

let autoCertificationInterval: NodeJS.Timeout | null = null;

/**
 * Auto-certify bookings that have passed the 3-day certification deadline
 * This protects artisans from non-responsive customers
 */
export async function runAutoCertificationCheck(): Promise<void> {
  try {
    const now = new Date();

    // Find all completed bookings past their certification deadline that haven't been certified
    const overdueBookings = await Booking.find({
      status: 'completed',
      jobCompletedAt: { $exists: true },
      certificationDeadline: { $lt: now },
      customerCertifiedAt: { $exists: false },
      autoCertifiedAt: { $exists: false },
    });

    if (overdueBookings.length === 0) {
      return;
    }

    log.info('Auto-certification job found overdue bookings', { count: overdueBookings.length });

    let certifiedCount = 0;

    for (const booking of overdueBookings) {
      try {
        const gracePeriodExpiry = new Date(now);
        gracePeriodExpiry.setDate(gracePeriodExpiry.getDate() + 7); // 7-day grace period

        // Auto-certify the booking
        booking.status = 'confirmed';
        booking.confirmedAt = now;
        booking.customerCertifiedAt = now;
        booking.autoCertifiedAt = now;
        booking.gracePeriodExpiresAt = gracePeriodExpiry;
        booking.warrantyExpiresAt = gracePeriodExpiry;
        booking.paymentStatus = 'released';
        booking.releasedAt = now;
        (booking as any)._statusChangedBy = booking.customer; // System acting on behalf of customer

        await booking.save();

        // Notify customer that job was auto-certified
        await createNotification(
          booking.customer.toString(),
          {
            type: 'booking_completed',
            title: 'Job Auto-Certified',
            message: `Your job "${booking.jobType}" was automatically certified after 3 days. Payment has been released to the artisan. You have 7 days to report any issues.`,
            link: `/dashboard/customer/bookings/${booking._id}`,
          }
        );

        // Notify artisan about payment release
        await createNotification(
          booking.artisan.toString(),
          notificationTemplates.paymentReceived(booking.artisanEarnings, booking.jobType)
        );

        // Update artisan trust metrics
        const artisanProfileId = booking.artisanProfile.toString();
        let wasOnTime = true;
        if (booking.scheduledDate && booking.completedAt) {
          wasOnTime = booking.completedAt <= booking.scheduledDate;
        }
        await trustService.onJobCompleted(artisanProfileId, wasOnTime);

        certifiedCount++;
      } catch (bookingError) {
        log.error('Failed to auto-certify booking', {
          bookingId: booking._id,
          error: bookingError,
        });
      }
    }

    if (certifiedCount > 0) {
      log.info('Auto-certification job completed', { certifiedCount });
    }
  } catch (error) {
    log.error('Auto-certification job failed', { error });
  }
}

/**
 * Start the auto-certification job (runs every hour)
 */
export function startAutoCertificationJob(): void {
  if (autoCertificationInterval) {
    log.warn('Auto-certification job already running');
    return;
  }

  log.info('Starting auto-certification job', { intervalMs: AUTO_CERTIFICATION_INTERVAL_MS });

  // Run immediately on start
  runAutoCertificationCheck();

  // Then run periodically
  autoCertificationInterval = setInterval(runAutoCertificationCheck, AUTO_CERTIFICATION_INTERVAL_MS);
}

/**
 * Stop the auto-certification job
 */
export function stopAutoCertificationJob(): void {
  if (autoCertificationInterval) {
    clearInterval(autoCertificationInterval);
    autoCertificationInterval = null;
    log.info('Auto-certification job stopped');
  }
}

export default {
  runAutoCertificationCheck,
  startAutoCertificationJob,
  stopAutoCertificationJob,
};
