# KorrectNG - Project Review Notes
> Generated: February 9, 2026

## Project Overview
A **verified artisan marketplace** for Nigeria - connecting customers with trusted mechanics, electricians, plumbers, etc.

**Tech Stack:**
- Backend: Express.js + MongoDB + Paystack
- Web: Next.js 14 + Tailwind CSS
- Mobile: React Native (Expo)
- Shared: TypeScript types package

---

## Current Completion Status: ~70-75%

### What's Working
- Full user authentication with email verification
- Artisan profiles with verification workflow
- Review/rating system with 30-day warranty claims
- Paystack payment integration (verification fees + subscriptions)
- Admin dashboard with analytics
- Search functionality with filters
- Gallery management via Cloudinary

---

## What's Remaining for Production

### Critical (Must Have Before Launch)

| Item | Status | Notes |
|------|--------|-------|
| **Unit/Integration Tests** | Missing | No test files - risky for production |
| **ID Verification APIs** | Placeholder only | 4 TODOs in `idVerification.ts` - falls back to manual |
| **Email Service** | Config only | Need actual SMTP credentials (SendGrid/Mailgun) |
| **Error Monitoring** | Missing | Add Sentry for production error tracking |
| **Logging** | Basic | Need structured logging (Winston/Pino) |
| **Mobile App Polish** | Minimal | Only 7 files in mobile/src - needs more screens |
| **Terms of Service/Privacy Policy** | Missing | Legal requirement |
| **SSL/HTTPS** | Not configured | Required for production |

### Important (Should Have)

| Item | Priority |
|------|----------|
| Push notifications for booking updates | High |
| SMS notifications (for artisans without smartphones) | High |
| In-app chat/messaging | High |
| Dispute resolution workflow | Medium |
| Artisan availability calendar | Medium |
| Invoice/receipt generation | Medium |
| Customer support integration | Medium |
| Analytics (Google Analytics, Mixpanel) | Medium |

### Nice to Have
- Referral system
- Artisan leaderboard/badges
- Service price estimates
- Multiple language support (Yoruba, Hausa, Igbo)
- Offline mode for mobile

---

## Market Analysis - Nigeria

### Why This Can Work
1. **Real Problem**: Artisan dishonesty is massive - overcharging, poor work, disappearing
2. **No Accountability**: Currently people rely on unreliable word-of-mouth
3. **Willingness to Pay**: Middle-class Nigerians will pay premium for trust
4. **Solution Fit**: Verification + Reviews + Warranty = strong differentiator
5. **Tech Adoption**: Growing smartphone penetration supports mobile-first

### Challenges
| Challenge | Mitigation |
|-----------|------------|
| Artisans avoiding platform after first contact | Transaction-based model, not just leads |
| Verification gaming | Periodic re-verification, feedback loops |
| Low smartphone adoption among artisans | SMS/USSD integration, agent-assisted onboarding |
| Getting initial supply | Subsidize verification initially |
| Cash payment culture | Cash-on-completion with platform verification |
| Platform trust | Heavy marketing, testimonials, media coverage |

---

## Why Similar Platforms Failed in Nigeria

> Sources: [TechNext24](https://technext24.com/2025/04/04/tech-startup-failures-in-nigeria/), [BusinessDay](https://businessday.ng/opinion/article/failed-start-ups-and-the-nigerian-business-environment/), [Tracxn - VConnect](https://tracxn.com/d/companies/vconnect/__fe9Css1Cr29gt-GAtm88UZeK3p3rc9QxpJa4Yaaypd4), [TechPoint Africa](https://techpoint.africa/general/vconnect-evolution/)

### Nigerian Startup Failure Statistics
- **61% of Nigerian startups fail within 5 years** - highest in Africa
- **47% of all African startup closures** were Nigerian companies
- **60%+ fail within first 2 years** due to poor leadership
- **42% cited "lack of market need"** as primary failure reason

### 1. VConnect (Pivoted away from artisans - Now Deadpooled)
- **What happened**: Started as artisan/service directory (2010), pivoted to eCommerce, then back to business directory, eventually shut down
- **Why**:
  - Lead generation model didn't work - artisans got contact, did deals offline
  - eCommerce pivot was "too drastic" for existing users
  - Multiple pivots confused the market positioning
- **Lesson**: Need transaction integration, not just leads. Stay focused.

### 2. Findworka (Struggled to scale)
- **What happened**: Couldn't achieve critical mass in multiple cities
- **Why**: High CAC (customer acquisition cost), low retention
- **Lesson**: Start hyper-local, prove model before expanding

### 3. Handyman Nigeria (Operational challenges)
- **What happened**: Quality control issues, couldn't maintain service standards
- **Why**: Relied on employed handymen (high overhead) vs marketplace model
- **Lesson**: Marketplace with verification > employment model

### 4. General Patterns of Failure (Research-backed):

| Failure Reason | % of Startups | How KorrectNG Avoids |
|----------------|---------------|---------------------|
| No market need | 42% | Real pain point - artisan trust is acute |
| Funding/runway issues | #1 cause | Lean model, revenue from day 1 (verification fees) |
| Poor financial management | Common | Subscription model = predictable revenue |
| Infrastructure (power, internet) | High impact | Cloud-hosted, mobile-first approach |
| Failed product-market fit after expansion | Growing trend | Start Lagos only, prove then expand |
| Poor leadership | 60%+ | Focus on execution, not features |

### 5. Nigeria-Specific Challenges:
- **Power supply**: Unpredictable, forces generator costs
- **Internet penetration**: Still limited outside urban areas
- **High data costs**: Affects user adoption
- **Regulatory uncertainty**: Sudden policy changes
- **Cash-first culture**: Resistance to digital payments

### How KorrectNG Can Avoid These Pitfalls:
1. **Verification fee creates commitment** - artisans invested in platform
2. **Monthly subscription** - recurring revenue, artisan stays engaged
3. **Warranty system** - customers have reason to stay on platform
4. **Review system** - builds long-term reputation (artisans won't abandon)
5. **Start in ONE city** - prove model before expanding

---

## Recommended Launch Strategy

1. **Phase 1**: Lagos only, 2-3 trades (mechanics + electricians + plumbers)
2. **Phase 2**: Subsidize first 100 artisan verifications
3. **Phase 3**: Aggressive social media marketing with success stories
4. **Phase 4**: Partner with estate associations
5. **Phase 5**: Expand to Abuja after Lagos proves profitable

---

## Notes
- Project has solid foundation
- Core functionality complete
- Focus now on production-readiness and polish
- Mobile app needs significant work
- Testing is critical before launch
