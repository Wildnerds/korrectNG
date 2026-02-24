import { Router, Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  registerWebPushSubscription,
  unregisterWebPushSubscription,
  getVapidPublicKey,
  isWebPushConfigured,
} from '../services/webPushNotifications';

const router = Router();

/**
 * GET /api/v1/web-push/vapid-public-key
 * Get the VAPID public key for client-side subscription
 */
router.get('/vapid-public-key', (_req, res: Response) => {
  const publicKey = getVapidPublicKey();

  if (!publicKey) {
    return res.status(503).json({
      success: false,
      message: 'Web push notifications are not configured',
    });
  }

  res.status(200).json({
    success: true,
    data: { publicKey },
  });
});

/**
 * GET /api/v1/web-push/status
 * Check if web push is configured
 */
router.get('/status', (_req, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      configured: isWebPushConfigured(),
      message: isWebPushConfigured()
        ? 'Web push notifications are enabled'
        : 'Web push notifications are not configured. VAPID keys required.',
    },
  });
});

/**
 * POST /api/v1/web-push/subscribe
 * Subscribe to web push notifications
 */
router.post('/subscribe', protect, async (req: AuthRequest, res: Response, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new AppError('Invalid subscription object', 400);
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      throw new AppError('Subscription keys (p256dh, auth) are required', 400);
    }

    if (!isWebPushConfigured()) {
      throw new AppError('Web push notifications are not configured on the server', 503);
    }

    const userAgent = req.headers['user-agent'];

    const result = await registerWebPushSubscription(
      req.user!._id.toString(),
      subscription,
      userAgent
    );

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to push notifications',
      data: { id: result._id },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/web-push/unsubscribe
 * Unsubscribe from web push notifications
 */
router.post('/unsubscribe', protect, async (req: AuthRequest, res: Response, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      throw new AppError('Endpoint is required', 400);
    }

    const result = await unregisterWebPushSubscription(endpoint);

    res.status(200).json({
      success: true,
      message: result ? 'Successfully unsubscribed' : 'Subscription not found',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
