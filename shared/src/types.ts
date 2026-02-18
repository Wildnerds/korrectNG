import type {
  Role,
  TradeValue,
  VerificationStatus,
  SubscriptionStatus,
  WarrantyStatus,
  VerificationStep,
  ContractStatus,
  MilestoneStatus,
  MaterialsResponsibility,
  EscrowStatus,
  DisputeStatus,
  DisputeCategory,
  DisputeDecision,
  TrustLevel,
  BadgeType,
} from './constants';

// ─── Base ────────────────────────────────────────────────────────────────────

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User extends Timestamps {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  isEmailVerified: boolean;
  bookmarkedArtisans: string[];
  avatar?: string;
}

export interface UserRegistration {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'artisan';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ─── Artisan Profile ─────────────────────────────────────────────────────────

export interface ArtisanProfile extends Timestamps {
  _id: string;
  user: string | User;
  businessName: string;
  slug: string;
  trade: TradeValue;
  description: string;
  location: string;
  address: string;
  whatsappNumber: string;
  phoneNumber: string;
  yearsOfExperience: number;
  jobsCompleted: number;
  verificationStatus: VerificationStatus;
  isPublished: boolean;
  averageRating: number;
  totalReviews: number;
  galleryImages: GalleryImage[];
  workingHours: string;

  // Trust/Reputation metrics
  completionRate?: number;
  cancellationRate?: number;
  disputeRate?: number;
  onTimeRate?: number;
  responseTime?: number;
  trustScore?: number;
  trustLevel?: TrustLevel;
  badges?: Badge[];
}

export type GalleryCategory = 'completed' | 'before-after' | 'in-progress' | 'tools' | 'other';

export interface GalleryImage {
  url: string;
  publicId: string;
  caption?: string;
  category?: GalleryCategory;
  order?: number;
}

export interface ArtisanSearchParams {
  trade?: string;
  location?: string;
  sort?: string;
  page?: number;
  limit?: number;
  q?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review extends Timestamps {
  _id: string;
  artisan: string | ArtisanProfile;
  customer: string | User;
  rating: number;
  title: string;
  text: string;
  jobType: string;
  artisanResponse?: string;
  artisanRespondedAt?: string;
  isFlagged: boolean;
  flagReason?: string;
}

// ─── Verification ────────────────────────────────────────────────────────────

export interface DocumentValidationResult {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  errors: string[];
  aiAnalysis?: {
    isDocument: boolean;
    documentType?: string;
    description?: string;
    confidence?: number;
  };
}

export interface VerificationDocument {
  type: 'govtId' | 'tradeCredential' | 'workPhotos';
  url: string;
  publicId: string;
  validationResult?: DocumentValidationResult;
}

export interface VerificationApplication extends Timestamps {
  _id: string;
  artisan: string | ArtisanProfile;
  documents: VerificationDocument[];
  paymentStatus: 'pending' | 'paid';
  paymentReference?: string;
  status: VerificationStatus;
  currentStep: VerificationStep;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface Subscription extends Timestamps {
  _id: string;
  artisan: string | ArtisanProfile;
  paystackSubscriptionCode: string;
  paystackCustomerCode: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  amount: number;
}

// ─── Warranty ────────────────────────────────────────────────────────────────

export interface WarrantyClaim extends Timestamps {
  _id: string;
  customer: string | User;
  artisan: string | ArtisanProfile;
  jobDescription: string;
  issueDescription: string;
  status: WarrantyStatus;
  artisanResponse?: string;
  resolution?: string;
  resolvedAt?: string;
}

// ─── Search Log ──────────────────────────────────────────────────────────────

export interface SearchLog extends Timestamps {
  _id: string;
  trade?: string;
  location?: string;
  query?: string;
  resultsCount: number;
  source: 'web' | 'mobile';
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalUsers: number;
  totalArtisans: number;
  totalReviews: number;
  pendingVerifications: number;
  activeSubscriptions: number;
  openWarrantyClaims: number;
  revenue: number;
}

// ─── Contract ───────────────────────────────────────────────────────────────

export interface ContractMilestone {
  order: number;
  name: string;
  description: string;
  percentage: number;
  amount: number;
  status: MilestoneStatus;
  triggerCondition?: string;
  dueDate?: string;
  completedAt?: string;
  approvedAt?: string;
}

export interface ContractMaterial {
  item: string;
  estimatedCost: number;
  providedBy: MaterialsResponsibility;
}

export interface ContractSignature {
  signedBy: string;
  signedAt: string;
  ipAddress?: string;
}

export interface ContractStatusHistory {
  status: ContractStatus;
  timestamp: string;
  note?: string;
  by: string;
}

export interface JobContract extends Timestamps {
  _id: string;
  booking: string;
  customer: string | User;
  artisan: string | User;
  artisanProfile: string | ArtisanProfile;

  // Contract details
  title: string;
  scopeOfWork: string;
  deliverables: string[];
  exclusions: string[];

  // Materials
  materialsResponsibility: MaterialsResponsibility;
  materialsList: ContractMaterial[];

  // Pricing
  totalAmount: number;
  platformFee: number;
  artisanEarnings: number;

