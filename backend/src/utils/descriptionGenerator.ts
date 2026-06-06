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
