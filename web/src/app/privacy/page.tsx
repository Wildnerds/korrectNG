import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | KorrectNG',
  description: 'Privacy Policy for KorrectNG - How we collect, use, and protect your data',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-8">Last updated: February 9, 2026</p>

          <div className="prose prose-green max-w-none">
            <p>
              KorrectNG ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our
              platform. This policy complies with the Nigeria Data Protection Regulation (NDPR) 2019.
            </p>

            <h2>1. Information We Collect</h2>

            <h3>1.1 Information You Provide</h3>
            <p>We collect information you provide directly, including:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, phone number, password</li>
              <li><strong>Profile Information:</strong> Business name, trade, location, work experience, photos</li>
              <li><strong>Verification Documents:</strong> Government-issued ID, trade credentials, work photos</li>
              <li><strong>Reviews and Feedback:</strong> Ratings, review text, responses</li>
              <li><strong>Communications:</strong> Messages sent through the platform, support inquiries</li>
              <li><strong>Payment Information:</strong> Transaction records (card details are processed by Paystack)</li>
            </ul>

            <h3>1.2 Automatically Collected Information</h3>
            <p>When you use our Platform, we automatically collect:</p>
            <ul>
              <li><strong>Device Information:</strong> Device type, operating system, browser type</li>
              <li><strong>Usage Data:</strong> Pages visited, search queries, click patterns</li>
              <li><strong>Location Data:</strong> General location based on IP address</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
            </ul>

            <h3>1.3 Information from Third Parties</h3>
            <p>We may receive information from:</p>
            <ul>
              <li>ID verification service providers (for artisan verification)</li>
              <li>Payment processors (Paystack)</li>
              <li>Analytics providers</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide, maintain, and improve the Platform</li>
              <li>Process transactions and send related information</li>
              <li>Verify artisan identities and credentials</li>
              <li>Connect customers with suitable artisans</li>
              <li>Send notifications about your account, updates, and promotions</li>
              <li>Respond to comments, questions, and support requests</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Detect, investigate, and prevent fraudulent transactions</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>3. Legal Basis for Processing (NDPR Compliance)</h2>
            <p>We process your personal data based on:</p>
            <ul>
              <li><strong>Consent:</strong> You have given clear consent for specific purposes</li>
              <li><strong>Contract:</strong> Processing is necessary for the services you requested</li>
              <li><strong>Legal Obligation:</strong> Processing is required by Nigerian law</li>
              <li><strong>Legitimate Interests:</strong> Processing is necessary for our legitimate business interests</li>
            </ul>

            <h2>4. Information Sharing and Disclosure</h2>
            <p>We may share your information with:</p>

            <h3>4.1 Other Users</h3>
            <ul>
              <li>Artisan profiles are visible to customers searching for services</li>
              <li>Reviews and ratings are publicly visible</li>
              <li>Contact information is shared when a connection is made</li>
            </ul>

            <h3>4.2 Service Providers</h3>
            <p>We share data with third-party service providers who assist in:</p>
            <ul>
              <li>Payment processing (Paystack)</li>
              <li>ID verification (verification partners)</li>
              <li>Cloud hosting and storage (Cloudinary, MongoDB Atlas)</li>
              <li>Email delivery</li>
              <li>Analytics</li>
            </ul>

            <h3>4.3 Legal Requirements</h3>
            <p>We may disclose information when required by law or to:</p>
            <ul>
              <li>Comply with legal processes</li>
              <li>Protect our rights and property</li>
              <li>Prevent fraud or illegal activities</li>
              <li>Protect user safety</li>
            </ul>

            <h3>4.4 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale of assets, user information may be transferred
              as part of that transaction.
            </p>

            <h2>5. Data Retention</h2>
            <p>We retain your information for as long as:</p>
            <ul>
              <li>Your account is active</li>
              <li>Needed to provide services to you</li>
              <li>Required by law or for legitimate business purposes</li>
              <li>Necessary to resolve disputes or enforce agreements</li>
            </ul>
            <p>
              After account deletion, we may retain certain information in anonymized form for analytics
              and to comply with legal obligations.
            </p>

            <h2>6. Your Rights Under NDPR</h2>
            <p>You have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Restriction:</strong> Request limitation of data processing</li>
              <li><strong>Portability:</strong> Receive your data in a structured format</li>
              <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdraw Consent:</strong> Withdraw previously given consent</li>
            </ul>
            <p>
              To exercise these rights, contact us at privacy@korrectng.com. We will respond within 30 days.
            </p>

            <h2>7. Data Security</h2>
            <p>We implement appropriate security measures including:</p>
            <ul>
              <li>Encryption of data in transit (HTTPS/TLS)</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure cloud infrastructure</li>
            </ul>
            <p>
              However, no method of transmission over the Internet is 100% secure. We cannot guarantee
              absolute security.
            </p>

            <h2>8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries outside Nigeria where our
              service providers are located. We ensure appropriate safeguards are in place to protect your
              data in accordance with NDPR requirements.
            </p>

            <h2>9. Children's Privacy</h2>
            <p>
              KorrectNG is not intended for children under 18 years of age. We do not knowingly collect
              personal information from children. If we discover we have collected information from a child,
              we will delete it promptly.
            </p>

            <h2>10. Cookies and Tracking Technologies</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li>Remember your preferences</li>
              <li>Understand how you use the Platform</li>
              <li>Improve your experience</li>
              <li>Analyze traffic and trends</li>
            </ul>
            <p>
              You can control cookies through your browser settings, though some features may not work
              properly if cookies are disabled.
            </p>

            <h2>11. Third-Party Links</h2>
            <p>
              The Platform may contain links to third-party websites. We are not responsible for the
              privacy practices of these sites. We encourage you to read their privacy policies.
            </p>

            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes via email or Platform notification. The "Last updated" date at the top indicates
              when the policy was last revised.
            </p>

            <h2>13. Contact Us</h2>
            <p>For privacy-related questions or concerns, contact our Data Protection Officer:</p>
            <ul>
              <li><strong>Email:</strong> privacy@korrectng.com</li>
              <li><strong>Address:</strong> Lagos, Nigeria</li>
            </ul>

            <h2>14. Regulatory Authority</h2>
            <p>
              If you are unsatisfied with our response to your privacy concerns, you may lodge a complaint
              with the National Information Technology Development Agency (NITDA):
            </p>
            <ul>
              <li><strong>Website:</strong> www.nitda.gov.ng</li>
              <li><strong>Email:</strong> info@nitda.gov.ng</li>
            </ul>

            <hr className="my-8" />

            <p className="text-sm text-gray-500">
              By using KorrectNG, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
