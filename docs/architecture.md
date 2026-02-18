# KorrectNG Microservices Architecture

## Overview

KorrectNG is being migrated from a monolithic Express.js backend to a microservices architecture for better scalability, maintainability, and independent deployment.

## Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │           API Gateway               │
                    │  (Auth, Rate Limiting, Routing)     │
                    │         Port: 5000                  │
                    └──────────────┬──────────────────────┘
                                   │
        ┌──────────┬───────────────┼───────────────┬──────────────┐
        │          │               │               │              │
        ▼          ▼               ▼               ▼              ▼
   ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐
   │  Users  │ │ Artisan │ │Transaction│ │Messaging │ │ Platform │
   │ Service │ │ Service │ │  Service  │ │ Service  │ │ Service  │
   │  :3001  │ │  :3002  │ │   :3003   │ │  :3004   │ │  :3005   │
   └────┬────┘ └────┬────┘ └─────┬─────┘ └────┬─────┘ └────┬─────┘
        │          │             │            │            │
        └──────────┴─────────────┼────────────┴────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │     Redis (Events)      │
                    │        :6379            │
                    └─────────────────────────┘
```

## Services

### API Gateway (Port 5000)
- **Purpose**: Single entry point for all API requests
- **Responsibilities**:
  - JWT validation and token refresh
  - Rate limiting
  - Request routing to microservices
  - Correlation ID injection
  - CORS handling

### Users Service (Port 3001)
- **Database**: `korrect_users`
- **Models**: User, PushToken
- **Routes**: `/api/v1/auth`, `/api/v1/account`, `/api/v1/push-tokens`
- **Events Published**: `user.created`, `user.updated`, `user.deleted`, `user.email_verified`

### Artisan Service (Port 3002)
- **Database**: `korrect_artisans`
- **Models**: ArtisanProfile, Review, VerificationApplication, Subscription, WarrantyClaim
- **Routes**: `/api/v1/artisans`, `/api/v1/reviews`, `/api/v1/verification`, `/api/v1/warranty`
- **External Services**: Cloudinary, Groq AI, Paystack (subscriptions)

### Transaction Service (Port 3003)
- **Database**: `korrect_transactions`
- **Models**: Booking, JobContract, EscrowPayment, Dispute
- **Routes**: `/api/v1/bookings`, `/api/v1/contracts`, `/api/v1/escrow`, `/api/v1/disputes`, `/api/v1/payments`
- **External Services**: Paystack (payments, transfers, webhooks)

### Messaging Service (Port 3004)
- **Database**: `korrect_messaging`
- **Models**: Conversation, Message
- **Routes**: `/api/v1/messages`

### Platform Service (Port 3005)
- **Database**: `korrect_platform`
- **Models**: Notification, SearchLog, TermsAcceptance, PriceCatalog, Supplier
- **Routes**: `/api/v1/notifications`, `/api/v1/admin`, `/api/v1/upload`, `/api/v1/legal`, `/api/v1/prices`
- **External Services**: Termii (SMS), Expo (push), Cloudinary

## Shared Packages

| Package | Purpose |
|---------|---------|
| `@korrect/shared` | Types, constants, Zod schemas |
| `@korrect/auth-middleware` | JWT validation, protect/authorize middleware |
| `@korrect/event-bus` | Redis Streams publisher/subscriber |
| `@korrect/service-client` | HTTP clients with circuit breaker |
| `@korrect/logger` | Structured Winston logging |
| `@korrect/health` | Health check endpoints |

## Event-Driven Communication

Services communicate asynchronously via Redis Streams for eventual consistency.

### Key Events

| Event | Producer | Consumers |
|-------|----------|-----------|
| `user.created` | Users | Platform (welcome notification) |
| `user.updated` | Users | Artisan (profile sync) |
| `user.deleted` | Users | All services (cleanup) |
| `booking.created` | Transaction | Platform (notification), Artisan (stats) |
| `booking.confirmed` | Transaction | Artisan (trust score), Platform (notification) |
| `review.created` | Artisan | Artisan (recalculate rating) |
| `payment.received` | Transaction | Platform (notification) |
| `escrow.funded` | Transaction | Platform (notification) |
| `dispute.opened` | Transaction | Platform (admin alert) |
| `verification.approved` | Artisan | Platform (notification) |

## Running Locally

### With Docker Compose

```bash
# Start infrastructure (MongoDB + Redis)
npm run docker:up

# Start services individually
npm run dev:gateway
npm run dev:users
# ... other services
```

### Without Docker

Ensure MongoDB and Redis are running locally, then:

```bash
# Build shared packages first
npm run build:packages

# Start services
npm run dev:gateway
npm run dev:users
```

## Health Checks

Each service exposes health endpoints:

- `GET /health` - Basic liveness check
- `GET /health/ready` - Readiness probe (checks dependencies)
- `GET /health/details` - Detailed health information

## Configuration

Environment variables are service-specific. See `docker/.env.example` for the full list.

### Common Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for JWT signing |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL |

## Migration Strategy

The migration follows a strangler fig pattern:

1. Gateway routes to legacy backend by default
2. Services are extracted one at a time
3. Gateway routing is updated to point to new services
4. Once all services are extracted, legacy is decommissioned

During migration, both monolith and microservices run in parallel.
