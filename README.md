# KorrectNG - Verified Artisan Marketplace

Nigeria's leading platform for verified artisans. Find trusted mechanics, electricians, plumbers, and more.

## Architecture

```
korrectNG/
├── shared/          # @korrectng/shared - TypeScript types, constants, Zod schemas
├── backend/         # Node.js/Express + MongoDB API server (port 5000)
├── web/             # Next.js App Router + Tailwind CSS (port 3000)
└── mobile/          # React Native/Expo (iOS + Android)
```

## Quick Start

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- npm

### 1. Install Dependencies

```bash
npm install
```

### 2. Build Shared Package

```bash
npm run build:shared
```

### 3. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI, JWT secret, Paystack keys, etc.

# Web
cp web/.env.example web/.env
```

### 4. Seed the Database

```bash
npm run seed
```

This creates:
- Admin: `admin@korrectng.com` / `Test1234`
- Customer: `john@test.com` / `Test1234`
- Artisan: `emeka@test.com` / `Test1234`
- 15 sample artisans with reviews

### 5. Run Development Servers

```bash
# Terminal 1 - Backend API
npm run dev:backend

# Terminal 2 - Web App
npm run dev:web

# Terminal 3 - Mobile App (requires Expo Go on your phone)
npm run dev:mobile
```

## Features

### For Customers
- Search verified artisans by trade and location
- View artisan profiles with ratings and reviews
- WhatsApp click-to-chat integration
- Bookmark favorite artisans
- Submit warranty claims
- Leave reviews after service

### For Artisans
- Multi-step verification process
- Profile with gallery management
- Respond to reviews
- Subscription management
- View warranty claims

### For Admins
- Dashboard with stats
- Verification queue management
- User management
- Search analytics

## API Endpoints

All endpoints are under `/api/v1`:

- **Auth**: `/auth/register`, `/auth/login`, `/auth/me`, etc.
- **Artisans**: `/artisans`, `/artisans/featured`, `/artisans/:slug`
- **Reviews**: `/reviews/artisan/:id`, `/reviews`
- **Verification**: `/verification/apply`, `/verification/submit`
- **Payments**: `/payments/subscribe`, `/payments/webhook`
- **Warranty**: `/warranty/claim`, `/warranty/my-claims`
- **Admin**: `/admin/dashboard`, `/admin/verifications`

## Tech Stack

- **Backend**: Express.js, Mongoose, JWT, Zod validation
- **Web**: Next.js 14 (App Router), Tailwind CSS, React Context
- **Mobile**: Expo, React Navigation, expo-secure-store
- **Database**: MongoDB with text indexes
- **Payments**: Paystack (verification + subscription)
- **Images**: Cloudinary

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/korrectng
JWT_SECRET=your-secret
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
CLIENT_URL=http://localhost:3000
```

### Web (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Brand Colors

- Primary Green: `#008751`
- Dark Green: `#006B40`
- Orange: `#FF6B35`
- Star Yellow: `#FFA000`

## Pricing

- Verification Fee: ₦10,000 (one-time)
- Monthly Subscription: ₦5,000/month

## License

Private - All rights reserved.
