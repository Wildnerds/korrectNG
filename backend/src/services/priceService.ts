import PriceCatalog, { IPriceCatalogItem, IPriceSource } from '../models/PriceCatalog';
import Supplier from '../models/Supplier';
import { log } from '../utils/logger';

// Forex cache (refreshed periodically)
let forexCache: { rate: number; updatedAt: Date } | null = null;
const FOREX_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export interface PriceComparisonResult {
  itemName: string;
  found: boolean;
  quotedPrice: number;
  marketData?: {
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
    sourceCount: number;
    qualityTier: string;
    lastUpdated: Date;
  };
  status: 'fair' | 'slightly_high' | 'high' | 'very_high' | 'below_market' | 'no_data';
  percentageDiff: number;
  recommendation: string;
}

export interface ContractPriceAnalysis {
  totalQuoted: number;
  totalMarketAverage: number;
  totalMarketMin: number;
  totalMarketMax: number;
  overallStatus: 'fair' | 'caution' | 'overpriced';
  itemComparisons: PriceComparisonResult[];
  itemsWithNoData: string[];
  coveragePercentage: number;
}

/**
 * Fetch current USD to NGN exchange rate
 */
export async function getForexRate(): Promise<number> {
  // Check cache
  if (forexCache && (Date.now() - forexCache.updatedAt.getTime()) < FOREX_CACHE_DURATION) {
    return forexCache.rate;
  }

  try {
    // Try fetching from a forex API (using exchangerate-api as example)
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );
    const data: any = await response.json();

    if (data.rates?.NGN) {
      forexCache = {
        rate: data.rates.NGN,
        updatedAt: new Date(),
      };
      log.info('Forex rate updated', { rate: forexCache.rate });
      return forexCache.rate;
    }
  } catch (error) {
    log.error('Failed to fetch forex rate', { error });
  }

  // Fallback to cached or default rate
  return forexCache?.rate || 1500; // Default fallback rate
}

/**
 * Adjust prices based on current forex rate
 */
export async function adjustPricesForForex(): Promise<number> {
  const currentRate = await getForexRate();
  let updatedCount = 0;

  // Find items with USD base price that need adjustment
  const items = await PriceCatalog.find({
    basePrice: { $exists: true, $gt: 0 },
    isActive: true,
  });

  for (const item of items) {
    const oldPrice = item.currentPrice;
    const newPrice = Math.round(item.basePrice * currentRate);

    // Only update if significant change (>2%)
    const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    if (changePercent > 2) {
      // Record history
      item.priceHistory.push({
        price: oldPrice,
        minPrice: item.minPrice,
        maxPrice: item.maxPrice,
        recordedAt: new Date(),
        forexRate: item.lastForexRate,
      });

      // Keep only last 30 history entries
      if (item.priceHistory.length > 30) {
        item.priceHistory = item.priceHistory.slice(-30);
      }

      // Update prices
      const adjustmentRatio = newPrice / oldPrice;
      item.currentPrice = newPrice;
      item.minPrice = Math.round(item.minPrice * adjustmentRatio);
      item.maxPrice = Math.round(item.maxPrice * adjustmentRatio);
      item.averagePrice = Math.round(item.averagePrice * adjustmentRatio);
      item.lastForexRate = currentRate;
      item.forexAdjustedAt = new Date();

      await item.save();
      updatedCount++;
    }
  }

  log.info('Forex price adjustment completed', {
    rate: currentRate,
    itemsUpdated: updatedCount,
  });

  return updatedCount;
}

/**
 * Compare a single item price with market data
 */
export async function comparePrice(
  itemName: string,
  quotedPrice: number,
  trade?: string
): Promise<PriceComparisonResult> {
  const comparison = await PriceCatalog.getPriceComparison(itemName, quotedPrice, trade);

  if (!comparison) {
    return {
      itemName,
      found: false,
      quotedPrice,
      status: 'no_data',
      percentageDiff: 0,
      recommendation: 'No market data available for this item. Consider asking the artisan for receipts.',
    };
  }

  let recommendation: string;
  switch (comparison.status) {
    case 'below_market':
      recommendation = 'Price is below market average. Verify quality and authenticity.';
      break;
    case 'fair':
      recommendation = 'Price is within market range. Looks reasonable.';
      break;
    case 'slightly_high':
      recommendation = 'Price is slightly above average. May include markup or be premium quality.';
      break;
    case 'high':
      recommendation = 'Price is significantly above market average. Consider negotiating or requesting justification.';
      break;
    case 'very_high':
      recommendation = 'Price appears overpriced. Strongly recommend requesting receipts or getting a second quote.';
      break;
    default:
      recommendation = 'Unable to determine price fairness.';
  }

  return {
    itemName,
    found: true,
    quotedPrice,
    marketData: {
      minPrice: comparison.marketRange.min,
      maxPrice: comparison.marketRange.max,
      averagePrice: comparison.marketRange.average,
      sourceCount: comparison.sourceCount,
      qualityTier: comparison.item.qualityTier,
      lastUpdated: comparison.item.updatedAt,
    },
    status: comparison.status,
    percentageDiff: comparison.percentageDiff,
    recommendation,
  };
}

