# KorrectNG Survival Strategy
> How to Avoid the Fate of Failed Nigerian Service Marketplaces

## The Core Problem Other Platforms Faced

Most Nigerian artisan marketplaces died because of **one fundamental issue**:

> **Artisans and customers had no reason to stay on the platform after first contact.**

Once a customer got an artisan's phone number, they called directly. The platform became a "one-time directory" with zero retention.

---

## The 7 Pillars of Platform Survival

### 1. TRANSACTION LOCK-IN (Most Critical)

**What failed platforms did:** Lead generation only - gave out contact info, hoped for the best.

**What KorrectNG must do:**

| Strategy | Implementation |
|----------|----------------|
| **Escrow Payments** | Customer pays to platform, artisan receives after job completion |
| **Milestone Payments** | Large jobs paid in stages (30% upfront, 40% midway, 30% completion) |
| **Platform Invoicing** | All quotes and invoices go through the platform |
| **Warranty Tied to Platform** | 30-day warranty ONLY valid if paid through platform |

**Code Changes Needed:**
```
- Add Job/Booking model with payment milestones
- Integrate Paystack escrow (if available) or build manual release
- Add job completion confirmation flow
- Link warranty claims to platform transactions only
```

**Why This Works:** Artisans can't bypass the platform because:
- Customers won't pay cash (they lose warranty protection)
- Artisans want to get paid (money is held by platform)
- Both parties need the platform for dispute resolution

---

### 2. REPUTATION PORTABILITY LOCK

**The Problem:** Artisans build reputation, then leave to start their own business.

**Solution: Make reputation non-portable**

| Strategy | Details |
|----------|---------|
| **Verified Badge** | "KorrectNG Verified" badge only shows on platform |
| **Review History** | Reviews don't transfer - starting fresh elsewhere means 0 reviews |
| **Trust Score** | Cumulative score that takes years to build |
| **Job Count** | "500+ jobs completed on KorrectNG" is platform-specific |

**Psychological Lock-in:** An artisan with 200 reviews and 4.8 stars won't leave because they'd have to start from scratch.

---

### 3. RECURRING VALUE CREATION

**Why Artisans Stay:**

| Feature | Value to Artisan |
|---------|------------------|
| **Steady Lead Flow** | Platform does marketing, artisan gets customers |
| **Payment Protection** | No more customers who refuse to pay |
| **Professional Tools** | Invoice generation, job tracking, customer management |
| **Business Insights** | Analytics on their performance, peak times, etc. |
| **Training & Certification** | Skills upgrades, new certifications |

**Why Customers Stay:**

| Feature | Value to Customer |
|---------|-------------------|
| **Quality Guarantee** | Verified artisans, warranty protection |
| **Price Transparency** | Know market rates, avoid overcharging |
| **Convenience** | One app for all service needs |
| **History Tracking** | Record of all jobs, receipts, warranties |
| **Rebooking** | Easy to rebook trusted artisans |

---

### 4. ANTI-BYPASS MECHANISMS

**Technical Measures:**

```
1. Phone Number Masking
   - Show masked number: 080-XXX-XXXX
   - Full number only revealed after booking confirmed
   - Or use Twilio-style call forwarding

2. In-App Communication
   - All messaging happens in-app
   - WhatsApp links only work for active bookings
   - Communication history is valuable for disputes

3. Smart Fraud Detection
   - Flag artisans who get contacted but no bookings
   - Detect patterns: same customer contacting multiple artisans
   - Warn about off-platform transactions
```

**Policy Measures:**

```
1. Off-Platform Transaction Penalties
   - First offense: Warning
   - Second offense: Profile demotion
   - Third offense: Account suspension

2. Incentivize On-Platform
   - Lower commission for high-volume artisans
   - Featured placement for compliant artisans
   - Bonus for milestone achievements
```

---

### 5. COMMUNITY & NETWORK EFFECTS

**Build Switching Costs Through Community:**

| Initiative | Purpose |
|------------|---------|
| **Artisan Leaderboards** | Monthly top performers, creates competition |
| **Customer Loyalty Program** | Points for platform bookings, redeemable for discounts |
| **Referral Bonuses** | Both referrer and referee get rewards |
| **Artisan Groups** | Trade-specific communities (Mechanics Guild, etc.) |
| **Success Stories** | Showcase artisans who grew through platform |

**Network Effect:** The more artisans, the more customers. The more customers, the more artisans want to join.

---

### 6. OPERATIONAL EXCELLENCE

**Why Most Startups Actually Die:**

