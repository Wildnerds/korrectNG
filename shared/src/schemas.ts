import { z } from 'zod';
import {
  TRADE_VALUES,
  ROLES,
  VERIFICATION_STEPS,
  VERIFICATION_STATUSES,
  WARRANTY_STATUSES,
  CONTRACT_STATUSES,
  MILESTONE_STATUSES,
  MATERIALS_RESPONSIBILITY,
  ESCROW_STATUSES,
  DISPUTE_STATUSES,
  DISPUTE_CATEGORIES,
  DISPUTE_DECISIONS,
} from './constants';

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['customer', 'artisan'] as const),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  token: z.string().min(1),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().min(10).max(15).optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

// ─── Artisan Schemas ─────────────────────────────────────────────────────────

export const artisanProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  trade: z.enum(TRADE_VALUES as unknown as [string, ...string[]]),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000),
  location: z.string().min(2, 'Location is required').max(100),
  address: z.string().min(5, 'Address must be at least 5 characters').max(200),
  whatsappNumber: z.string().min(10).max(15),
  phoneNumber: z.string().min(10).max(15),
  yearsOfExperience: z.number().min(0).max(50),
  workingHours: z.string().max(100).optional(),
});

export const artisanSearchSchema = z.object({
  trade: z.string().optional(),
  location: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['rating', 'reviews', 'newest']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
});

// ─── Review Schemas ──────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  artisanId: z.string().min(1, 'Artisan ID is required'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  text: z.string().min(10, 'Review must be at least 10 characters').max(1000),
  jobType: z.string().min(2, 'Job type is required').max(100),
});

export const editReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().min(3).max(100).optional(),
  text: z.string().min(10).max(1000).optional(),
});

export const artisanResponseSchema = z.object({
  response: z.string().min(5, 'Response must be at least 5 characters').max(500),
});

export const flagReviewSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

// ─── Verification Schemas ────────────────────────────────────────────────────

export const verificationPersonalInfoSchema = z.object({
  businessName: z.string().min(2).max(100),
  trade: z.enum(TRADE_VALUES as unknown as [string, ...string[]]),
  yearsOfExperience: z.number().min(0).max(50),
  location: z.string().min(2).max(100),
  address: z.string().min(5).max(200),
});

// ─── Warranty Schemas ────────────────────────────────────────────────────────

export const warrantyClaimSchema = z.object({
  artisanId: z.string().min(1, 'Artisan ID is required'),
  jobDescription: z.string().min(10, 'Job description must be at least 10 characters').max(1000),
  issueDescription: z.string().min(10, 'Issue description must be at least 10 characters').max(1000),
});

export const warrantyResponseSchema = z.object({
  response: z.string().min(5, 'Response must be at least 5 characters').max(1000),
  status: z.enum(['in-progress', 'resolved'] as const).optional(),
});

// ─── Contract Schemas ───────────────────────────────────────────────────────

const disputeCategoryValues = DISPUTE_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const milestoneSchema = z.object({
  order: z.number().min(1).max(10),
  name: z.string().min(2, 'Milestone name must be at least 2 characters').max(100),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500),
  percentage: z.number().min(1).max(100),
  triggerCondition: z.string().max(500).optional(),
  dueDate: z.string().optional(),
});

export const materialSchema = z.object({
  item: z.string().min(2, 'Item name must be at least 2 characters').max(100),
  estimatedCost: z.number().min(0),
  providedBy: z.enum(MATERIALS_RESPONSIBILITY as unknown as [string, ...string[]]),
});

export const createContractSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  scopeOfWork: z.string().min(20, 'Scope of work must be at least 20 characters').max(5000),
  deliverables: z.array(z.string().min(2).max(200)).min(1, 'At least one deliverable is required'),
  exclusions: z.array(z.string().min(2).max(200)).optional(),
  materialsResponsibility: z.enum(MATERIALS_RESPONSIBILITY as unknown as [string, ...string[]]),
  materialsList: z.array(materialSchema).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  estimatedEndDate: z.string().min(1, 'Estimated end date is required'),
  milestones: z.array(milestoneSchema).min(1, 'At least one milestone is required').max(10),
});

export const updateContractSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  scopeOfWork: z.string().min(20).max(5000).optional(),
  deliverables: z.array(z.string().min(2).max(200)).optional(),
  exclusions: z.array(z.string().min(2).max(200)).optional(),
  materialsResponsibility: z.enum(MATERIALS_RESPONSIBILITY as unknown as [string, ...string[]]).optional(),
  materialsList: z.array(materialSchema).optional(),
  startDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  milestones: z.array(milestoneSchema).optional(),
});

export const signContractSchema = z.object({
  agreementConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm that you agree to the contract terms' }),
  }),
});

// ─── Escrow Schemas ─────────────────────────────────────────────────────────

export const fundEscrowSchema = z.object({
  callbackUrl: z.string().url().optional(),
});

export const releaseRequestSchema = z.object({
  milestone: z.number().min(1).max(10),
  notes: z.string().max(500).optional(),
});

export const approveReleaseSchema = z.object({
  milestone: z.number().min(1).max(10),
  approved: z.boolean(),
  notes: z.string().max(500).optional(),
});

// ─── Dispute Schemas ────────────────────────────────────────────────────────

export const openDisputeSchema = z.object({
  contractId: z.string().min(1, 'Contract ID is required'),
  category: z.enum(disputeCategoryValues),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000),
});

export const artisanDisputeResponseSchema = z.object({
  response: z.string().min(50, 'Response must be at least 50 characters').max(2000),
});

export const customerCounterSchema = z.object({
  counter: z.string().min(20, 'Counter statement must be at least 20 characters').max(2000),
});

export const resolveDisputeSchema = z.object({
  decision: z.enum(DISPUTE_DECISIONS as unknown as [string, ...string[]]),
  notes: z.string().min(10, 'Notes must be at least 10 characters').max(1000),
  customerRefundAmount: z.number().min(0).optional(),
  artisanPaymentAmount: z.number().min(0).optional(),
});

export const uploadEvidenceSchema = z.object({
  type: z.enum(['image', 'video', 'document']),
  description: z.string().max(500).optional(),
});

// ─── Terms Acceptance Schema ────────────────────────────────────────────────

export const acceptTermsSchema = z.object({
  termsVersion: z.string().min(1, 'Terms version is required'),
  confirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms to continue' }),
  }),
});

// ─── Type Exports ────────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ArtisanProfileInput = z.infer<typeof artisanProfileSchema>;
export type ArtisanSearchInput = z.infer<typeof artisanSearchSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type EditReviewInput = z.infer<typeof editReviewSchema>;
export type WarrantyClaimInput = z.infer<typeof warrantyClaimSchema>;
export type MilestoneInput = z.infer<typeof milestoneSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type SignContractInput = z.infer<typeof signContractSchema>;
export type FundEscrowInput = z.infer<typeof fundEscrowSchema>;
export type ReleaseRequestInput = z.infer<typeof releaseRequestSchema>;
export type ApproveReleaseInput = z.infer<typeof approveReleaseSchema>;
export type OpenDisputeInput = z.infer<typeof openDisputeSchema>;
export type ArtisanDisputeResponseInput = z.infer<typeof artisanDisputeResponseSchema>;
export type CustomerCounterInput = z.infer<typeof customerCounterSchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
export type UploadEvidenceInput = z.infer<typeof uploadEvidenceSchema>;
export type AcceptTermsInput = z.infer<typeof acceptTermsSchema>;
