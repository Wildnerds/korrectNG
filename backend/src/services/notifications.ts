import Notification, { NotificationType, INotification } from '../models/Notification';
import { log } from '../utils/logger';
import { sendTemplateSMS, SMSTemplate } from './sms';
import { sendPushNotification } from './pushNotifications';
import User from '../models/User';

// Critical notification types that warrant SMS
const SMS_CRITICAL_TYPES: NotificationType[] = [
  'booking_request',
  'booking_accepted',
  'booking_completed',
  'payment_received',
  'verification_approved',
  'verification_rejected',
  'warranty_claim',
];

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
  imageUrl?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  payload: NotificationPayload
): Promise<INotification> {
  try {
    const notification = await (Notification as any).createNotification(
      userId,
      payload.type,
      payload.title,
      payload.message,
      {
        data: payload.data,
        link: payload.link,
        imageUrl: payload.imageUrl,
      }
    );

    log.info('Notification created', {
      userId,
      type: payload.type,
      notificationId: notification._id,
    });

    return notification;
  } catch (error) {
    log.error('Failed to create notification', { error, userId, type: payload.type });
    throw error;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  payload: NotificationPayload
): Promise<number> {
  try {
    const notifications = userIds.map((userId) => ({
      user: userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data,
      link: payload.link,
      imageUrl: payload.imageUrl,
      isRead: false,
    }));

    const result = await Notification.insertMany(notifications);

    log.info('Bulk notifications created', {
      count: result.length,
      type: payload.type,
    });

    return result.length;
  } catch (error) {
    log.error('Failed to create bulk notifications', { error, type: payload.type });
    throw error;
  }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  options?: {
    limit?: number;
    skip?: number;
    unreadOnly?: boolean;
  }
): Promise<{ notifications: INotification[]; unreadCount: number; total: number }> {
  const { limit = 20, skip = 0, unreadOnly = false } = options || {};

  const query: any = { user: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    (Notification as any).getUnreadCount(userId),
    Notification.countDocuments({ user: userId }),
  ]);

  return {
    notifications: notifications as INotification[],
    unreadCount,
    total,
  };
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { isRead: true, readAt: new Date() }
  );

  return !!result;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await (Notification as any).markAllAsRead(userId);
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  const result = await Notification.findOneAndDelete({
    _id: notificationId,
    user: userId,
  });

  return !!result;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return (Notification as any).getUnreadCount(userId);
}

