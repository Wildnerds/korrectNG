import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | KorrectNG',
  description: 'Terms of Service for KorrectNG - Nigeria\'s Trusted Artisan Marketplace',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-8">Last updated: February 9, 2026</p>

          <div className="prose prose-green max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using KorrectNG ("the Platform"), you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of these terms, you are
              prohibited from using or accessing the Platform.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              KorrectNG is an online marketplace that connects customers with verified artisans and service
              providers in Nigeria. We facilitate the discovery of and connection between customers seeking
              services and artisans providing services including but not limited to:
            </p>
            <ul>
              <li>Auto mechanics</li>
              <li>Electricians</li>
              <li>Plumbers</li>
              <li>AC Technicians</li>
              <li>Generator Technicians</li>
              <li>Phone Repairers</li>
              <li>Tailors</li>
              <li>Carpenters</li>
              <li>Painters</li>
              <li>Welders</li>
            </ul>

            <h2>3. User Accounts</h2>
            <h3>3.1 Registration</h3>
            <p>
              To access certain features of the Platform, you must register for an account. You agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>

            <h3>3.2 Account Types</h3>
            <p>
              <strong>Customer Accounts:</strong> Allow users to search for artisans, leave reviews, bookmark
              favorites, and submit warranty claims.
            </p>
            <p>
              <strong>Artisan Accounts:</strong> Allow service providers to create profiles, receive customer
              inquiries, respond to reviews, and participate in the verification program.
            </p>

            <h2>4. Artisan Verification Program</h2>
            <h3>4.1 Verification Process</h3>
            <p>
              Artisans may apply for verification by submitting required documents including:
            </p>
            <ul>
              <li>Valid government-issued identification (NIN, Driver's License, or Passport)</li>
              <li>Trade credentials or certifications (where applicable)</li>
              <li>Photos of previous work</li>
            </ul>

            <h3>4.2 Verification Fee</h3>
            <p>
              A one-time verification fee of ₦10,000 (Ten Thousand Naira) is required to process verification
              applications. This fee is non-refundable regardless of the outcome of the verification process.
            </p>

            <h3>4.3 Verification Status</h3>
            <p>
              Verification does not guarantee the quality of work or conduct of artisans. It confirms that
              the artisan has provided valid identification and credentials as of the verification date.
            </p>

            <h2>5. Subscription for Artisans</h2>
            <p>
              Verified artisans must maintain an active subscription of ₦5,000 (Five Thousand Naira) per month
              to appear in search results and receive customer inquiries. Subscriptions are billed monthly and
              may be cancelled at any time.
            </p>

            <h2>6. Warranty Program</h2>
            <h3>6.1 Coverage</h3>
            <p>
              All services arranged through KorrectNG come with a 30-day warranty from the date of service
              completion. This warranty covers defects in workmanship related to the original service provided.
            </p>

            <h3>6.2 Limitations</h3>
            <p>The warranty does NOT cover:</p>
            <ul>
              <li>Damage caused by customer misuse or negligence</li>
              <li>Normal wear and tear</li>
              <li>Services or repairs performed by third parties</li>
              <li>Issues unrelated to the original service</li>
              <li>Transactions conducted outside the Platform</li>
            </ul>

            <h3>6.3 Claims Process</h3>
            <p>
              To file a warranty claim, customers must submit a claim through the Platform within 30 days
              of service completion, providing a description of the issue. Artisans have 72 hours to respond
              to claims.
            </p>

            <h2>7. Reviews and Ratings</h2>
            <p>
              Users agree to provide honest, accurate reviews based on actual experiences. Reviews must not
              contain:
            </p>
            <ul>
              <li>False or misleading information</li>
              <li>Offensive, discriminatory, or inappropriate content</li>
              <li>Personal information of others</li>
              <li>Spam or promotional content</li>
            </ul>
            <p>
              KorrectNG reserves the right to remove reviews that violate these guidelines.
            </p>

            <h2>8. Payment Terms</h2>
            <p>
              All payments for verification fees and subscriptions are processed through Paystack. By making
              a payment, you agree to Paystack's terms of service. KorrectNG does not store payment card details.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              KorrectNG is a marketplace platform that facilitates connections between customers and artisans.
              We are NOT:
            </p>
            <ul>
              <li>A party to any agreement between customers and artisans</li>
              <li>Responsible for the quality of services provided by artisans</li>
              <li>Liable for any damages arising from services or disputes</li>
              <li>An employer of any artisan on the Platform</li>
            </ul>
            <p>
              Our maximum liability for any claim shall not exceed the amount paid by you to KorrectNG in the
              12 months preceding the claim.
            </p>

            <h2>10. Prohibited Activities</h2>
            <p>Users must not:</p>
            <ul>
              <li>Violate any applicable laws or regulations</li>
              <li>Impersonate others or provide false information</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Circumvent the Platform to avoid fees</li>
              <li>Post malicious content or attempt to hack the Platform</li>
              <li>Use the Platform for illegal services</li>
              <li>Scrape or collect user data without permission</li>
            </ul>

            <h2>11. Intellectual Property</h2>
            <p>
              The Platform, including its design, content, and features, is owned by KorrectNG and protected
              by Nigerian and international copyright laws. Users retain ownership of content they post but
              grant KorrectNG a license to use such content for Platform operations.
            </p>

            <h2>12. Termination</h2>
            <p>
              KorrectNG may suspend or terminate your account at any time for violation of these Terms or
              for any other reason at our discretion. Users may close their accounts at any time through
              the Platform settings.
            </p>

            <h2>13. Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms shall be resolved through binding arbitration in Lagos,
              Nigeria, in accordance with the Arbitration and Conciliation Act. The language of arbitration
              shall be English.
            </p>

            <h2>14. Changes to Terms</h2>
            <p>
              KorrectNG reserves the right to modify these Terms at any time. Users will be notified of
              significant changes via email or Platform notification. Continued use after changes constitutes
              acceptance of the modified Terms.
            </p>

            <h2>15. Contact Information</h2>
            <p>
              For questions about these Terms, contact us at:
            </p>
            <ul>
              <li>Email: legal@korrectng.com</li>
              <li>Address: Lagos, Nigeria</li>
            </ul>

            <hr className="my-8" />

            <p className="text-sm text-gray-500">
              By using KorrectNG, you acknowledge that you have read, understood, and agree to be bound by
              these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
