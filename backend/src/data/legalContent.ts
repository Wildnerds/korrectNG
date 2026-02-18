/**
 * Legal Content with Version Tracking
 */

export interface TermsVersion {
  version: string;
  effectiveDate: Date;
  content: string;
  keyChanges?: string[];
}

export const CURRENT_TERMS_VERSION = '2.0.0';

export const TERMS_OF_SERVICE: TermsVersion = {
  version: CURRENT_TERMS_VERSION,
  effectiveDate: new Date('2024-01-15'),
  keyChanges: [
    'Added escrow payment protection',
    'Added dispute resolution process',
    'Updated platform fee structure',
    'Added contract milestone system',
  ],
  content: `
# KorrectNG Terms of Service

**Version ${CURRENT_TERMS_VERSION}** | **Effective Date: January 15, 2024**

## 1. Introduction and Acceptance

Welcome to KorrectNG ("Platform", "we", "us", "our"), a product of Hives & Hornets Ltd., a company registered in the Federal Republic of Nigeria. By accessing or using our services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our services.

KorrectNG is a marketplace platform operated by Hives & Hornets Ltd. that connects customers seeking artisan services with verified service providers ("Artisans"). We facilitate the connection but do not directly provide artisan services.

## 2. Platform Role and Relationship

### 2.1 Facilitator Status
KorrectNG operates solely as a marketplace facilitator. We are NOT:
- An employer of any Artisan on the platform
- A party to contracts between Customers and Artisans
- Responsible for the quality or outcome of services provided
- Liable for actions, omissions, or disputes between users

### 2.2 Independent Contractors
All Artisans on KorrectNG are independent contractors, not employees, agents, or representatives of KorrectNG. Artisans are solely responsible for:
- The quality of their work
- Compliance with applicable laws and regulations
- Their own taxes, insurance, and business obligations
- Proper licensing and certifications for their trade

## 3. User Accounts

### 3.1 Account Creation
You must provide accurate, complete information when creating an account. You are responsible for:
- Maintaining the confidentiality of your login credentials
- All activities that occur under your account
- Notifying us immediately of any unauthorized access

### 3.2 Account Types
- **Customer Accounts**: For individuals seeking artisan services
- **Artisan Accounts**: For verified service providers (requires verification and subscription)
- **Admin Accounts**: For platform administrators only

## 4. Escrow Payment System

### 4.1 Payment Protection
KorrectNG uses an escrow system to protect both Customers and Artisans:
- Customers fund the full contract amount into escrow before work begins
- Funds are released to Artisans in milestones as work progresses
- Standard milestone split: 30% on signing, 40% at midpoint, 30% on completion

### 4.2 Payment Terms
- All payments are processed through our payment provider (Paystack)
- Platform fees (10% of contract value) are deducted from Artisan earnings
- Refunds are processed according to our dispute resolution policy
- Funds are held in escrow until milestones are approved by the Customer

### 4.3 Currency
All transactions on KorrectNG are conducted in Nigerian Naira (NGN).

## 5. Contracts and Milestones

### 5.1 Digital Contracts
When a booking is accepted, both parties must sign a digital contract that includes:
- Scope of work and deliverables
- Materials responsibility
- Payment milestones and amounts
- Timeline and deadlines

### 5.2 Contract Enforcement
Contracts are legally binding agreements between Customer and Artisan. KorrectNG:
- Facilitates the contract creation process
- Holds funds in escrow per contract terms
- Does not guarantee contract performance by either party

### 5.3 Milestone Release
- Artisans request milestone release upon completing work
- Customers must approve or dispute within 72 hours
- Approved milestones are released to the Artisan
- Disputed milestones follow our dispute resolution process

## 6. Dispute Resolution

### 6.1 Dispute Process
If a dispute arises:
1. Customer opens a dispute with supporting evidence
2. Artisan has 48 hours to respond
3. Customer can submit a counter-response within 72 hours
4. KorrectNG admin reviews and makes a binding decision

### 6.2 Resolution Options
Disputes may be resolved with:
- Full payment to Artisan (work was completed satisfactorily)
- Full refund to Customer (work was not completed)
- Partial release (split between parties)
- Rework required (Artisan to complete outstanding work)

### 6.3 Binding Decision
KorrectNG's dispute resolution decision is final and binding on both parties regarding the release of escrowed funds.

## 7. Verification and Trust

### 7.1 Artisan Verification
We verify Artisans through:
- Government ID verification
- Trade credential review
- Work portfolio review

### 7.2 Trust Score
Artisans receive a trust score based on:
- Job completion rate
- On-time delivery
- Customer reviews
- Response time
- Dispute history

### 7.3 No Guarantee
Verification does not guarantee:
- Quality of work
- Specific outcomes
- Artisan availability
- Pricing accuracy

## 8. Fees and Payments

### 8.1 Customer Fees
Customers pay the contract amount directly, with no additional platform fees.

### 8.2 Artisan Fees
Artisans pay:
- One-time verification fee: ₦10,000
- Monthly subscription: ₦5,000
- Platform commission: 10% of each contract

### 8.3 Refund Policy
Refunds are processed according to our dispute resolution outcomes. Platform fees may be non-refundable in certain circumstances.

## 9. Prohibited Conduct

Users must NOT:
- Provide false or misleading information
- Circumvent the platform to avoid fees
- Engage in fraudulent activities
- Harass or threaten other users
- Post inappropriate content
- Violate applicable laws

## 10. Intellectual Property

### 10.1 Platform Content
All platform content, including logos, designs, and software, is owned by KorrectNG and protected by intellectual property laws.

### 10.2 User Content
Users retain ownership of content they upload but grant KorrectNG a license to use such content for platform operations.

## 11. Limitation of Liability

### 11.1 Service Disclaimer
KorrectNG provides the platform "as is" without warranties of any kind. We do not warrant that:
- The platform will be uninterrupted or error-free
- Results will meet your expectations
- Services provided by Artisans will be satisfactory

### 11.2 Liability Cap
To the maximum extent permitted by law, KorrectNG's total liability shall not exceed the fees paid by you in the 12 months preceding the claim.

### 11.3 Exclusions
We are not liable for:
- Indirect, incidental, or consequential damages
- Loss of profits or data
- Actions of third parties, including Artisans
- Force majeure events

## 12. Indemnification

You agree to indemnify and hold KorrectNG harmless from any claims, damages, or expenses arising from:
- Your use of the platform
- Your violation of these Terms
- Your violation of any third-party rights
- Services you provide or receive through the platform

## 13. Privacy

Your use of the platform is subject to our Privacy Policy, which is incorporated into these Terms by reference.

## 14. Modifications

We may modify these Terms at any time. We will notify you of material changes via email or platform notification. Continued use after changes constitutes acceptance.

## 15. Termination

### 15.1 By User
You may terminate your account at any time. Pending contracts and escrow funds will be handled according to their terms.

### 15.2 By KorrectNG
We may suspend or terminate accounts for violations of these Terms or for any other reason with or without notice.

## 16. Governing Law

These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved through arbitration in Lagos, Nigeria.

## 17. Contact Information

For questions about these Terms, contact us at:

**Hives & Hornets Ltd.**
- Email: legal@korrectng.com
- Address: Lagos, Nigeria

---

**By using KorrectNG, a product of Hives & Hornets Ltd., you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.**
`,
};

