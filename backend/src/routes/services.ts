import { Router } from 'express';
import { TRADES, SERVICES_BY_TRADE } from '@korrectng/shared';
import { ArtisanProfile } from '../models';
import { generateDescription, generateShortDescription, generateMerchantDescription, generateShortMerchantDescription } from '../utils/descriptionGenerator';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

interface TradeOption {
  value: string;
  label: string;
  icon: string;
  isCustom?: boolean;
}

/**
 * GET /api/v1/services/trades
 * Returns all available trades for search/filter dropdowns
 * Includes default TRADES plus custom trades from approved/published artisans
 */
router.get('/trades', async (_req, res, next) => {
  try {
    // Get distinct custom trades from approved/published artisans
    const customTrades = await ArtisanProfile.distinct('customTrade', {
      trade: 'other',
      customTrade: { $exists: true, $nin: [null, ''] },
      verificationStatus: 'approved',
      isPublished: true,
    });

    // Format custom trades as trade options
    const customTradeOptions: TradeOption[] = customTrades
      .filter((trade): trade is string => typeof trade === 'string' && trade.length > 0)
      .map((trade) => ({
        value: trade,
        label: trade.charAt(0).toUpperCase() + trade.slice(1),
        icon: '✨',
        isCustom: true,
      }));

    // Combine default trades (excluding 'other' from the visible list for customers)
    // with custom trades
    const defaultTrades: TradeOption[] = TRADES
      .filter((t) => t.value !== 'other')
      .map((t) => ({
        value: t.value,
        label: t.label,
        icon: t.icon,
        isCustom: false,
      }));

    // Sort custom trades alphabetically
    customTradeOptions.sort((a, b) => a.label.localeCompare(b.label));

    // Return default trades first, then custom trades
    const allTrades = [...defaultTrades, ...customTradeOptions];

    res.status(200).json({
      success: true,
      data: allTrades,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/services/custom-trades
 * Returns only custom trades for autocomplete suggestions
 * Used when artisan selects "Other Services" to show existing custom trades
 */
router.get('/custom-trades', async (_req, res, next) => {
  try {
    // Get distinct custom trades from all artisans (regardless of status)
    // This allows new artisans to see what custom trades others have used
    const customTrades = await ArtisanProfile.distinct('customTrade', {
      trade: 'other',
      customTrade: { $exists: true, $nin: [null, ''] },
    });

    // Format and sort alphabetically
    const suggestions = customTrades
      .filter((trade): trade is string => typeof trade === 'string' && trade.length > 0)
      .map((trade) => ({
        value: trade,
        label: trade.charAt(0).toUpperCase() + trade.slice(1),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/services/all-trades
 * Returns all trades including the "Other Services" option
 * Used for artisan profile forms where they can select "Other"
 */
router.get('/all-trades', async (_req, res, next) => {
  try {
    const allTrades: TradeOption[] = TRADES.map((t) => ({
      value: t.value,
      label: t.label,
      icon: t.icon,
      isCustom: false,
    }));

    res.status(200).json({
      success: true,
      data: allTrades,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/services/by-trade/:trade
 * Returns predefined services for a specific trade
 */
router.get('/by-trade/:trade', async (req, res, next) => {
  try {
    const { trade } = req.params;
    const services = SERVICES_BY_TRADE[trade] || [];

    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/services/generate-description
 * Generates a suggested description based on trade, services, and experience
 * Requires authentication (artisan only)
 */
router.post('/generate-description', protect, authorize('artisan'), async (req: AuthRequest, res, next) => {
  try {
    const { trade, customTrade, services, yearsOfExperience, location, businessName } = req.body;

    if (!trade || !location) {
      return res.status(400).json({
        success: false,
        error: 'Trade and location are required',
      });
    }

    const description = generateDescription({
      trade,
      customTrade,
      services: services || [],
      yearsOfExperience: yearsOfExperience || 0,
      location,
      businessName,
    });

    const shortDescription = generateShortDescription({
      trade,
      customTrade,
      services: services || [],
      yearsOfExperience: yearsOfExperience || 0,
      location,
    });

    res.status(200).json({
      success: true,
      data: {
        description,
        shortDescription,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/services/generate-merchant-description
 * Generates a suggested description for merchant stores
 * Requires authentication (merchant only)
 */
router.post('/generate-merchant-description', protect, authorize('merchant'), async (req: AuthRequest, res, next) => {
  try {
    const { businessName, category, categories, location, deliveryAreas, freeDeliveryThreshold } = req.body;

    if (!businessName || !category || !location) {
      return res.status(400).json({
        success: false,
        error: 'Business name, category, and location are required',
      });
    }

    const description = generateMerchantDescription({
      businessName,
      category,
      categories: categories || [],
      location,
      deliveryAreas: deliveryAreas || [],
      freeDeliveryThreshold: freeDeliveryThreshold || 0,
    });

    const shortDescription = generateShortMerchantDescription({
      businessName,
      category,
      location,
      deliveryAreas: deliveryAreas || [],
    });

    res.status(200).json({
      success: true,
      data: {
        description,
        shortDescription,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
