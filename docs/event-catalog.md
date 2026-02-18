# KorrectNG Event Catalog

This document catalogs all events in the KorrectNG microservices architecture.

## Event Format

All events follow this structure:

```typescript
interface Event<T> {
  id: string;           // Unique event ID (UUID)
  type: string;         // Event type (e.g., "user.created")
  payload: T;           // Event-specific data
  timestamp: string;    // ISO 8601 timestamp
  source: string;       // Service that produced the event
  correlationId?: string; // For request tracing
  metadata?: Record<string, unknown>;
}
```

## Event Types

### User Events

#### `user.created`
Published when a new user registers.

**Producer**: Users Service

**Payload**:
```typescript
{
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'artisan' | 'admin';
}
```

**Consumers**:
- Platform Service: Send welcome notification

---

#### `user.updated`
Published when user profile is updated.

**Producer**: Users Service

**Payload**:
```typescript
{
  userId: string;
  changes: string[]; // Field names that changed
}
```

**Consumers**:
- Artisan Service: Sync profile changes

---

#### `user.deleted`
Published when user permanently deletes their account.

**Producer**: Users Service

**Payload**:
```typescript
{
  userId: string;
  email: string;
}
```

**Consumers**:
- All Services: Clean up user-related data

---

#### `user.email_verified`
Published when user verifies their email.

**Producer**: Users Service

**Payload**:
```typescript
{
  userId: string;
  email: string;
}
```

**Consumers**:
- Platform Service: Update verification status notifications

---

### Booking Events

#### `booking.created`
Published when a new booking is created.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  bookingId: string;
  customerId: string;
  artisanId: string;
  artisanProfileId: string;
  service: string;
  status: string;
}
```

**Consumers**:
- Platform Service: Send notification to artisan
- Artisan Service: Update booking count

---

#### `booking.confirmed`
Published when booking is confirmed/completed.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  bookingId: string;
  customerId: string;
  artisanId: string;
  finalPrice: number;
}
```

**Consumers**:
- Artisan Service: Update trust score, completion rate
- Platform Service: Send completion notifications

---

#### `booking.cancelled`
Published when booking is cancelled.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  bookingId: string;
  customerId: string;
  artisanId: string;
  cancelledBy: 'customer' | 'artisan';
  reason?: string;
}
```

**Consumers**:
- Artisan Service: Update cancellation rate
- Platform Service: Send cancellation notifications

---

### Review Events

#### `review.created`
Published when a customer submits a review.

**Producer**: Artisan Service

**Payload**:
```typescript
{
  reviewId: string;
  artisanProfileId: string;
  customerId: string;
  rating: number;
  title: string;
}
```

**Consumers**:
- Artisan Service: Recalculate average rating
- Platform Service: Notify artisan

---

### Payment Events

#### `payment.received`
Published when payment is successfully processed.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  paymentId: string;
  bookingId: string;
  customerId: string;
  amount: number;
  reference: string;
}
```

**Consumers**:
- Platform Service: Send payment confirmation

---

#### `payment.failed`
Published when payment fails.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  bookingId: string;
  customerId: string;
  amount: number;
  reason: string;
}
```

**Consumers**:
- Platform Service: Send payment failure notification

---

### Escrow Events

#### `escrow.funded`
Published when escrow is fully funded.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  escrowId: string;
  contractId: string;
  customerId: string;
  artisanId: string;
  amount: number;
}
```

**Consumers**:
- Platform Service: Notify both parties

---

#### `escrow.released`
Published when funds are released from escrow.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  escrowId: string;
  contractId: string;
  milestone: number;
  amount: number;
  artisanId: string;
}
```

**Consumers**:
- Platform Service: Notify artisan of payment

---

#### `escrow.refunded`
Published when escrow funds are refunded.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  escrowId: string;
  contractId: string;
  customerId: string;
  amount: number;
  reason: string;
}
```

**Consumers**:
- Platform Service: Notify customer of refund

---

### Dispute Events

#### `dispute.opened`
Published when a dispute is opened.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  disputeId: string;
  contractId: string;
  escrowId: string;
  customerId: string;
  artisanId: string;
  category: string;
  reason: string;
}
```

**Consumers**:
- Platform Service: Alert admin, notify artisan

---

#### `dispute.resolved`
Published when a dispute is resolved.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  disputeId: string;
  contractId: string;
  decision: string;
  customerRefund?: number;
  artisanPayment?: number;
}
```

**Consumers**:
- Platform Service: Notify both parties of resolution

---

#### `dispute.escalated`
Published when dispute is auto-escalated.

**Producer**: Transaction Service

**Payload**:
```typescript
{
  disputeId: string;
  reason: string;
  daysOpen: number;
}
```

**Consumers**:
- Platform Service: Urgent admin alert

---

### Verification Events

#### `verification.submitted`
Published when artisan submits verification application.

**Producer**: Artisan Service

**Payload**:
```typescript
{
  applicationId: string;
  artisanProfileId: string;
  userId: string;
}
```

**Consumers**:
- Platform Service: Notify admin

---

#### `verification.approved`
Published when verification is approved.

**Producer**: Artisan Service

**Payload**:
```typescript
{
  applicationId: string;
  artisanProfileId: string;
  userId: string;
}
```

**Consumers**:
- Platform Service: Send congratulations notification

---

#### `verification.rejected`
Published when verification is rejected.

**Producer**: Artisan Service

**Payload**:
```typescript
{
  applicationId: string;
  artisanProfileId: string;
  userId: string;
  reason: string;
}
```

**Consumers**:
- Platform Service: Send rejection notification with reason

---

### Message Events

#### `message.sent`
Published when a message is sent.

**Producer**: Messaging Service

**Payload**:
```typescript
{
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
}
```

**Consumers**:
- Platform Service: Send push notification to recipient

---

### Notification Events

#### `notification.send`
Internal event to trigger notification delivery.

**Producer**: Various Services

**Payload**:
```typescript
{
  userId: string;
  type: 'push' | 'sms' | 'email';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}
```

**Consumers**:
- Platform Service: Deliver notification via appropriate channel

---

## Redis Streams Configuration

Events are stored in Redis Streams with the following naming convention:

```
korrect:events:{event_type}
```

Example: `korrect:events:user.created`

### Consumer Groups

Each service creates its own consumer group:

```
korrect:events:user.created -> consumer group: users
korrect:events:user.created -> consumer group: platform
```

### Retention

Events are trimmed to keep max 10,000 entries per stream using `MAXLEN ~ 10000`.
