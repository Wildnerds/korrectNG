import axios from 'axios';
import PushToken from '../models/PushToken';
import { log } from '../utils/logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'MessageTooBig' | 'MessageRateExceeded' | 'InvalidCredentials';
  };
}

/**
 * Register a push token for a user
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web',
  deviceId?: string
): Promise<boolean> {
  try {
    // Validate Expo push token format
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      log.warn('Invalid push token format', { token: token.substring(0, 20) });
      return false;
    }

    // Upsert the token
    await PushToken.findOneAndUpdate(
      { token },
      {
        user: userId,
        token,
        platform,
        deviceId,
        isActive: true,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    log.info('Push token registered', { userId, platform });
    return true;
  } catch (error) {
    log.error('Failed to register push token', { error, userId });
    return false;
  }
}

/**
 * Unregister a push token
 */
export async function unregisterPushToken(token: string): Promise<boolean> {
  try {
    await PushToken.findOneAndUpdate({ token }, { isActive: false });
    log.info('Push token unregistered', { token: token.substring(0, 30) });
    return true;
  } catch (error) {
    log.error('Failed to unregister push token', { error });
    return false;
  }
}

/**
 * Get all active push tokens for a user
 */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  const tokens = await PushToken.find({
    user: userId,
    isActive: true,
  }).select('token');

  return tokens.map((t) => t.token);
}

/**
 * Send push notification to a single user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; sent: number; failed: number }> {
  const tokens = await getUserPushTokens(userId);

  if (tokens.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
    priority: 'high',
  }));

  return sendPushMessages(messages);
}

/**
 * Send push notifications to multiple users
 */
export async function sendBulkPushNotifications(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; sent: number; failed: number }> {
  const tokens = await PushToken.find({
    user: { $in: userIds },
    isActive: true,
  }).select('token');

  if (tokens.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: 'default',
    priority: 'high',
  }));

  return sendPushMessages(messages);
}

/**
 * Send messages via Expo Push API
 */
async function sendPushMessages(
  messages: ExpoPushMessage[]
): Promise<{ success: boolean; sent: number; failed: number }> {
  if (messages.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  try {
    // Expo recommends sending in chunks of 100
    const chunks = chunkArray(messages, 100);
    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];

    for (const chunk of chunks) {
      const response = await axios.post<{ data: ExpoPushTicket[] }>(
        EXPO_PUSH_URL,
        chunk,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      const tickets = response.data.data;

      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          // Mark invalid tokens for cleanup
          if (ticket.details?.error === 'DeviceNotRegistered') {
            invalidTokens.push(chunk[index].to);
          }
          log.warn('Push notification failed', {
            error: ticket.details?.error,
            message: ticket.message,
          });
        }
      });
    }

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      await PushToken.updateMany(
        { token: { $in: invalidTokens } },
        { isActive: false }
      );
      log.info('Deactivated invalid push tokens', { count: invalidTokens.length });
    }

    log.info('Push notifications sent', { sent, failed, total: messages.length });
    return { success: true, sent, failed };
  } catch (error: any) {
    log.error('Expo push API error', { error: error.message });
    return { success: false, sent: 0, failed: messages.length };
  }
}

/**
 * Helper to chunk array
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Push notification templates
 */
export const pushTemplates = {
  newBooking: (customerName: string, jobType: string) => ({
    title: 'New Booking Request!',
    body: `${customerName} wants to book you for ${jobType}`,
  }),

  bookingAccepted: (artisanName: string) => ({
    title: 'Booking Accepted!',
    body: `${artisanName} has accepted your booking. Proceed to payment.`,
  }),

  bookingRejected: (artisanName: string) => ({
    title: 'Booking Declined',
    body: `${artisanName} couldn't accept your booking. Find another artisan.`,
  }),

  paymentReceived: (amount: number) => ({
    title: 'Payment Received!',
    body: `₦${amount.toLocaleString()} received. Your job is confirmed.`,
  }),

  jobCompleted: (artisanName: string) => ({
    title: 'Job Marked Complete',
    body: `${artisanName} marked your job as complete. Please confirm.`,
  }),

  newMessage: (senderName: string) => ({
    title: 'New Message',
    body: `${senderName} sent you a message`,
  }),

  newReview: (rating: number, customerName: string) => ({
    title: `New ${rating}-Star Review!`,
    body: `${customerName} left you a review`,
  }),

  verificationApproved: () => ({
    title: 'Verification Approved!',
    body: 'Congratulations! You can now receive bookings.',
  }),

  verificationRejected: () => ({
    title: 'Verification Needs Attention',
    body: 'Your verification needs updates. Check the app.',
  }),

  warrantyClaim: (customerName: string) => ({
    title: 'Warranty Claim Filed',
    body: `${customerName} filed a warranty claim. Respond within 48hrs.`,
  }),
};

export default {
  registerPushToken,
  unregisterPushToken,
  getUserPushTokens,
  sendPushNotification,
  sendBulkPushNotifications,
  pushTemplates,
};
