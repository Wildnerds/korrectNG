import { Router } from 'express';
import { TRADES } from '@korrectng/shared';
import { ArtisanProfile } from '../models';

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
      customTrade: { $exists: true, $ne: null, $ne: '' },
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
      customTrade: { $exists: true, $ne: null, $ne: '' },
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

export default router;
