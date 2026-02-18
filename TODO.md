# KorrectNG - Implementation Todo List
> Last Updated: February 9, 2026

## Priority Legend
- **P0** = Critical (Must have before launch)
- **P1** = Important (Should have for good UX)
- **P2** = Nice to have (Can add post-launch)

---

## Phase 1: Production Infrastructure (P0)

### 1.1 Testing Setup
- [ ] Set up Jest for backend unit tests
- [ ] Create test utilities and mocks (database, auth)
- [ ] Write tests for auth routes (register, login, password reset)
- [ ] Write tests for artisan routes (CRUD, search)
- [ ] Write tests for review routes
- [ ] Write tests for payment/webhook handlers
- [ ] Write tests for verification workflow
- [ ] Set up React Testing Library for web
- [ ] Write tests for critical web components
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add test coverage reporting

### 1.2 Error Monitoring & Logging
- [ ] Install and configure Sentry for backend
- [ ] Install and configure Sentry for web (Next.js)
- [ ] Install and configure Sentry for mobile (Expo)
- [ ] Replace console.log with structured logger (Winston/Pino)
- [ ] Add request ID tracking for debugging
- [ ] Set up log aggregation (optional: Logtail, Papertrail)

### 1.3 Email Service (Production-Ready)
- [ ] Set up SendGrid or Mailgun account
- [ ] Create email templates (HTML):
  - [ ] Welcome email
  - [ ] Email verification
  - [ ] Password reset
  - [ ] Verification approved
  - [ ] Verification rejected
  - [ ] New review notification
  - [ ] Warranty claim notification
- [ ] Test email delivery in staging
- [ ] Set up email analytics/tracking

