import mongoose from 'mongoose';
import { Product, IProduct } from '../models/Product';
import { MerchantProfile, IMerchantProfile } from '../models/MerchantProfile';
import { log } from '../utils/logger';

export interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  specs?: string;
}

export interface ProductMatch {
  product: IProduct;
  merchant: IMerchantProfile;
  unitPrice: number;
  totalPrice: number;
  deliveryFee: number;
  grandTotal: number;
  matchScore: number;  // How well it matches the search criteria
  priceRank: 'lowest' | 'competitive' | 'higher';
  inStock: boolean;
  availableQuantity: number;
}

export interface MaterialMatchResult {
  material: MaterialItem;
  matches: ProductMatch[];
  hasMatches: boolean;
  lowestPrice: number;
  averagePrice: number;
}

/**
 * Find all merchants with products matching a materials list
 * IMPORTANT: This function intentionally shows ALL merchants to prevent collusion
 */
export async function findMatchingProducts(
  materials: MaterialItem[],
  deliveryLocation?: string
): Promise<MaterialMatchResult[]> {
  const results: MaterialMatchResult[] = [];

  for (const material of materials) {
    const matches = await findProductsForMaterial(material, deliveryLocation);

    // Calculate price statistics
    const prices = matches.map(m => m.grandTotal);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    // Assign price ranks
    matches.forEach(match => {
      if (match.grandTotal === lowestPrice) {
        match.priceRank = 'lowest';
      } else if (match.grandTotal <= averagePrice * 1.1) {
        match.priceRank = 'competitive';
      } else {
        match.priceRank = 'higher';
      }
    });

    // Sort by price ascending (show cheapest first, but ALL merchants are shown)
    matches.sort((a, b) => a.grandTotal - b.grandTotal);

    results.push({
      material,
      matches,
      hasMatches: matches.length > 0,
      lowestPrice,
      averagePrice,
    });
  }

  return results;
}

/**
 * Find products matching a single material item
 */
async function findProductsForMaterial(
  material: MaterialItem,
  deliveryLocation?: string
): Promise<ProductMatch[]> {
  const matches: ProductMatch[] = [];

  // Build search query
  // Search by name using text search and regex for flexibility
  const searchTerms = material.name.toLowerCase().split(/\s+/);

  const products = await Product.find({
    isActive: true,
    isApproved: true,
    $or: [
      // Text search
      { $text: { $search: material.name } },
      // Regex fallback for partial matches
      { name: { $regex: searchTerms.map(t => `(?=.*${t})`).join(''), $options: 'i' } },
      // Tags search
      { tags: { $in: searchTerms.map(t => new RegExp(t, 'i')) } },
    ],
  }).populate('merchant');

  for (const product of products) {
    // Get merchant profile
    const merchant = await MerchantProfile.findById(product.merchant);
    if (!merchant || !merchant.isPublished || merchant.verificationStatus !== 'approved') {
      continue;
    }

    // Check if merchant delivers to the location
    if (deliveryLocation && merchant.deliveryAreas.length > 0) {
      const canDeliver = merchant.deliveryAreas.some(
        area => area.toLowerCase().includes(deliveryLocation.toLowerCase()) ||
                deliveryLocation.toLowerCase().includes(area.toLowerCase())
      );
      if (!canDeliver) continue;
    }

    // Check stock availability
    const availableQuantity = product.trackInventory ? product.stockQuantity : Infinity;
    const inStock = availableQuantity >= material.quantity;

    // Calculate price (considering bulk discounts)
    let unitPrice = product.price;
    if (product.bulkDiscounts && product.bulkDiscounts.length > 0) {
      const sortedDiscounts = [...product.bulkDiscounts].sort((a, b) => b.qty - a.qty);
      for (const discount of sortedDiscounts) {
        if (material.quantity >= discount.qty) {
          unitPrice = discount.price;
          break;
        }
      }
    }

    const totalPrice = unitPrice * material.quantity;

    // Calculate delivery fee
    let deliveryFee = merchant.defaultDeliveryFee;
    if (merchant.freeDeliveryThreshold && totalPrice >= merchant.freeDeliveryThreshold) {
      deliveryFee = 0;
    }

    const grandTotal = totalPrice + deliveryFee;

    // Calculate match score (0-100)
    let matchScore = 0;

    // Name match (up to 50 points)
    const nameLower = material.name.toLowerCase();
    const productNameLower = product.name.toLowerCase();
    if (productNameLower === nameLower) {
      matchScore += 50;
    } else if (productNameLower.includes(nameLower) || nameLower.includes(productNameLower)) {
      matchScore += 40;
    } else {
      // Partial word matches
      const matchedWords = searchTerms.filter(term => productNameLower.includes(term));
      matchScore += (matchedWords.length / searchTerms.length) * 30;
    }

    // Unit match (up to 20 points)
    if (product.unit === material.unit) {
      matchScore += 20;
    } else if (areUnitsCompatible(product.unit, material.unit)) {
      matchScore += 10;
    }

    // Stock availability (up to 15 points)
    if (inStock) {
      matchScore += 15;
    }

    // Merchant rating (up to 15 points)
    matchScore += (merchant.averageRating / 5) * 15;

    matches.push({
      product,
      merchant,
      unitPrice,
      totalPrice,
      deliveryFee,
      grandTotal,
      matchScore,
      priceRank: 'competitive', // Will be set after all matches are collected
      inStock,
      availableQuantity: product.trackInventory ? product.stockQuantity : -1, // -1 means unlimited
    });
  }

  return matches;
}

