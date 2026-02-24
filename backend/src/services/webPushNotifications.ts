import webpush from 'web-push';
import WebPushSubscription, { IWebPushSubscription } from '../models/WebPushSubscription';
import { log } from '../utils/logger';

// Initialize web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@korrectng.ng';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  log.info('Web Push initialized with VAPID keys');
} else {
  log.warn('Web Push VAPID keys not configured. Run: npx web-push generate-vapid-keys');
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
}

/**
 * Register a web push subscription for a user
 */
export async function registerWebPushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): Promise<IWebPushSubscription> {
  // Upsert - update if endpoint exists, create if not
  const result = await WebPushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      user: userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
      isActive: true,
      lastUsedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  log.info('Web push subscription registered', { userId, endpoint: subscription.endpoint.substring(0, 50) });
  return result;
}

/**
 * Unregister a web push subscription
 */
export async function unregisterWebPushSubscription(endpoint: string): Promise<boolean> {
  const result = await WebPushSubscription.findOneAndUpdate(
    { endpoint },
    { isActive: false }
  );

  if (result) {
    log.info('Web push subscription unregistered', { endpoint: endpoint.substring(0, 50) });
    return true;
  }
  return false;
}

/**
 * Get all active web push subscriptions for a user
 */
export async function getUserWebPushSubscriptions(userId: string): Promise<IWebPushSubscription[]> {
  return WebPushSubscription.find({ user: userId, isActive: true });
}

/**
 * Send web push notification to a single user
 */
export async function sendWebPushNotification(
  userId: string,
  payload: WebPushPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    log.warn('Cannot send web push - VAPID keys not configured');
    return { success: false, sent: 0, failed: 0 };
  }

  const subscriptions = await getUserWebPushSubscriptions(userId);

  if (subscriptions.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const notificationPayload = JSON.stringify({
    ...payload,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
  });

  let sent = 0;
  let failed = 0;
  const invalidEndpoints: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        notificationPayload
      );
      sent++;

      // Update last used
      sub.lastUsedAt = new Date();
      await sub.save();
    } catch (error: any) {
      failed++;

      // Handle expired/invalid subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        invalidEndpoints.push(sub.endpoint);
        log.info('Web push subscription expired', { endpoint: sub.endpoint.substring(0, 50) });
      } else {
        log.error('Web push send failed', {
          error: error.message,
          statusCode: error.statusCode,
          endpoint: sub.endpoint.substring(0, 50),
        });
      }
    }
  }

  // Clean up invalid subscriptions
  if (invalidEndpoints.length > 0) {
    await WebPushSubscription.updateMany(
      { endpoint: { $in: invalidEndpoints } },
      { isActive: false }
    );
  }

  log.info('Web push notifications sent', { userId, sent, failed });
  return { success: true, sent, failed };
}

/**
 * Send web push notification to multiple users
 */
export async function sendBulkWebPushNotifications(
  userIds: string[],
  payload: WebPushPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, sent: 0, failed: 0 };
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendWebPushNotification(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { success: true, sent: totalSent, failed: totalFailed };
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

/**
 * Check if web push is configured
 */
export function isWebPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Web push notification templates
 */
export const webPushTemplates = {
  newBooking: (customerName: string, jobType: string) => ({
    title: 'New Booking Request!',
    body: `${customerName} wants to book you for ${jobType}`,
    tag: 'booking-request',
    data: { type: 'booking_request' },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }),

  bookingAccepted: (artisanName: string, bookingId: string) => ({
    title: 'Booking Accepted!',
    body: `${artisanName} has accepted your booking. Proceed to payment.`,
    tag: 'booking-accepted',
    data: { type: 'booking_accepted', bookingId },
    actions: [{ action: 'pay', title: 'Pay Now' }],
  }),

  bookingRejected: (artisanName: string) => ({
    title: 'Booking Declined',
    body: `${artisanName} couldn't accept your booking. Find another artisan.`,
    tag: 'booking-rejected',
    data: { type: 'booking_rejected' },
  }),

  paymentReceived: (amount: number, jobType: string) => ({
    title: 'Payment Received!',
    body: `₦${amount.toLocaleString()} received for ${jobType}. Job confirmed!`,
    tag: 'payment-received',
    data: { type: 'payment_received' },
  }),

  jobCompleted: (artisanName: string, bookingId: string) => ({
    title: 'Job Marked Complete',
    body: `${artisanName} marked your job as complete. Please confirm within 3 days.`,
    tag: 'job-completed',
    data: { type: 'job_completed', bookingId },
    requireInteraction: true,
    actions: [
      { action: 'confirm', title: 'Confirm' },
      { action: 'dispute', title: 'Report Issue' },
    ],
  }),

  newMessage: (senderName: string, conversationId: string) => ({
    title: 'New Message',
    body: `${senderName} sent you a message`,
    tag: `message-${conversationId}`,
    data: { type: 'new_message', conversationId },
  }),

  newReview: (rating: number, customerName: string) => ({
    title: `New ${rating}-Star Review!`,
    body: `${customerName} left you a review`,
    tag: 'new-review',
    data: { type: 'new_review' },
  }),

  verificationApproved: () => ({
    title: 'Verification Approved!',
    body: 'Congratulations! Your profile is now verified. You can start receiving bookings.',
    tag: 'verification-approved',
    data: { type: 'verification_approved' },
  }),

  verificationRejected: (reason: string) => ({
    title: 'Verification Needs Attention',
    body: reason || 'Your verification application needs updates. Please check the app.',
    tag: 'verification-rejected',
    data: { type: 'verification_rejected' },
  }),

  warrantyClaim: (customerName: string, bookingId: string) => ({
    title: 'Warranty Claim Filed',
    body: `${customerName} filed a warranty claim. Please respond within 48 hours.`,
    tag: 'warranty-claim',
    data: { type: 'warranty_claim', bookingId },
    requireInteraction: true,
  }),

  paymentReleased: (amount: number, jobType: string) => ({
    title: 'Payment Released!',
    body: `₦${amount.toLocaleString()} has been released for "${jobType}". Check your earnings.`,
    tag: 'payment-released',
    data: { type: 'payment_released' },
  }),
};

export default {
  registerWebPushSubscription,
  unregisterWebPushSubscription,
  getUserWebPushSubscriptions,
  sendWebPushNotification,
  sendBulkWebPushNotifications,
  getVapidPublicKey,
  isWebPushConfigured,
  webPushTemplates,
};