### 1.4 Security & SSL
- [ ] Set up SSL certificates (Let's Encrypt or Cloudflare)
- [ ] Configure HTTPS redirect
- [ ] Review and harden CORS settings
- [ ] Add rate limiting per endpoint (not just global)
- [ ] Implement CSRF protection
- [ ] Add security headers review
- [ ] Set up WAF (optional: Cloudflare)

---

## Phase 2: ID Verification Integration (P0)

### 2.1 Choose and Implement Provider
- [ ] Compare providers: Smile Identity vs Dojah vs Prembly vs Youverify
- [ ] Sign up for chosen provider (sandbox)
- [ ] Implement NIN verification
- [ ] Implement BVN verification (if needed)
- [ ] Implement Driver's License verification
- [ ] Add selfie/liveness check (optional)
- [ ] Test verification flow end-to-end
- [ ] Set up production API keys
- [ ] Add verification cost tracking

---

## Phase 3: Notifications System (P1)

### 3.1 Push Notifications
- [ ] Set up Firebase Cloud Messaging (FCM)
- [ ] Implement push notification service in backend
- [ ] Add device token storage to User model
- [ ] Notifications to implement:
  - [ ] New booking/inquiry
  - [ ] Review received
  - [ ] Verification status update
  - [ ] Warranty claim update
  - [ ] Subscription reminder
- [ ] Integrate with mobile app (Expo notifications)
- [ ] Integrate with web (Web Push API)

### 3.2 SMS Notifications
- [ ] Set up Termii or Africa's Talking account
- [ ] Implement SMS service in backend
- [ ] SMS notifications to implement:
  - [ ] OTP for phone verification
  - [ ] New booking alert for artisans
  - [ ] Verification approved
- [ ] Add SMS opt-in/opt-out settings

---

## Phase 4: Mobile App Completion (P0)

### 4.1 Missing Screens
- [ ] Home screen with search and featured artisans
- [ ] Search results screen with filters
- [ ] Artisan profile detail screen
- [ ] Reviews list screen
- [ ] Write review screen
- [ ] Bookmarks/saved artisans screen
- [ ] User profile/settings screen
- [ ] Artisan dashboard (for artisan users)
- [ ] Verification application flow screens
- [ ] Warranty claim screens

### 4.2 Mobile Features
- [ ] Pull-to-refresh on lists
- [ ] Infinite scroll/pagination
- [ ] Image gallery viewer
- [ ] Share artisan profile
- [ ] Deep linking support
- [ ] Offline state handling
- [ ] Loading skeletons (partially done)
- [ ] Error boundaries

### 4.3 Mobile Polish
- [ ] App icon and splash screen
- [ ] Onboarding screens (first launch)
- [ ] Empty states for all lists
- [ ] Haptic feedback
- [ ] Animations/transitions
- [ ] Dark mode support (optional)

---

## Phase 5: Communication Features (P1)

### 5.1 In-App Messaging
- [ ] Design message data model
- [ ] Create Message model in MongoDB
- [ ] Implement messaging API endpoints
- [ ] Build chat UI for web
- [ ] Build chat UI for mobile
- [ ] Add real-time updates (Socket.io or polling)
- [ ] Message notifications
- [ ] Conversation list screen

### 5.2 WhatsApp Integration Enhancement
- [ ] Add WhatsApp Business API (optional)
- [ ] Track WhatsApp click-throughs
- [ ] Pre-filled message templates

---

## Phase 6: Legal & Compliance (P0)

### 6.1 Legal Pages
- [ ] Write Terms of Service
- [ ] Write Privacy Policy
- [ ] Write Artisan Agreement/Terms
- [ ] Write Warranty Policy details
- [ ] Write Refund/Dispute Policy
- [ ] Add cookie consent banner
- [ ] NDPR (Nigeria Data Protection) compliance review

### 6.2 Content
- [ ] FAQ page
- [ ] How it works page
- [ ] About us page
- [ ] Contact page with form
- [ ] Blog setup (optional)

---

## Phase 7: Analytics & Monitoring (P1)

### 7.1 User Analytics
- [ ] Set up Google Analytics 4
- [ ] Set up Mixpanel or Amplitude (optional)
- [ ] Track key events:
  - [ ] Sign up completed
  - [ ] Artisan search
  - [ ] Artisan profile view
  - [ ] WhatsApp click
  - [ ] Review submitted
  - [ ] Verification started
  - [ ] Payment completed
- [ ] Set up conversion funnels

### 7.2 Business Metrics Dashboard
- [ ] Enhance admin dashboard with:
  - [ ] Daily/weekly/monthly active users
  - [ ] Artisan sign-up funnel
  - [ ] Verification completion rate
  - [ ] Revenue charts
  - [ ] Top searched trades/locations
  - [ ] Customer satisfaction metrics

---

## Phase 8: Payment & Monetization (P1)

### 8.1 Payment Enhancements
- [ ] Add payment retry logic
- [ ] Implement subscription grace period
- [ ] Add invoice generation (PDF)
- [ ] Receipt emails after payment
- [ ] Payment history page for users
- [ ] Refund handling workflow

### 8.2 Future Monetization (P2)
- [ ] Featured listing/boost for artisans
- [ ] Premium badges
- [ ] Commission on bookings (if adding booking flow)

---

## Phase 9: Additional Features (P2)

### 9.1 Booking System
- [ ] Add booking/appointment model
- [ ] Artisan availability calendar
- [ ] Booking request flow
- [ ] Booking confirmation
- [ ] Booking history

### 9.2 Dispute Resolution
- [ ] Enhance warranty claim workflow
- [ ] Add admin mediation tools
- [ ] Dispute escalation process
- [ ] Resolution documentation

### 9.3 Growth Features
- [ ] Referral system (customer refers customer)
- [ ] Artisan referral program
- [ ] Social sharing incentives
- [ ] Review incentives

### 9.4 Localization
- [ ] Multi-language support infrastructure
- [ ] Yoruba translation
- [ ] Hausa translation
- [ ] Igbo translation

---

## Phase 10: DevOps & Deployment (P0)

### 10.1 Deployment Setup
- [ ] Choose hosting (Railway, Render, DigitalOcean, AWS)
- [ ] Set up staging environment
- [ ] Set up production environment
- [ ] Configure environment variables
- [ ] Set up MongoDB Atlas (production)
- [ ] Configure Cloudinary (production)
- [ ] Configure Paystack (live keys)
- [ ] Domain setup and DNS
- [ ] Set up CDN for static assets

### 10.2 CI/CD
- [ ] GitHub Actions for backend tests
- [ ] GitHub Actions for web build
- [ ] Automated deployment on merge to main
- [ ] Database migration strategy
- [ ] Rollback procedures

### 10.3 Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Better Uptime)
- [ ] Database monitoring
- [ ] API response time monitoring
- [ ] Alert notifications (Slack, email)

---

## Immediate Next Steps (Start Here)

1. **Testing Setup** - Most critical, start with backend tests
2. **Error Monitoring** - Sentry setup is quick, high value
3. **Email Templates** - Need for user communication
4. **Mobile Screens** - Parallel track for mobile dev
5. **Legal Pages** - Can be written while coding continues

---

## Notes

- Focus on P0 items first
- Mobile app needs significant work
- Can launch web-only MVP first if mobile takes too long
- Consider soft launch to test with real users before full marketing push