/**
 * Check if two units are compatible (e.g., can be converted)
 */
function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const volumeUnits = ['litre', 'ml', 'gallon'];
  const weightUnits = ['kg', 'gram', 'lb'];
  const lengthUnits = ['meter', 'cm', 'inch', 'feet'];
  const countUnits = ['piece', 'pack', 'set', 'pair'];

  const getUnitGroup = (unit: string) => {
    if (volumeUnits.includes(unit)) return 'volume';
    if (weightUnits.includes(unit)) return 'weight';
    if (lengthUnits.includes(unit)) return 'length';
    if (countUnits.includes(unit)) return 'count';
    return unit;
  };

  return getUnitGroup(unit1) === getUnitGroup(unit2);
}

/**
 * Get price comparison for a specific product across all merchants
 */
export async function comparePricesForProduct(
  productName: string,
  quantity: number = 1,
  deliveryLocation?: string
): Promise<ProductMatch[]> {
  const material: MaterialItem = {
    name: productName,
    quantity,
    unit: 'piece',
  };

  const result = await findProductsForMaterial(material, deliveryLocation);

  // Calculate price ranks
  const prices = result.map(m => m.grandTotal);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

  result.forEach(match => {
    if (match.grandTotal === lowestPrice) {
      match.priceRank = 'lowest';
    } else if (match.grandTotal <= averagePrice * 1.1) {
      match.priceRank = 'competitive';
    } else {
      match.priceRank = 'higher';
    }
  });

  // Sort by price
  return result.sort((a, b) => a.grandTotal - b.grandTotal);
}

/**
 * Get recommendations for a booking's materials list
 * Returns grouped by merchant for easy ordering
 */
export interface MerchantQuote {
  merchant: IMerchantProfile;
  items: {
    material: MaterialItem;
    product: IProduct;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    inStock: boolean;
  }[];
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  coveragePercentage: number; // What % of materials this merchant can provide
  matchedMaterials: number;
  totalMaterials: number;
}

export async function getMerchantQuotesForMaterials(
  materials: MaterialItem[],
  deliveryLocation?: string
): Promise<MerchantQuote[]> {
  const matchResults = await findMatchingProducts(materials, deliveryLocation);

  // Group by merchant
  const merchantQuotesMap = new Map<string, MerchantQuote>();

  for (const result of matchResults) {
    for (const match of result.matches) {
      const merchantId = match.merchant._id.toString();

      if (!merchantQuotesMap.has(merchantId)) {
        merchantQuotesMap.set(merchantId, {
          merchant: match.merchant,
          items: [],
          subtotal: 0,
          deliveryFee: match.deliveryFee,
          grandTotal: 0,
          coveragePercentage: 0,
          matchedMaterials: 0,
          totalMaterials: materials.length,
        });
      }

      const quote = merchantQuotesMap.get(merchantId)!;

      // Only add if this material hasn't been added yet (pick best match per material)
      const alreadyHasMaterial = quote.items.some(
        item => item.material.name === result.material.name
      );

      if (!alreadyHasMaterial) {
        quote.items.push({
          material: result.material,
          product: match.product,
          unitPrice: match.unitPrice,
          quantity: result.material.quantity,
          totalPrice: match.totalPrice,
          inStock: match.inStock,
        });
        quote.subtotal += match.totalPrice;
        quote.matchedMaterials += 1;
      }
    }
  }

  // Calculate final totals and coverage
  const quotes = Array.from(merchantQuotesMap.values());

  for (const quote of quotes) {
    // Recalculate delivery fee based on total
    if (quote.merchant.freeDeliveryThreshold && quote.subtotal >= quote.merchant.freeDeliveryThreshold) {
      quote.deliveryFee = 0;
    }
    quote.grandTotal = quote.subtotal + quote.deliveryFee;
    quote.coveragePercentage = Math.round((quote.matchedMaterials / quote.totalMaterials) * 100);
  }

  // Sort by coverage first, then by price
  quotes.sort((a, b) => {
    if (a.coveragePercentage !== b.coveragePercentage) {
      return b.coveragePercentage - a.coveragePercentage; // Higher coverage first
    }
    return a.grandTotal - b.grandTotal; // Lower price first
  });

  log.info('Material quotes generated', {
    materialsCount: materials.length,
    merchantsFound: quotes.length,
  });

  return quotes;
}

export default {
  findMatchingProducts,
  comparePricesForProduct,
  getMerchantQuotesForMaterials,
};