/**
 * Analyze all materials in a contract
 */
export async function analyzeContractPrices(
  materials: { item: string; estimatedCost: number }[],
  trade?: string
): Promise<ContractPriceAnalysis> {
  const itemComparisons: PriceComparisonResult[] = [];
  const itemsWithNoData: string[] = [];

  let totalQuoted = 0;
  let totalMarketAverage = 0;
  let totalMarketMin = 0;
  let totalMarketMax = 0;
  let itemsWithData = 0;

  for (const material of materials) {
    const comparison = await comparePrice(material.item, material.estimatedCost, trade);
    itemComparisons.push(comparison);

    totalQuoted += material.estimatedCost;

    if (comparison.found && comparison.marketData) {
      totalMarketAverage += comparison.marketData.averagePrice;
      totalMarketMin += comparison.marketData.minPrice;
      totalMarketMax += comparison.marketData.maxPrice;
      itemsWithData++;
    } else {
      itemsWithNoData.push(material.item);
    }
  }

  // Calculate overall status
  let overallStatus: 'fair' | 'caution' | 'overpriced';
  if (itemsWithData > 0) {
    const overallPercentDiff = ((totalQuoted - totalMarketAverage) / totalMarketAverage) * 100;
    if (overallPercentDiff <= 15) {
      overallStatus = 'fair';
    } else if (overallPercentDiff <= 30) {
      overallStatus = 'caution';
    } else {
      overallStatus = 'overpriced';
    }
  } else {
    overallStatus = 'fair'; // No data to compare
  }

  const coveragePercentage = materials.length > 0
    ? Math.round((itemsWithData / materials.length) * 100)
    : 0;

  return {
    totalQuoted,
    totalMarketAverage,
    totalMarketMin,
    totalMarketMax,
    overallStatus,
    itemComparisons,
    itemsWithNoData,
    coveragePercentage,
  };
}

/**
 * Add or update a price from a supplier
 */
export async function updateSupplierPrice(
  supplierId: string,
  itemSlug: string,
  price: number,
  supplierName: string
): Promise<IPriceCatalogItem | null> {
  const item = await PriceCatalog.findOne({ slug: itemSlug, isActive: true });
  if (!item) return null;

  // Find existing source or add new one
  const existingSourceIndex = item.sources.findIndex(
    s => s.name === supplierName && s.type === 'supplier'
  );

  const sourceData: IPriceSource = {
    name: supplierName,
    type: 'supplier',
    price,
    lastUpdated: new Date(),
    isVerified: true,
  };

  if (existingSourceIndex >= 0) {
    item.sources[existingSourceIndex] = sourceData;
  } else {
    item.sources.push(sourceData);
  }

  await item.save();

  // Update supplier stats
  await Supplier.findByIdAndUpdate(supplierId, {
    lastPriceUpdate: new Date(),
    $inc: { totalItemsListed: existingSourceIndex >= 0 ? 0 : 1 },
  });

  log.info('Supplier price updated', {
    supplierId,
    itemSlug,
    price,
  });

  return item;
}

/**
 * Add crowdsourced price (from customer receipt)
 */
export async function addCrowdsourcedPrice(
  itemSlug: string,
  price: number,
  sourceName: string,
  sourceUrl?: string
): Promise<IPriceCatalogItem | null> {
  const item = await PriceCatalog.findOne({ slug: itemSlug, isActive: true });
  if (!item) return null;

  item.sources.push({
    name: sourceName,
    type: 'crowdsourced',
    price,
    url: sourceUrl,
    lastUpdated: new Date(),
    isVerified: false,
  });

  // Remove oldest crowdsourced sources if too many (keep max 20)
  const crowdsourcedSources = item.sources.filter(s => s.type === 'crowdsourced');
  if (crowdsourcedSources.length > 20) {
    item.sources = [
      ...item.sources.filter(s => s.type !== 'crowdsourced'),
      ...crowdsourcedSources.slice(-20),
    ];
  }

  await item.save();

  log.info('Crowdsourced price added', {
    itemSlug,
    price,
    sourceName,
  });

  return item;
}

/**
 * Search price catalog
 */
export async function searchPriceCatalog(
  query: string,
  trade?: string,
  limit: number = 10
): Promise<IPriceCatalogItem[]> {
  return PriceCatalog.searchItems(query, trade, limit);
}

export default {
  getForexRate,
  adjustPricesForForex,
  comparePrice,
  analyzeContractPrices,
  updateSupplierPrice,
  addCrowdsourcedPrice,
  searchPriceCatalog,
};
