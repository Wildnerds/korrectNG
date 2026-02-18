import { Router, Request, Response } from 'express';
import { PriceCatalog, SearchLog } from '../models';
import { Logger } from '@korrect/logger';

const router = Router();

// GET /api/v1/prices - Get price catalog
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, subcategory, search, location } = req.query;

    const query: any = { isActive: true };

    if (category) {
      query.category = category;
    }
    if (subcategory) {
      query.subcategory = subcategory;
    }
    if (location) {
      query.$or = [{ location: location }, { location: { $exists: false } }];
    }
    if (search) {
      query.$text = { $search: search as string };
    }

    const prices = await PriceCatalog.find(query).sort({ category: 1, serviceName: 1 }).lean();

    // Log search if user provided
    const userId = req.headers['x-user-id'] as string;
    if (search) {
      await SearchLog.create({
        user: userId || undefined,
        query: search as string,
        filters: { category: category as string, location: location as string },
        resultsCount: prices.length,
        deviceInfo: {
          platform: req.headers['x-platform'] as string,
          userAgent: req.headers['user-agent'],
        },
      });
    }

    res.json({ success: true, data: prices });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get prices error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/prices/categories - Get unique categories
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await PriceCatalog.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          subcategories: { $addToSet: '$subcategory' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: categories.map((c) => ({
        category: c._id,
        subcategories: c.subcategories.filter(Boolean).sort(),
        serviceCount: c.count,
      })),
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get categories error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/v1/prices/:id - Get single price entry
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const price = await PriceCatalog.findById(req.params.id).lean();

    if (!price) {
      return res.status(404).json({ success: false, error: 'Price not found' });
    }

    res.json({ success: true, data: price });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Get price error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/v1/prices/estimate - Calculate price estimate
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { priceId, quantity, factors } = req.body;

    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Price ID required' });
    }

    const price = await PriceCatalog.findById(priceId);
    if (!price) {
      return res.status(404).json({ success: false, error: 'Price not found' });
    }

    let estimate = price.basePrice;
    const qty = quantity || 1;

    // Apply unit-based calculation
    switch (price.unit) {
      case 'hourly':
      case 'daily':
      case 'per_sqm':
      case 'per_item':
        estimate = price.basePrice * qty;
        break;
      case 'fixed':
      default:
        estimate = price.basePrice;
    }

    // Apply factors if provided
    const appliedFactors: { name: string; multiplier: number }[] = [];
    if (factors && price.factors) {
      for (const factorName of factors) {
        const factor = price.factors.find((f) => f.name === factorName);
        if (factor) {
          estimate *= factor.multiplier;
          appliedFactors.push({ name: factor.name, multiplier: factor.multiplier });
        }
      }
    }

    // Calculate range
    const minEstimate = price.priceRange?.min
      ? Math.min(estimate, price.priceRange.min * qty)
      : estimate * 0.9;
    const maxEstimate = price.priceRange?.max
      ? Math.max(estimate, price.priceRange.max * qty)
      : estimate * 1.2;

    res.json({
      success: true,
      data: {
        serviceName: price.serviceName,
        category: price.category,
        basePrice: price.basePrice,
        unit: price.unit,
        quantity: qty,
        appliedFactors,
        estimate: Math.round(estimate),
        range: {
          min: Math.round(minEstimate),
          max: Math.round(maxEstimate),
        },
        disclaimer: 'This is an estimate. Actual price may vary based on job specifics.',
      },
    });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Price estimate error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin routes for managing prices
// POST /api/v1/prices (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const price = await PriceCatalog.create({
      ...req.body,
      updatedBy: userId,
    });

    res.status(201).json({ success: true, data: price });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Create price error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/v1/prices/:id (admin only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const price = await PriceCatalog.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: userId },
      { new: true }
    );

    if (!price) {
      return res.status(404).json({ success: false, error: 'Price not found' });
    }

    res.json({ success: true, data: price });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Update price error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/v1/prices/:id (admin only - soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const price = await PriceCatalog.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: userId },
      { new: true }
    );

    if (!price) {
      return res.status(404).json({ success: false, error: 'Price not found' });
    }

    res.json({ success: true, message: 'Price deactivated' });
  } catch (error) {
    const logger: Logger = req.app.locals.logger;
    logger.error('Delete price error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;
