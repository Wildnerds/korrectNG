import { Resend } from 'resend';
import { log } from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Use Resend API key (SMTP_PASS contains the API key)
const resend = new Resend(process.env.RESEND_API_KEY || process.env.SMTP_PASS);

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const fromEmail = process.env.EMAIL_FROM || 'noreply@support.korrectng.ng';

  try {
    console.log('Attempting to send email via Resend API to:', options.to);

    const { data, error } = await resend.emails.send({
      from: `KorrectNG <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    if (error) {
      log.error('Resend API error', { error, to: options.to });
      throw new Error(error.message);
    }

    console.log('Email sent successfully! ID:', data?.id);
    log.info('Email sent', { emailId: data?.id, to: options.to });
  } catch (error) {
    log.error('Email sending failed', { error: error instanceof Error ? error.message : error, to: options.to });
    throw new Error('Failed to send email');
  }
};

// Email templates
export const emailTemplates = {
  verifyEmail: (name: string, verificationUrl: string) => ({
    subject: 'Verify your KorrectNG account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #008751; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to KorrectNG!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button" style="color: white;">Verify Email</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-size: 12px;">
                ${verificationUrl}
              </p>
              <p>This link expires in 24 hours.</p>
              <p>If you didn't create an account with KorrectNG, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  resetPassword: (name: string, resetUrl: string) => ({
    subject: 'Reset your KorrectNG password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #008751; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>You requested to reset your password. Click the button below to set a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button" style="color: white;">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-size: 12px;">
                ${resetUrl}
              </p>
              <p><strong>This link expires in 10 minutes.</strong></p>
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  warrantyClaimNotification: (artisanName: string, customerName: string, jobDescription: string) => ({
    subject: 'New Warranty Claim - KorrectNG',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF6B35; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .claim-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Warranty Claim</h1>
            </div>
            <div class="content">
              <p>Hi ${artisanName},</p>
              <p>A customer has submitted a warranty claim for work you performed:</p>
              <div class="claim-box">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Job:</strong> ${jobDescription}</p>
              </div>
              <p>Please log in to your KorrectNG dashboard to view the full details and respond to this claim.</p>
              <p>Responding promptly helps maintain your reputation and customer trust.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  welcome: (name: string, role: 'customer' | 'artisan') => ({
    subject: 'Welcome to KorrectNG - Nigeria\'s Trusted Artisan Marketplace',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #008751; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .feature { background: white; border-radius: 8px; padding: 15px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to KorrectNG!</h1>
              <p>Nigeria's Trusted Artisan Marketplace</p>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Welcome to KorrectNG! We're excited to have you join our community of ${role === 'artisan' ? 'skilled professionals' : 'valued customers'}.</p>

              ${role === 'customer' ? `
              <h3>What You Can Do:</h3>
              <div class="feature">
                <strong>Find Verified Artisans</strong><br>
                Search for trusted mechanics, electricians, plumbers, and more in your area.
              </div>
              <div class="feature">
                <strong>Read Real Reviews</strong><br>
                Make informed decisions based on genuine customer feedback.
              </div>
              <div class="feature">
                <strong>Escrow Payment Protection</strong><br>
                Pay through the platform for escrow protection and a 7-day issue resolution window.
              </div>
              ` : `
              <h3>Getting Started as an Artisan:</h3>
              <div class="feature">
                <strong>1. Complete Your Profile</strong><br>
                Add your business details, services, and work photos.
              </div>
              <div class="feature">
                <strong>2. Get Verified</strong><br>
                Submit your documents for verification to build trust with customers.
              </div>
              <div class="feature">
                <strong>3. Start Receiving Jobs</strong><br>
                Once verified, customers can find and contact you for work.
              </div>
              `}

              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}" class="button" style="color: white;">Go to Dashboard</a>
              </p>

              <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
              <p>Lagos, Nigeria</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  verificationApproved: (name: string, businessName: string) => ({
    subject: 'Congratulations! Your KorrectNG Verification is Approved',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #008751; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .success-badge { background: #10B981; color: white; padding: 10px 20px; border-radius: 50px; display: inline-block; font-weight: bold; }
            .next-step { background: white; border-left: 4px solid #008751; padding: 15px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verification Approved!</h1>
              <span class="success-badge">VERIFIED</span>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Great news! <strong>${businessName}</strong> has been successfully verified on KorrectNG.</p>

              <p>You now have access to:</p>
              <div class="next-step">
                <strong>Verified Badge</strong> - Your profile now displays the trusted verification badge
              </div>
              <div class="next-step">
                <strong>Priority Listing</strong> - Appear higher in search results
              </div>
              <div class="next-step">
                <strong>Customer Trust</strong> - Customers are more likely to contact verified artisans
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Ensure your subscription is active to appear in search results</li>
                <li>Add photos of your work to attract more customers</li>
                <li>Respond promptly to customer inquiries</li>
              </ol>

              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard" class="button" style="color: white;">View Your Profile</a>
              </p>

              <p>Welcome to the KorrectNG family of verified professionals!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  verificationRejected: (name: string, reason: string) => ({
    subject: 'KorrectNG Verification Update - Action Required',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #EF4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .reason-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verification Not Approved</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Unfortunately, we were unable to approve your verification application at this time.</p>

              <div class="reason-box">
                <strong>Reason:</strong>
                <p>${reason}</p>
              </div>

              <p><strong>What You Can Do:</strong></p>
              <ol>
                <li>Review the reason above carefully</li>
                <li>Prepare the correct documents</li>
                <li>Resubmit your application</li>
              </ol>

              <p>Common issues include:</p>
              <ul>
                <li>Blurry or unreadable document photos</li>
                <li>Expired identification documents</li>
                <li>Mismatched information between documents</li>
                <li>Missing required credentials</li>
              </ul>

              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/verification" class="button" style="color: white;">Resubmit Application</a>
              </p>

              <p>If you believe this was a mistake or need assistance, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  newReviewNotification: (artisanName: string, customerName: string, rating: number, reviewText: string) => ({
    subject: `New ${rating}-Star Review on KorrectNG`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${rating >= 4 ? '#008751' : rating >= 3 ? '#F59E0B' : '#EF4444'}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .stars { font-size: 24px; color: #F59E0B; }
            .review-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${rating >= 4 ? '#008751' : rating >= 3 ? '#F59E0B' : '#EF4444'}; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Review Received!</h1>
              <div class="stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
            </div>
            <div class="content">
              <p>Hi ${artisanName},</p>
              <p>You've received a new review from a customer!</p>

              <div class="review-box">
                <p><strong>From:</strong> ${customerName}</p>
                <p><strong>Rating:</strong> ${rating}/5 stars</p>
                <p><strong>Review:</strong></p>
                <p style="font-style: italic;">"${reviewText}"</p>
              </div>

              ${rating >= 4 ? `
              <p>Great job! Positive reviews help you attract more customers and build your reputation on KorrectNG.</p>
              ` : `
              <p>We encourage you to respond professionally to this feedback. You can reply to the review from your dashboard.</p>
              `}

              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/reviews" class="button" style="color: white;">View & Respond</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  subscriptionReminder: (name: string, daysLeft: number, renewalUrl: string) => ({
    subject: `Your KorrectNG Subscription Expires in ${daysLeft} Days`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #F59E0B; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .warning-box { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .days-left { font-size: 48px; font-weight: bold; color: #F59E0B; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Expiring Soon</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>

              <div class="warning-box">
                <p class="days-left">${daysLeft}</p>
                <p>days until your subscription expires</p>
              </div>

              <p>Your KorrectNG subscription is about to expire. To continue appearing in search results and receiving customer inquiries, please renew your subscription.</p>

              <p><strong>What happens when your subscription expires:</strong></p>
              <ul>
                <li>Your profile will be hidden from search results</li>
                <li>Customers won't be able to find or contact you</li>
                <li>Your reviews and ratings will be preserved</li>
              </ul>

              <p style="text-align: center;">
                <a href="${renewalUrl}" class="button" style="color: white;">Renew Subscription - ₦5,000/month</a>
              </p>

              <p>Thank you for being part of the KorrectNG community!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  // Booking-related email templates
  newBookingRequest: (artisanName: string, customerName: string, jobType: string, description: string, location: string) => ({
    subject: 'New Booking Request on KorrectNG',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #008751; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Booking Request!</h1>
            </div>
            <div class="content">
              <p>Hi ${artisanName},</p>
              <p>Great news! You have a new booking request from a customer.</p>
              <div class="booking-box">
                <p><strong>Customer:</strong> ${customerName}</p>
                <p><strong>Service:</strong> ${jobType}</p>
                <p><strong>Description:</strong> ${description}</p>
                <p><strong>Location:</strong> ${location}</p>
              </div>
              <p>Please review and send a quote to the customer as soon as possible. Quick responses help you win more jobs!</p>
              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/artisan/bookings" class="button" style="color: white;">View & Send Quote</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  quoteReceived: (customerName: string, artisanName: string, businessName: string, jobType: string, quotedPrice: number, quoteMessage?: string) => ({
    subject: `Quote Received from ${businessName} - KorrectNG`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .quote-box { background: #EFF6FF; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .price { font-size: 32px; font-weight: bold; color: #1E40AF; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            .button-outline { display: inline-block; background-color: white; color: #6B7280; border: 2px solid #D1D5DB; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Quote Received!</h1>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p><strong>${businessName}</strong> has sent you a quote for your ${jobType} request.</p>
              <div class="quote-box">
                <p style="margin: 0; color: #6B7280;">Quoted Price</p>
                <p class="price">₦${quotedPrice.toLocaleString()}</p>
                ${quoteMessage ? `<p style="color: #374151; margin-top: 15px;">"${quoteMessage}"</p>` : ''}
              </div>
              <p>Review the quote and decide if you'd like to proceed. If you accept, you'll be directed to make a secure escrow payment.</p>
              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/customer/bookings" class="button" style="color: white;">View Booking</a>
              </p>
              <p style="color: #6B7280; font-size: 14px; text-align: center;">Your payment is protected by KorrectNG's escrow system</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  quoteAccepted: (artisanName: string, customerName: string, jobType: string, quotedPrice: number) => ({
    subject: 'Your Quote Was Accepted! - KorrectNG',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-box { background: #D1FAE5; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Quote Accepted!</h1>
            </div>
            <div class="content">
              <p>Hi ${artisanName},</p>
              <div class="success-box">
                <p style="font-size: 18px; margin: 0;">🎉 Great news!</p>
                <p><strong>${customerName}</strong> has accepted your quote of <strong>₦${quotedPrice.toLocaleString()}</strong> for ${jobType}.</p>
              </div>
              <p>The customer will now proceed to make the escrow payment. Once payment is confirmed, you'll be notified to begin the job.</p>
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Wait for payment confirmation</li>
                <li>Contact the customer to schedule the work</li>
                <li>Complete the job</li>
                <li>Mark as complete to receive payment</li>
              </ol>
              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/artisan/bookings" class="button" style="color: white;">View Booking</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  quoteDeclined: (artisanName: string, customerName: string, jobType: string) => ({
    subject: 'Quote Declined - KorrectNG',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6B7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Quote Declined</h1>
            </div>
            <div class="content">
              <p>Hi ${artisanName},</p>
              <div class="info-box">
                <p><strong>${customerName}</strong> has declined your quote for the ${jobType} job.</p>
              </div>
              <p>Don't be discouraged! There could be many reasons a customer declines a quote. Keep providing excellent service and competitive pricing to win more jobs.</p>
              <p><strong>Tips for winning more jobs:</strong></p>
              <ul>
                <li>Respond quickly to booking requests</li>
                <li>Provide detailed and fair quotes</li>
                <li>Maintain a strong profile with work photos</li>
                <li>Build your reputation through great reviews</li>
              </ul>
              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/artisan" class="button" style="color: white;">View Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  paymentReceived: (artisanName: string, customerName: string, jobType: string, amount: number) => ({
    subject: 'Payment Received - Ready to Start Job! - KorrectNG',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .payment-box { background: #D1FAE5; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .amount { font-size: 28px; font-weight: bold; color: #047857; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Received!</h1>
            </div>
            <div class="content">
              <p>Hi ${artisanName},</p>
              <div class="payment-box">
                <p style="margin: 0;">💰 Escrow Payment Secured</p>
                <p class="amount">₦${amount.toLocaleString()}</p>
                <p style="color: #047857; margin: 0;">From: ${customerName}</p>
              </div>
              <p>The customer has made the escrow payment for the <strong>${jobType}</strong> job. You can now proceed with the work!</p>
              <p><strong>Important:</strong></p>
              <ul>
                <li>Contact the customer to schedule the job</li>
                <li>Complete the work to the customer's satisfaction</li>
                <li>Mark the job as complete when done</li>
                <li>Payment will be released after customer confirms</li>
              </ul>
              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/artisan/bookings" class="button" style="color: white;">Start Job</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  jobCompleted: (customerName: string, artisanName: string, businessName: string, jobType: string) => ({
    subject: `${businessName} Has Completed Your Job - Please Review`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .completion-box { background: #EDE9FE; border: 2px solid #8B5CF6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Job Marked Complete!</h1>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <div class="completion-box">
                <p style="font-size: 18px; margin: 0;">✅ Work Completed</p>
                <p><strong>${businessName}</strong> has marked your <strong>${jobType}</strong> job as complete.</p>
              </div>
              <p><strong>Please review the work and certify completion.</strong></p>
              <p>Once you certify that you're satisfied with the job, the payment will be released to the artisan.</p>
              <p style="background: #FEF3C7; border-radius: 8px; padding: 15px; font-size: 14px;">
                <strong>Note:</strong> If you have any issues with the work, please raise them within 7 days through the platform. We're here to help resolve any disputes.
              </p>
              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/customer/bookings" class="button" style="color: white;">Review & Certify</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  jobCertified: (artisanName: string, customerName: string, jobType: string, amount: number) => ({
    subject: 'Job Certified - Payment Released! - KorrectNG',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-box { background: #D1FAE5; border: 2px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .amount { font-size: 28px; font-weight: bold; color: #047857; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Payment Released!</h1>
            </div>
            <div class="content">
              <p>Hi ${artisanName},</p>
              <div class="success-box">
                <p style="margin: 0;">Job Successfully Completed</p>
                <p class="amount">₦${amount.toLocaleString()}</p>
                <p style="color: #047857; margin: 0;">Payment released to your account</p>
              </div>
              <p><strong>${customerName}</strong> has certified that your <strong>${jobType}</strong> job is complete.</p>
              <p>The payment has been released and will be available in your account shortly (minus the platform fee).</p>
              <p>Thank you for delivering excellent work! Keep up the great service to build your reputation on KorrectNG.</p>
              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/dashboard/artisan" class="button" style="color: white;">View Earnings</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),

  bookingCancelled: (recipientName: string, cancelledBy: 'customer' | 'artisan' | 'system', jobType: string, reason?: string) => ({
    subject: 'Booking Cancelled - KorrectNG',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6B7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
            .cancel-box { background: #F3F4F6; border: 1px solid #D1D5DB; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background-color: #008751; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${recipientName},</p>
              <div class="cancel-box">
                <p>The <strong>${jobType}</strong> booking has been cancelled${cancelledBy === 'system' ? ' due to inactivity' : ` by the ${cancelledBy}`}.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>
              ${cancelledBy === 'system' ? `
              <p>Bookings are automatically cancelled when there is no activity within the specified time period. This helps keep the platform active and responsive.</p>
              ` : ''}
              <p>If you still need this service, you can create a new booking at any time.</p>
              <p style="text-align: center;">
                <a href="${process.env.CLIENT_URL}/search" class="button" style="color: white;">Find Artisans</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} KorrectNG. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};
