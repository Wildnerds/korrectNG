import { Router, Request, Response } from 'express';
import { Notification, SearchLog, PriceCatalog, Supplier } from '../models';
import { Logger } from '@korrect/logger';

const router = Router();

// Middleware to check admin role (basic implementation)
const adminOnly = (req: Request, res: Response, next: Function) => {
  const userRole = req.headers['x-user-role'] as string;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

// GET /api/v1/admin/dashboard - Admin dashboard stats
router.get('/dashboard', adminOnly, async (req: Request, res: Response) => {
  try {
    const logger: Logger = req.app.locals.logger;

    // Get stats from various services
    const [usersClient, artisanClient, transactionClient] = [
      req.app.locals.usersClient,
      req.app.locals.artisanClient,
      req.app.locals.transactionClient,
    ];

    const stats: any = {
      notifications: {
        pending: await Notification.countDocuments({ status: 'pending' }),
        sent: await Notification.countDocuments({ status: 'sent' }),
        failed: await Notification.countDocuments({ status: 'failed' }),
      },
      searches: {
        today: await SearchLog.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
        week: await SearchLog.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      },
      suppliers: {
        total: await Supplier.countDocuments(),
        verified: await Supplier.countDocuments({ isVerified: true }),
      },
    };

    // Try to get stats from other services
    try {
      const usersStats = await usersClient.get('/internal/stats');
      stats.users = usersStats.data;
    } catch {
      stats.users = null;
    }

    try {
      const artisanStats = await artisanClient.get('/internal/stats');
      stats.artisans = artisanStats.data;
    } catch {
      stats.artisans = null;
    }

    try {
      const transactionStats = await transactionClient.get('/internal/stats');
      stats.transactions = transactionStats.data;
    } catch {
      stats.transactions = null;
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Dashboard stats error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/admin/search-analytics - Search analytics
router.get('/search-analytics', adminOnly, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Top search queries
    const topQueries = await SearchLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$query', count: { $sum: 1 }, avgResults: { $avg: '$resultsCount' } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    // Searches by day
    const searchesByDay = await SearchLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top categories filtered
    const topCategories = await SearchLog.aggregate([
      { $match: { createdAt: { $gte: startDate }, 'filters.category': { $exists: true } } },
      { $group: { _id: '$filters.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Zero result searches
    const zeroResults = await SearchLog.aggregate([
      { $match: { createdAt: { $gte: startDate }, resultsCount: 0 } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        topQueries,
        searchesByDay,
        topCategories,
        zeroResults,
        totalSearches: await SearchLog.countDocuments({ createdAt: { $gte: startDate } }),
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Search analytics error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/admin/broadcast - Send broadcast notification
router.post('/broadcast', adminOnly, async (req: Request, res: Response) => {
  try {
    const logger: Logger = req.app.locals.logger;
    const { title, message, channels, filters } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message required' });
    }

    // Get users matching filters from users service
    const usersClient = req.app.locals.usersClient;
    let userIds: string[] = [];

    try {
      const response = await usersClient.post('/internal/users/filter', filters || {});
      userIds = response.data?.userIds || [];
    } catch (error) {
      logger.error('Failed to fetch users for broadcast', { error });
      return res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }

    if (userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No users match the filters' });
    }

    // Create notifications for all users
    const notifications = userIds.map((userId: string) => ({
      user: userId,
      type: 'broadcast',
      title,
      message,
      channels: channels || ['in_app', 'push'],
      status: 'pending',
    }));

    await Notification.insertMany(notifications);

    // TODO: Trigger background job to send push/SMS

    logger.info('Broadcast notification created', {
      title,
      recipientCount: userIds.length,
    });

    res.json({
      success: true,
      data: {
        recipientCount: userIds.length,
        message: 'Broadcast queued for delivery',
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Broadcast error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Supplier management routes
// GET /api/v1/admin/suppliers
router.get('/suppliers', adminOnly, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.category) {
      query.categories = req.query.category;
    }
    if (req.query.verified !== undefined) {
      query.isVerified = req.query.verified === 'true';
    }

    const suppliers = await Supplier.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Supplier.countDocuments(query);

    res.json({
      success: true,
      data: suppliers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('List suppliers error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/admin/suppliers
router.post('/suppliers', adminOnly, async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create supplier error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/v1/admin/suppliers/:id
router.put('/suppliers/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Update supplier error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/v1/admin/suppliers/:id
router.delete('/suppliers/:id', adminOnly, async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Delete supplier error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
