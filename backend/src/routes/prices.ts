import { Router, Request, Response, NextFunction } from 'express';
import { protect, restrictTo } from '../middleware/auth';
import PriceCatalog from '../models/PriceCatalog';
import JobContract from '../models/JobContract';
import priceService from '../services/priceService';
import { z } from 'zod';
import { log } from '../utils/logger';

const router = Router();

// Validation schemas
const searchSchema = z.object({
  q: z.string().min(2).max(100),
  trade: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

const comparePriceSchema = z.object({
  itemName: z.string().min(2).max(100),
  quotedPrice: z.number().min(0),
  trade: z.string().optional(),
});

const analyzeContractSchema = z.object({
  materials: z.array(z.object({
    item: z.string().min(1),
    estimatedCost: z.number().min(0),
  })).min(1),
  trade: z.string().optional(),
});

/**
 * @route   GET /api/v1/prices/search
 * @desc    Search price catalog
 * @access  Public
 */
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = searchSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const { q, trade, limit } = validation.data;
    const items = await priceService.searchPriceCatalog(q, trade, limit);

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/prices/compare
 * @desc    Compare a quoted price with market data
 * @access  Public
 */
router.post('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = comparePriceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const { itemName, quotedPrice, trade } = validation.data;
    const comparison = await priceService.comparePrice(itemName, quotedPrice, trade);

    res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/prices/analyze-contract
 * @desc    Analyze all materials in a contract for price fairness
 * @access  Private
 */
router.post('/analyze-contract', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = analyzeContractSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const { materials, trade } = validation.data;
    const analysis = await priceService.analyzeContractPrices(materials, trade);

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/prices/contract/:contractId
 * @desc    Get price analysis for a specific contract
 * @access  Private
 */
router.get('/contract/:contractId', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user._id;
    const { contractId } = req.params;

    const contract = await JobContract.findById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
      });
    }

    // Verify user is part of this contract
    if (contract.customer.toString() !== userId.toString() &&
        contract.artisan.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this contract',
      });
    }

    // Get artisan's trade for better matching
    const trade = contract.artisanProfile ? undefined : undefined; // Would need to populate

    // Analyze materials
    const materials = contract.materialsList.map(m => ({
      item: m.item,
      estimatedCost: m.estimatedCost,
    }));

    if (materials.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'No materials listed in contract',
          analysis: null,
        },
      });
    }

    const analysis = await priceService.analyzeContractPrices(materials);

    res.status(200).json({
      success: true,
      data: {
        contractId,
        contractTitle: contract.title,
        analysis,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/prices/forex
 * @desc    Get current forex rate
 * @access  Public
 */
router.get('/forex', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rate = await priceService.getForexRate();

    res.status(200).json({
      success: true,
      data: {
        currency: 'NGN',
        baseCurrency: 'USD',
        rate,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/prices/item/:slug
 * @desc    Get detailed price info for an item
 * @access  Public
 */
router.get('/item/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const item = await PriceCatalog.findOne({ slug, isActive: true })
      .select('-priceHistory'); // Exclude detailed history for public view

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/prices/categories
 * @desc    Get list of categories with item counts
 * @access  Public
 */
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trade } = req.query;

    const match: any = { isActive: true };
    if (trade) match.trade = trade;

    const categories = await PriceCatalog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { category: '$category', trade: '$trade' },
          count: { $sum: 1 },
          avgPrice: { $avg: '$averagePrice' },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          trades: {
            $push: {
              trade: '$_id.trade',
              count: '$count',
            },
          },
          totalCount: { $sum: '$count' },
        },
      },
      { $sort: { totalCount: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/prices/report
 * @desc    Report a price (crowdsourced from customers)
 * @access  Private
 */
router.post('/report', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { itemSlug, price, sourceName, sourceUrl } = req.body;

    if (!itemSlug || !price || !sourceName) {
      return res.status(400).json({
        success: false,
        error: 'itemSlug, price, and sourceName are required',
      });
    }

    const item = await priceService.addCrowdsourcedPrice(
      itemSlug,
      price,
      sourceName,
      sourceUrl
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in catalog',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Price reported successfully. Thank you for contributing!',
    });
  } catch (error) {
    next(error);
  }
});

// ─── Admin Routes ──────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/prices/admin/items
 * @desc    Add new item to price catalog
 * @access  Admin
 */
router.post('/admin/items', protect, restrictTo('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      category,
      subcategory,
      trade,
      description,
      brand,
      partNumber,
      compatibleWith,
      qualityTier,
      basePrice,
      initialPrice,
    } = req.body;

    // Generate slug
    const slug = `${name}-${brand || 'generic'}-${Date.now()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const item = await PriceCatalog.create({
      name,
      slug,
      category,
      subcategory,
      trade,
      description,
      brand,
      partNumber,
      compatibleWith,
      qualityTier: qualityTier || 'standard',
      currentPrice: initialPrice,
      minPrice: initialPrice,
      maxPrice: initialPrice,
      averagePrice: initialPrice,
      basePrice,
      sources: [{
        name: 'Admin Initial',
        type: 'manual',
        price: initialPrice,
        lastUpdated: new Date(),
        isVerified: true,
      }],
      lastVerifiedAt: new Date(),
      verifiedBy: (req as any).user._id,
    });

    log.info('Price catalog item created', {
      itemId: item._id,
      name,
      adminId: (req as any).user._id,
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/prices/admin/items/:slug
 * @desc    Update item in price catalog
 * @access  Admin
 */
router.put('/admin/items/:slug', protect, restrictTo('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates.slug;
    delete updates._id;
    delete updates.priceHistory;

    const item = await PriceCatalog.findOneAndUpdate(
      { slug },
      {
        ...updates,
        lastVerifiedAt: new Date(),
        verifiedBy: (req as any).user._id,
      },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/prices/admin/forex-adjust
 * @desc    Trigger forex adjustment for all items
 * @access  Admin
 */
router.post('/admin/forex-adjust', protect, restrictTo('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedCount = await priceService.adjustPricesForForex();

    res.status(200).json({
      success: true,
      message: `Forex adjustment completed. ${updatedCount} items updated.`,
      data: { updatedCount },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
