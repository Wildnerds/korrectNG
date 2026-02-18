import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { registerPushToken, unregisterPushToken } from '../services/pushNotifications';
import { log } from '../utils/logger';

const router = Router();

/**
 * @route   POST /api/v1/push-tokens
 * @desc    Register a push token for the current user
 * @access  Private
 */
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const { token, platform, deviceId } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Valid platform (ios, android, web) is required',
      });
    }

    const success = await registerPushToken(
      req.user!._id.toString(),
      token,
      platform,
      deviceId
    );

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid push token format',
      });
    }

    res.json({
      success: true,
      message: 'Push token registered',
    });
  } catch (error) {
    log.error('Register push token error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/v1/push-tokens
 * @desc    Unregister a push token (on logout)
 * @access  Private
 */
router.delete('/', auth, async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    await unregisterPushToken(token);

    res.json({
      success: true,
      message: 'Push token unregistered',
    });
  } catch (error) {
    log.error('Unregister push token error', { error });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
