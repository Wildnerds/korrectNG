import { Router, Response } from 'express';
import { PushToken } from '../models';
import { AuthRequest } from '@korrect/auth-middleware';
import { Logger } from '@korrect/logger';

const router = Router();

// Helper: Get auth middleware from app
function withAuth(handler: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: any) => {
    const { protect } = req.app.locals.authMiddleware;
    protect(req, res, () => handler(req, res).catch(next));
  };
}

// Validate Expo push token format
function isValidExpoToken(token: string): boolean {
  return /^ExponentPushToken\[[a-zA-Z0-9_-]+\]$/.test(token) ||
         /^[a-zA-Z0-9_-]{40,}$/.test(token);
}

/**
 * POST /api/v1/push-tokens
 * Register a push token for the current user
 */
router.post('/', withAuth(async (req: AuthRequest, res: Response) => {
  const logger: Logger = req.app.locals.logger;
  const { token, platform, deviceId } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Push token is required',
    });
  }

  if (!platform || !['ios', 'android', 'web'].includes(platform)) {
    return res.status(400).json({
      success: false,
      error: 'Valid platform (ios, android, web) is required',
    });
  }

  // Validate token format for native platforms
  if ((platform === 'ios' || platform === 'android') && !isValidExpoToken(token)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid push token format',
    });
  }

  try {
    // Upsert token - update if exists, create if not
    await PushToken.findOneAndUpdate(
      { token },
      {
        user: req.user!.id,
        token,
        platform,
        deviceId,
        isActive: true,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    logger.debug('Push token registered', {
      userId: req.user!.id,
      platform,
      deviceId,
    });

    res.json({
      success: true,
      message: 'Push token registered',
    });
  } catch (error) {
    // Handle duplicate key error gracefully
    if ((error as any).code === 11000) {
      // Token already exists, update it
      await PushToken.findOneAndUpdate(
        { token },
        {
          user: req.user!.id,
          isActive: true,
          lastUsedAt: new Date(),
        }
      );

      res.json({
        success: true,
        message: 'Push token registered',
      });
    } else {
      throw error;
    }
  }
}));

/**
 * DELETE /api/v1/push-tokens
 * Unregister a push token (on logout)
 */
router.delete('/', withAuth(async (req: AuthRequest, res: Response) => {
  const logger: Logger = req.app.locals.logger;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Push token is required',
    });
  }

  // Mark token as inactive instead of deleting
  await PushToken.findOneAndUpdate(
    { token },
    { isActive: false }
  );

  logger.debug('Push token unregistered', {
    userId: req.user!.id,
    token: token.substring(0, 20) + '...',
  });

  res.json({
    success: true,
    message: 'Push token unregistered',
  });
}));

/**
 * GET /api/v1/push-tokens
 * Get user's registered push tokens
 */
router.get('/', withAuth(async (req: AuthRequest, res: Response) => {
  const tokens = await PushToken.find({
    user: req.user!.id,
    isActive: true,
  }).select('platform deviceId lastUsedAt createdAt');

  res.json({
    success: true,
    data: tokens,
  });
}));

export default router;