// Pre-built notification templates
export const notificationTemplates = {
  welcome: (name: string, role: 'customer' | 'artisan') => ({
    type: 'welcome' as NotificationType,
    title: 'Welcome to KorrectNG!',
    message: role === 'customer'
      ? `Hi ${name}! Start finding verified artisans for all your service needs.`
      : `Hi ${name}! Complete your profile and get verified to start receiving customers.`,
    link: role === 'customer' ? '/search' : '/dashboard/artisan/verification',
  }),

  newReview: (rating: number, customerName: string, artisanId: string) => ({
    type: 'new_review' as NotificationType,
    title: `New ${rating}-Star Review!`,
    message: `${customerName} left you a review. See what they said about your service.`,
    link: '/dashboard/artisan/reviews',
    data: { rating, customerName },
  }),

  reviewResponse: (artisanName: string, reviewId: string) => ({
    type: 'review_response' as NotificationType,
    title: 'Artisan Responded to Your Review',
    message: `${artisanName} responded to your review.`,
    link: `/reviews/${reviewId}`,
    data: { artisanName },
  }),

  warrantyClaim: (customerName: string, jobDescription: string) => ({
    type: 'warranty_claim' as NotificationType,
    title: 'New Warranty Claim',
    message: `${customerName} submitted a warranty claim. Please respond within 72 hours.`,
    link: '/dashboard/artisan/warranty-claims',
    data: { customerName, jobDescription },
  }),

  warrantyUpdate: (status: string, artisanName: string) => ({
    type: 'warranty_update' as NotificationType,
    title: 'Warranty Claim Update',
    message: `Your warranty claim has been ${status} by ${artisanName}.`,
    link: '/dashboard/customer/warranty-claims',
    data: { status, artisanName },
  }),

  verificationApproved: (businessName: string) => ({
    type: 'verification_approved' as NotificationType,
    title: 'Verification Approved!',
    message: `Congratulations! ${businessName} is now verified. Your profile is live.`,
    link: '/dashboard/artisan',
  }),

  verificationRejected: (reason: string) => ({
    type: 'verification_rejected' as NotificationType,
    title: 'Verification Needs Attention',
    message: 'Your verification application was not approved. Please review and resubmit.',
    link: '/dashboard/artisan/verification',
    data: { reason },
  }),

  subscriptionExpiring: (daysLeft: number) => ({
    type: 'subscription_expiring' as NotificationType,
    title: 'Subscription Expiring Soon',
    message: `Your subscription expires in ${daysLeft} days. Renew to stay visible.`,
    link: '/dashboard/artisan/subscription',
    data: { daysLeft },
  }),

  subscriptionExpired: () => ({
    type: 'subscription_expired' as NotificationType,
    title: 'Subscription Expired',
    message: 'Your profile is now hidden. Renew to appear in search results again.',
    link: '/dashboard/artisan/subscription',
  }),

  newMessage: (senderName: string, conversationId: string) => ({
    type: 'new_message' as NotificationType,
    title: 'New Message',
    message: `${senderName} sent you a message.`,
    link: `/messages/${conversationId}`,
    data: { senderName, conversationId },
  }),

  bookingRequest: (customerName: string, jobType: string, bookingId: string) => ({
    type: 'booking_request' as NotificationType,
    title: 'New Booking Request',
    message: `${customerName} wants to book you for ${jobType}.`,
    link: `/dashboard/artisan/bookings/${bookingId}`,
    data: { customerName, jobType, bookingId },
  }),

  bookingAccepted: (artisanName: string, bookingId: string) => ({
    type: 'booking_accepted' as NotificationType,
    title: 'Booking Accepted!',
    message: `${artisanName} accepted your booking request.`,
    link: `/dashboard/customer/bookings/${bookingId}`,
    data: { artisanName, bookingId },
  }),

  bookingCompleted: (artisanName: string, bookingId: string) => ({
    type: 'booking_completed' as NotificationType,
    title: 'Job Completed',
    message: `${artisanName} marked the job as complete. Please confirm and leave a review.`,
    link: `/dashboard/customer/bookings/${bookingId}`,
    data: { artisanName, bookingId },
  }),

  paymentReceived: (amount: number, jobDescription: string) => ({
    type: 'payment_received' as NotificationType,
    title: 'Payment Received',
    message: `You received ₦${amount.toLocaleString()} for "${jobDescription}".`,
    link: '/dashboard/artisan/earnings',
    data: { amount, jobDescription },
  }),
};

/**
 * Create notification with optional SMS and push for critical events
 */
export async function createNotificationWithSMS(
  userId: string,
  payload: NotificationPayload,
  smsTemplate?: SMSTemplate,
  smsArgs?: any[]
): Promise<INotification> {
  // Create in-app notification
  const notification = await createNotification(userId, payload);

  try {
    const user = await User.findById(userId).select('phone settings').lean();

    // Send push notification if enabled
    const pushEnabled = user?.settings?.pushNotifications !== false;
    if (pushEnabled) {
      await sendPushNotification(userId, payload.title, payload.message, {
        type: payload.type,
        link: payload.link,
        notificationId: notification._id.toString(),
        ...payload.data,
      });
    }

    // Send SMS for critical notifications
    if (SMS_CRITICAL_TYPES.includes(payload.type) && smsTemplate) {
      const smsEnabled = user?.settings?.smsNotifications !== false;

      if (user?.phone && smsEnabled) {
        await sendTemplateSMS(user.phone, smsTemplate, ...(smsArgs || []));
        log.info('SMS sent for critical notification', {
          userId,
          type: payload.type,
          template: smsTemplate,
        });
      }
    }
  } catch (error) {
    // Don't fail the notification if push/SMS fails
    log.error('Failed to send push/SMS for notification', {
      error,
      userId,
      type: payload.type,
    });
  }

  return notification;
}

/**
 * Create notification with push only (no SMS)
 */
export async function createNotificationWithPush(
  userId: string,
  payload: NotificationPayload
): Promise<INotification> {
  // Create in-app notification
  const notification = await createNotification(userId, payload);

  try {
    const user = await User.findById(userId).select('settings').lean();
    const pushEnabled = user?.settings?.pushNotifications !== false;

    if (pushEnabled) {
      await sendPushNotification(userId, payload.title, payload.message, {
        type: payload.type,
        link: payload.link,
        notificationId: notification._id.toString(),
        ...payload.data,
      });
    }
  } catch (error) {
    log.error('Failed to send push notification', {
      error,
      userId,
      type: payload.type,
    });
  }

  return notification;
}

export default {
  createNotification,
  createNotificationWithSMS,
  createNotificationWithPush,
  createBulkNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  notificationTemplates,
};