| Issue | KorrectNG Prevention |
|-------|---------------------|
| **Burn Rate** | Stay lean, revenue from Day 1 (verification fees) |
| **Premature Scaling** | Start Lagos only, prove model, then expand |
| **Feature Creep** | Ship MVP, iterate based on user feedback |
| **Poor Unit Economics** | Know your CAC and LTV, adjust pricing accordingly |
| **Founder Burnout** | Build sustainable pace, automate operations |

**Key Metrics to Track Weekly:**

```
1. Artisan Metrics
   - New sign-ups
   - Verification completion rate
   - Active artisans (logged in last 7 days)
   - Churn rate

2. Customer Metrics
   - New registrations
   - Search to contact rate
   - Repeat booking rate
   - NPS score

3. Financial Metrics
   - Revenue (verification fees + subscriptions)
   - Cost per acquisition
   - Lifetime value
   - Runway (months of cash left)

4. Platform Health
   - Average response time
   - Review submission rate
   - Dispute rate
   - Platform bypass attempts
```

---

### 7. TRUST INFRASTRUCTURE

**Nigeria-Specific Trust Building:**

| Challenge | Solution |
|-----------|----------|
| **"Is this legit?"** | Partner with recognized brands (banks, telcos, estates) |
| **"Will I get scammed?"** | Escrow payments, visible insurance/guarantee |
| **"Are artisans real?"** | Video verification, workplace photos, ID verification |
| **"What if there's a problem?"** | Visible customer support, quick dispute resolution |

**Trust Signals to Implement:**

```
1. Verification Badges
   - ID Verified (NIN/BVN checked)
   - Skills Verified (trade credentials)
   - Background Checked (criminal record clear)

2. Social Proof
   - "Trusted by 10,000+ Lagos residents"
   - Real customer testimonials with photos
   - Media mentions (if any)

3. Guarantees
   - "100% Money Back if Not Satisfied"
   - "30-Day Warranty on All Jobs"
   - "24/7 Customer Support"

4. Transparency
   - Show how verification works
   - Publish dispute resolution stats
   - Be open about pricing/commissions
```

---

## Implementation Priority

### Phase 1: Launch Essentials (Before Launch)
- [ ] Basic escrow/payment flow
- [ ] Phone number masking
- [ ] In-app messaging
- [ ] Warranty tied to platform payments
- [ ] Basic analytics dashboard

### Phase 2: Retention Features (Month 1-3)
- [ ] Loyalty points system
- [ ] Referral program
- [ ] Artisan performance dashboard
- [ ] Customer rebooking flow
- [ ] Push notifications for engagement

### Phase 3: Lock-in Deepening (Month 3-6)
- [ ] Milestone payments for large jobs
- [ ] Artisan leaderboards
- [ ] Training/certification program
- [ ] Business tools (invoicing, scheduling)
- [ ] Customer subscription (priority access)

### Phase 4: Scale Preparation (Month 6-12)
- [ ] Automated fraud detection
- [ ] Multi-city expansion toolkit
- [ ] API for partners
- [ ] Enterprise/B2B offering
- [ ] Financial services (loans for artisans)

---

## The Golden Rule

> **Every feature you build should answer: "Does this make it harder to bypass the platform?"**

If the answer is no, deprioritize it. Focus relentlessly on transaction lock-in and value creation.

---

## Competitive Moat Checklist

Rate yourself honestly (1-5) on each:

| Moat | Score | Notes |
|------|-------|-------|
| Network Effects | _ | More users = more value for everyone |
| Switching Costs | _ | How painful is it to leave? |
| Brand Recognition | _ | Are you the "default" choice? |
| Data Advantage | _ | Do you know things competitors don't? |
| Operational Excellence | _ | Can you do it cheaper/faster? |
| Regulatory/Legal | _ | Any licenses or compliance advantages? |

**Goal:** Score at least 4 on Network Effects and Switching Costs before scaling.

---

## Warning Signs to Watch For

**Red Flags That Preceded Other Platform Deaths:**

1. High artisan sign-up, low transaction volume
2. Customers contacting artisans but no bookings
3. Artisans not renewing subscriptions
4. Declining repeat customer rate
5. Increasing customer complaints about quality
6. Burn rate exceeding revenue growth
7. Team focusing on features instead of core metrics

**If you see these, STOP and diagnose before continuing.**

---

## Final Thought

The platforms that died in Nigeria weren't killed by competition or bad luck. They died because:

1. They couldn't stop disintermediation (bypass)
2. They didn't create enough value to justify their existence
3. They scaled before proving unit economics

**KorrectNG's survival depends on being genuinely indispensable to both artisans and customers.** Not just at first contact, but for every subsequent interaction.

Build for retention, not just acquisition.
