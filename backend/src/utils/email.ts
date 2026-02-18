import nodemailer from 'nodemailer';
import { log } from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter based on environment
const createTransporter = () => {
  // For production, use your SMTP service (SendGrid, Mailgun, AWS SES, etc.)
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // For development, use Ethereal (fake SMTP)
  // Or use mailtrap.io for testing
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"KorrectNG" <${process.env.EMAIL_FROM || 'noreply@korrectng.com'}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ''),
  };

  try {
    console.log('Attempting to send email to:', options.to);
    console.log('SMTP config:', { host: process.env.SMTP_HOST, port: process.env.SMTP_PORT, user: process.env.SMTP_USER });
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully! Message ID:', info.messageId);
    log.info('Email sent', { messageId: info.messageId, to: options.to });

    // For Ethereal, log preview URL
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        log.debug('Email preview URL', { url: previewUrl });
      }
    }
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
                <strong>30-Day Warranty</strong><br>
                All jobs booked through KorrectNG come with warranty protection.
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
};
