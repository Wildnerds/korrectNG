import { Router, Request, Response } from 'express';
import { Notification } from '../models';
import { Logger } from '@korrect/logger';

const router = Router();

// GET /api/v1/notifications - Get user notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    const query: any = { user: userId };
    if (unreadOnly) {
      query.status = { $ne: 'read' };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: userId,
      status: { $ne: 'read' },
    });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get notifications error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/notifications/unread-count - Get unread count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const count = await Notification.countDocuments({
      user: userId,
      status: { $ne: 'read' },
    });

    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get unread count error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/notifications/:id/read - Mark as read
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { status: 'read', readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Mark notification read error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/notifications/read-all - Mark all as read
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    await Notification.updateMany(
      { user: userId, status: { $ne: 'read' } },
      { status: 'read', readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Mark all read error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/v1/notifications/:id - Delete notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Delete notification error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/notifications/settings - Get notification settings
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    // Fetch user settings from users service
    try {
      const usersClient = req.app.locals.usersClient;
      const response = await usersClient.get(`/internal/users/${userId}`);
      const settings = response.data?.settings?.notifications || {
        push: true,
        email: true,
        sms: false,
        marketing: false,
      };
      res.json({ success: true, data: settings });
    } catch {
      // Return defaults if user service unavailable
      res.json({
        success: true,
        data: {
          push: true,
          email: true,
          sms: false,
          marketing: false,
        },
      });
    }
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get notification settings error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
