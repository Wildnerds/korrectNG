import { getTradeLabel } from '@korrectng/shared';

interface DescriptionParams {
  trade: string;
  customTrade?: string;
  services: { value: string; label: string }[];
  yearsOfExperience: number;
  location: string;
  businessName?: string;
}

/**
 * Generates a professional description for an artisan profile
 * based on their trade, services, experience, and location
 */
export function generateDescription(params: DescriptionParams): string {
  const { trade, customTrade, services, yearsOfExperience, location, businessName } = params;

  // Get the trade label (handles custom trades)
  const tradeLabel = trade === 'other' && customTrade
    ? customTrade.charAt(0).toUpperCase() + customTrade.slice(1)
    : getTradeLabel(trade);

  // Build experience phrase
  const experiencePhrase = yearsOfExperience === 0
    ? 'new to the industry but eager to serve'
    : yearsOfExperience === 1
    ? '1 year of experience'
    : `${yearsOfExperience} years of experience`;

  // Build services phrase
  let servicesPhrase = '';
  if (services.length > 0) {
    const serviceLabels = services.map(s => s.label);
    if (serviceLabels.length === 1) {
      servicesPhrase = serviceLabels[0];
    } else if (serviceLabels.length === 2) {
      servicesPhrase = `${serviceLabels[0]} and ${serviceLabels[1]}`;
    } else {
      const lastService = serviceLabels.pop();
      servicesPhrase = `${serviceLabels.join(', ')}, and ${lastService}`;
    }
  }

  // Build the description
  const parts: string[] = [];

  // Opening line
  if (businessName) {
    parts.push(`${businessName} is a professional ${tradeLabel} with ${experiencePhrase}, proudly serving ${location} and surrounding areas.`);
  } else {
    parts.push(`Professional ${tradeLabel} with ${experiencePhrase}, proudly serving ${location} and surrounding areas.`);
  }

  // Services line
  if (servicesPhrase) {
    parts.push(`I specialize in ${servicesPhrase}.`);
  }

  // Closing line
  parts.push('Committed to quality workmanship and customer satisfaction. Contact me today for a free consultation!');

  return parts.join(' ');
}

/**
 * Generates a shorter description suitable for previews
 */
export function generateShortDescription(params: DescriptionParams): string {
  const { trade, customTrade, services, yearsOfExperience, location } = params;

  const tradeLabel = trade === 'other' && customTrade
    ? customTrade.charAt(0).toUpperCase() + customTrade.slice(1)
    : getTradeLabel(trade);

  const topServices = services.slice(0, 3).map(s => s.label);
  const servicesText = topServices.length > 0 ? ` specializing in ${topServices.join(', ')}` : '';

  return `${tradeLabel} in ${location} with ${yearsOfExperience}+ years experience${servicesText}.`;
}

// ─── Merchant Description Generator ─────────────────────────────────────────

interface MerchantDescriptionParams {
  businessName: string;
  category: string;
  categories?: string[];
  location: string;
  deliveryAreas?: string[];
  freeDeliveryThreshold?: number;
}

// Category labels for display
const CATEGORY_LABELS: Record<string, string> = {
  'auto-parts': 'Auto Parts',
  'electrical': 'Electrical Supplies',
  'plumbing': 'Plumbing Materials',
  'building': 'Building Materials',
  'tools': 'Tools & Equipment',
  'paint': 'Paints & Finishes',
  'hardware': 'Hardware & Fasteners',
  'safety': 'Safety Equipment',
  'hvac': 'HVAC Supplies',
  'other': 'General Supplies',
};

/**
 * Generates a professional description for a merchant profile
 * based on their categories, location, and delivery options
 */
export function generateMerchantDescription(params: MerchantDescriptionParams): string {
  const { businessName, category, categories = [], location, deliveryAreas = [], freeDeliveryThreshold } = params;

  // Get primary category label
  const primaryCategory = CATEGORY_LABELS[category] || category;

  // Build all categories phrase
  const allCategories = [category, ...categories.filter(c => c !== category)];
  let categoriesPhrase = '';
  if (allCategories.length > 0) {
    const categoryLabels = allCategories.map(c => CATEGORY_LABELS[c] || c).slice(0, 4);
    if (categoryLabels.length === 1) {
      categoriesPhrase = categoryLabels[0];
    } else if (categoryLabels.length === 2) {
      categoriesPhrase = `${categoryLabels[0]} and ${categoryLabels[1]}`;
    } else {
      const lastCat = categoryLabels.pop();
      categoriesPhrase = `${categoryLabels.join(', ')}, and ${lastCat}`;
    }
  }

  // Build delivery phrase
  let deliveryPhrase = '';
  if (deliveryAreas.length > 0) {
    const areas = deliveryAreas.slice(0, 3);
    if (areas.length === 1) {
      deliveryPhrase = `We deliver to ${areas[0]}`;
    } else if (areas.length === 2) {
      deliveryPhrase = `We deliver to ${areas[0]} and ${areas[1]}`;
    } else {
      deliveryPhrase = `We deliver to ${areas.join(', ')} and more`;
    }
    if (freeDeliveryThreshold && freeDeliveryThreshold > 0) {
      deliveryPhrase += `, with free delivery on orders above NGN${freeDeliveryThreshold.toLocaleString()}`;
    }
    deliveryPhrase += '.';
  }

  // Build the description
  const parts: string[] = [];

  // Opening line
  parts.push(`${businessName} is your trusted supplier for quality ${categoriesPhrase} in ${location}.`);

  // Value proposition
  parts.push(`We offer competitive prices on genuine products, serving professionals and DIY enthusiasts alike.`);

  // Delivery info
  if (deliveryPhrase) {
    parts.push(deliveryPhrase);
  }

  // Closing line
  parts.push('Contact us today for bulk orders and special pricing!');

  return parts.join(' ');
}

/**
 * Generates a shorter merchant description suitable for previews
 */
export function generateShortMerchantDescription(params: MerchantDescriptionParams): string {
  const { businessName, category, location, deliveryAreas = [] } = params;

  const primaryCategory = CATEGORY_LABELS[category] || category;
  const deliveryText = deliveryAreas.length > 0 ? ' with delivery available' : '';

  return `${businessName} - ${primaryCategory} supplier in ${location}${deliveryText}.`;
}