export const PRIVACY_POLICY: TermsVersion = {
  version: '1.0.0',
  effectiveDate: new Date('2024-01-15'),
  content: `
# KorrectNG Privacy Policy

**Version 1.0.0** | **Effective Date: January 15, 2024**

KorrectNG is a product of **Hives & Hornets Ltd.**, a company registered in the Federal Republic of Nigeria. This Privacy Policy explains how we collect, use, and protect your information.

## 1. Information We Collect

### 1.1 Personal Information
- Name, email, phone number
- Government ID (for Artisan verification)
- Payment information
- Location and address

### 1.2 Usage Information
- Device information
- IP address
- Platform usage patterns
- Communication logs

## 2. How We Use Your Information

- To provide and improve our services
- To process payments and contracts
- To verify Artisan credentials
- To communicate with you
- To comply with legal obligations

## 3. Information Sharing

We may share your information with:
- Payment processors (Paystack)
- Cloud service providers
- Law enforcement when required
- Other users (as necessary for service delivery)

## 4. Data Security

We implement reasonable security measures to protect your information, including encryption and secure data storage.

## 5. Your Rights

You have the right to:
- Access your personal data
- Request correction of inaccurate data
- Request deletion of your data
- Object to certain processing

## 6. Contact Us

For privacy-related inquiries:

**Hives & Hornets Ltd.**
- Email: privacy@korrectng.com
- Address: Lagos, Nigeria
`,
};

/**
 * Get current terms version
 */
export function getCurrentTermsVersion(): string {
  return CURRENT_TERMS_VERSION;
}

/**
 * Get terms content
 */
export function getTermsContent(): TermsVersion {
  return TERMS_OF_SERVICE;
}

/**
 * Get privacy policy content
 */
export function getPrivacyPolicyContent(): TermsVersion {
  return PRIVACY_POLICY;
}

export default {
  CURRENT_TERMS_VERSION,
  TERMS_OF_SERVICE,
  PRIVACY_POLICY,
  getCurrentTermsVersion,
  getTermsContent,
  getPrivacyPolicyContent,
};