  // Timeline
  startDate: string;
  estimatedEndDate: string;

  // Milestones
  milestones: ContractMilestone[];

  // Signatures
  customerSignature?: ContractSignature;
  artisanSignature?: ContractSignature;

  // Status
  status: ContractStatus;
  statusHistory: ContractStatusHistory[];
}

// ─── Escrow ─────────────────────────────────────────────────────────────────

export interface EscrowRelease {
  milestone: number;
  amount: number;
  releasedAt: string;
  releasedBy: string;
  paystackTransferRef?: string;
}

export interface EscrowStatusHistory {
  status: EscrowStatus;
  timestamp: string;
  note?: string;
  by: string;
}

export interface EscrowPayment extends Timestamps {
  _id: string;
  contract: string | JobContract;
  booking: string;
  customer: string | User;
  artisan: string | User;

  // Amounts
  totalAmount: number;
  platformFee: number;
  fundedAmount: number;
  releasedAmount: number;
  refundedAmount: number;

  // Payment tracking
  paystackReference?: string;
  fundedAt?: string;

  // Releases
  releases: EscrowRelease[];

  // Status
  status: EscrowStatus;
  statusHistory: EscrowStatusHistory[];

  // Dispute reference
  dispute?: string;
}

// ─── Dispute ────────────────────────────────────────────────────────────────

export interface DisputeEvidence {
  uploadedBy: string;
  type: 'image' | 'video' | 'document';
  url: string;
  publicId: string;
  description?: string;
  uploadedAt: string;
}

export interface DisputeTimeline {
  timestamp: string;
  action: string;
  by: string;
  details?: string;
}

export interface DisputeContractSnapshot {
  scopeOfWork: string;
  milestones: ContractMilestone[];
  deliverables: string[];
}

export interface DisputeDecisionDetails {
  madeBy: string;
  madeAt: string;
  notes?: string;
  customerRefundAmount?: number;
  artisanPaymentAmount?: number;
}

export interface Dispute extends Timestamps {
  _id: string;
  contract: string | JobContract;
  escrow: string | EscrowPayment;
  booking: string;
  customer: string | User;
  artisan: string | User;
  conversation?: string;

  // Dispute details
  reason: string;
  category: DisputeCategory;
  description: string;

  // Evidence
  customerEvidence: DisputeEvidence[];
  artisanEvidence: DisputeEvidence[];

  // Responses
  artisanResponse?: {
    content: string;
    respondedAt: string;
  };
  customerCounter?: {
    content: string;
    submittedAt: string;
  };

  // Contract snapshot
  contractSnapshot: DisputeContractSnapshot;

  // Timeline
  timeline: DisputeTimeline[];

  // Deadlines
  artisanResponseDeadline: string;
  customerCounterDeadline?: string;

  // Status and resolution
  status: DisputeStatus;
  decision?: DisputeDecision;
  decisionDetails?: DisputeDecisionDetails;

  // Admin handling
  autoEscalatedAt?: string;
  assignedAdmin?: string;
}

// ─── Trust & Reputation ─────────────────────────────────────────────────────

export interface Badge {
  type: BadgeType;
  earnedAt: string;
  details?: string;
}

export interface TrustMetrics {
  completionRate: number;
  cancellationRate: number;
  disputeRate: number;
  onTimeRate: number;
  responseTime: number;
  trustScore: number;
  trustLevel: TrustLevel;
  badges: Badge[];
}

// ─── Terms Acceptance ───────────────────────────────────────────────────────

export interface TermsAcceptance extends Timestamps {
  _id: string;
  user: string | User;
  termsVersion: string;
  acceptedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

// ─── Price Catalog ─────────────────────────────────────────────────────────

export type PriceSourceType = 'supplier' | 'ecommerce' | 'crowdsourced' | 'manual';
export type QualityTier = 'budget' | 'standard' | 'premium' | 'oem';
export type PriceStatus = 'fair' | 'slightly_high' | 'high' | 'very_high' | 'below_market' | 'no_data';
export type OverallPriceStatus = 'fair' | 'caution' | 'overpriced';

export interface PriceSource {
  name: string;
  type: PriceSourceType;
  price: number;
  url?: string;
  lastUpdated: string;
  isVerified: boolean;
}

export interface PriceCatalogItem extends Timestamps {
  _id: string;
  name: string;
  slug: string;
  category: string;
  subcategory?: string;
  trade: string;
  description?: string;
  brand?: string;
  partNumber?: string;
  compatibleWith?: string[];
  qualityTier: QualityTier;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  currency: string;
  sources: PriceSource[];
  sourceCount: number;
  isActive: boolean;
}

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
    lastUpdated: string;
  };
  status: PriceStatus;
  percentageDiff: number;
  recommendation: string;
}

export interface ContractPriceAnalysis {
  totalQuoted: number;
  totalMarketAverage: number;
  totalMarketMin: number;
  totalMarketMax: number;
  overallStatus: OverallPriceStatus;
  itemComparisons: PriceComparisonResult[];
  itemsWithNoData: string[];
  coveragePercentage: number;
}
