export const TRADES = [
  { value: 'mechanic', label: 'Auto Mechanic', icon: '🔧' },
  { value: 'electrician', label: 'Electrician', icon: '⚡' },
  { value: 'plumber', label: 'Plumber', icon: '🔧' },
  { value: 'ac-tech', label: 'AC Technician', icon: '❄️' },
  { value: 'generator-tech', label: 'Generator Technician', icon: '⚙️' },
  { value: 'phone-repair', label: 'Phone Repairer', icon: '📱' },
  { value: 'tailor', label: 'Tailor', icon: '🧵' },
  { value: 'carpenter', label: 'Carpenter', icon: '🪚' },
  { value: 'painter', label: 'Painter', icon: '🎨' },
  { value: 'welder', label: 'Welder', icon: '🔥' },
] as const;

export type TradeValue = (typeof TRADES)[number]['value'];

export const TRADE_VALUES = TRADES.map((t) => t.value);

export const LOCATIONS = [
  'Lekki',
  'Victoria Island',
  'Ikoyi',
  'Ikeja',
  'Surulere',
  'Yaba',
  'Ajah',
  'Gbagada',
  'Maryland',
  'Ogba',
  'Mushin',
  'Oshodi',
  'Apapa',
  'Festac',
  'Amuwo-Odofin',
  'Ikorodu',
  'Epe',
  'Badagry',
  'Alimosho',
  'Agege',
  'Abuja',
  'Port Harcourt',
  'Ibadan',
  'Kano',
  'Enugu',
] as const;

export type LocationValue = (typeof LOCATIONS)[number];

export const PRICING = {
  verificationFee: 10000, // NGN one-time
  monthlySubscription: 5000, // NGN per month
  currency: 'NGN',
} as const;

export const ROLES = ['customer', 'artisan', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const VERIFICATION_STEPS = [
  'personal-info',
  'documents',
  'payment',
  'review',
] as const;
export type VerificationStep = (typeof VERIFICATION_STEPS)[number];

export const VERIFICATION_STATUSES = [
  'pending',
  'in-review',
  'approved',
  'rejected',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  'active',
  'past_due',
  'cancelled',
  'unpaid',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const WARRANTY_STATUSES = [
  'open',
  'in-progress',
  'resolved',
  'closed',
] as const;
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number];

export const REVIEW_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' },
] as const;

export const ARTISAN_SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'newest', label: 'Newest' },
] as const;

export const GALLERY_CATEGORIES = [
  { value: 'completed', label: 'Completed Projects', icon: '✅' },
  { value: 'before-after', label: 'Before & After', icon: '🔄' },
  { value: 'in-progress', label: 'Work in Progress', icon: '🔨' },
  { value: 'tools', label: 'Tools & Equipment', icon: '🛠️' },
  { value: 'other', label: 'Other', icon: '📷' },
] as const;

export type GalleryCategoryValue = (typeof GALLERY_CATEGORIES)[number]['value'];

export const BRAND = {
  name: 'KorrectNG',
  tagline: "Find Verified Artisans You Can Trust",
  description:
    "Nigeria's leading platform for verified artisans. We connect customers with skilled, accountable service providers across all trades.",
  colors: {
    primaryGreen: '#008751',
    darkGreen: '#006B40',
    orange: '#FF6B35',
    black: '#1A1A1A',
    gray: '#666666',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
    starYellow: '#FFA000',
  },
} as const;

// ─── Contract System ────────────────────────────────────────────────────────

export const CONTRACT_STATUSES = [
  'draft',
  'pending_signatures',
  'signed',
  'active',
  'completed',
  'disputed',
  'cancelled',
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const MILESTONE_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'approved',
  'disputed',
] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MATERIALS_RESPONSIBILITY = ['customer', 'artisan', 'shared'] as const;
export type MaterialsResponsibility = (typeof MATERIALS_RESPONSIBILITY)[number];

export const DEFAULT_MILESTONE_SPLIT = {
  milestone1: 30, // Initial payment on signing
  milestone2: 40, // Midpoint payment
  milestone3: 30, // Final payment on completion
} as const;

// ─── Escrow System ──────────────────────────────────────────────────────────

export const ESCROW_STATUSES = [
  'created',
  'funded',
  'milestone_1_pending',
  'milestone_1_released',
  'milestone_2_pending',
  'milestone_2_released',
  'milestone_3_pending',
  'completed',
  'disputed',
  'resolved',
  'cancelled',
  'partial_refund',
] as const;
export type EscrowStatus = (typeof ESCROW_STATUSES)[number];

// ─── Dispute System ─────────────────────────────────────────────────────────

export const DISPUTE_STATUSES = [
  'opened',
  'artisan_response_pending',
  'customer_counter_pending',
  'under_review',
  'resolved',
  'escalated',
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_CATEGORIES = [
  { value: 'quality', label: 'Quality Issues' },
  { value: 'incomplete', label: 'Incomplete Work' },
  { value: 'timeline', label: 'Timeline Issues' },
  { value: 'materials', label: 'Materials Problems' },
  { value: 'communication', label: 'Communication Issues' },
  { value: 'other', label: 'Other' },
] as const;
export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number]['value'];

export const DISPUTE_DECISIONS = [
  'full_payment',
  'partial_release',
  'full_refund',
  'rework_required',
] as const;
export type DisputeDecision = (typeof DISPUTE_DECISIONS)[number];

export const DISPUTE_DEADLINES = {
  artisanResponse: 48, // hours
  customerCounter: 72, // hours
} as const;

// ─── Trust System ───────────────────────────────────────────────────────────

export const TRUST_LEVELS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

export const TRUST_LEVEL_THRESHOLDS = {
  bronze: 0,
  silver: 50,
  gold: 75,
  platinum: 90,
} as const;

export const TRUST_WEIGHTS = {
  completionRate: 25,
  cancellationRate: -15,
  disputeRate: -15,
  onTimeRate: 20,
  responseTime: 10,
  averageRating: 15,
} as const;

export const BADGE_TYPES = [
  'first_job',
  'jobs_10',
  'jobs_50',
  'jobs_100',
  'five_star_average',
  'quick_responder',
  'dispute_free',
  'always_on_time',
] as const;
export type BadgeType = (typeof BADGE_TYPES)[number];

// ─── Platform Fee ───────────────────────────────────────────────────────────

export const PLATFORM_FEE_PERCENTAGE = 10; // 10% platform fee
