import { TRADES, PRICING } from './constants';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getTradeLabel(value: string): string {
  const trade = TRADES.find((t) => t.value === value);
  return trade?.label ?? value;
}

export function getTradeIcon(value: string): string {
  const trade = TRADES.find((t) => t.value === value);
  return trade?.icon ?? '🔧';
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function getWhatsAppLink(phone: string, message?: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const number = cleaned.startsWith('0') ? `234${cleaned.slice(1)}` : cleaned;
  const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${encoded}`;
}

export function getPhoneLink(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return `tel:+234${cleaned.startsWith('0') ? cleaned.slice(1) : cleaned}`;
}

export function getVerificationFee(): string {
  return formatNaira(PRICING.verificationFee);
}

export function getSubscriptionAmount(): string {
  return formatNaira(PRICING.monthlySubscription);
}

export function generateStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  const intervals: [number, string][] = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];

  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) {
      return `${count} ${label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}
