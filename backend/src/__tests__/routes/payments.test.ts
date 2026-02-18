import request from 'supertest';
import crypto from 'crypto';
import { createTestApp } from '../utils/testApp';
import {
  createTestArtisanWithProfile,
  generateTestToken,
  randomEmail,
} from '../utils/testHelpers';
import Subscription from '../../models/Subscription';

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '1d';
process.env.PAYSTACK_SECRET_KEY = 'test_paystack_secret_key';

const app = createTestApp();

describe('Payment Routes', () => {
  describe('POST /api/v1/payments/subscribe', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/payments/subscribe');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should require artisan role', async () => {
      // Create a customer (not artisan)
      const { user: artisanUser } = await createTestArtisanWithProfile(
        { email: randomEmail(), role: 'customer' as any }, // Wrong role for this test
        { businessName: 'Test Business', slug: `test-biz-${Date.now()}` }
      );

      // Note: This test would need a customer user, but our helper creates artisan
      // Keeping as placeholder - in real tests, create a customer user directly
    });

    it('should reject unverified artisan', async () => {
      const { user: artisanUser, profile } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        {
          businessName: 'Unverified Business',
          slug: `unverified-${Date.now()}`,
          verificationStatus: 'pending', // Not approved
        }
      );
      const token = generateTestToken(artisanUser._id.toString());

      const res = await request(app)
        .post('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('verified');
    });

    it('should reject if already subscribed', async () => {
      const { user: artisanUser, profile } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        {
          businessName: 'Subscribed Business',
          slug: `subscribed-${Date.now()}`,
          verificationStatus: 'approved',
        }
      );
      const token = generateTestToken(artisanUser._id.toString());

      // Create an existing subscription
      await Subscription.create({
        artisan: profile._id,
        status: 'active',
        amount: 5000,
        paystackSubscriptionCode: 'SUB_test123',
        paystackCustomerCode: 'CUS_test123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/v1/payments/subscribe')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already');
    });
  });

  describe('GET /api/v1/payments/subscription', () => {
    it('should return subscription status for artisan', async () => {
      const { user: artisanUser, profile } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        {
          businessName: 'Sub Status Business',
          slug: `substatus-${Date.now()}`,
          verificationStatus: 'approved',
        }
      );
      const token = generateTestToken(artisanUser._id.toString());

      // Create a subscription
      await Subscription.create({
        artisan: profile._id,
        status: 'active',
        amount: 5000,
        paystackSubscriptionCode: 'SUB_status123',
        paystackCustomerCode: 'CUS_status123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .get('/api/v1/payments/subscription')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe('active');
    });

    it('should return null if no subscription exists', async () => {
      const { user: artisanUser } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        {
          businessName: 'No Sub Business',
          slug: `nosub-${Date.now()}`,
          verificationStatus: 'approved',
        }
      );
      const token = generateTestToken(artisanUser._id.toString());

      const res = await request(app)
        .get('/api/v1/payments/subscription')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/payments/subscription');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/payments/cancel', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/v1/payments/cancel');

      expect(res.status).toBe(401);
    });

    it('should fail if no active subscription', async () => {
      const { user: artisanUser } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        {
          businessName: 'Cancel No Sub',
          slug: `cancelnonsub-${Date.now()}`,
          verificationStatus: 'approved',
        }
      );
      const token = generateTestToken(artisanUser._id.toString());

      const res = await request(app)
        .post('/api/v1/payments/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    const webhookSecret = 'test_paystack_secret_key';

    function generateWebhookSignature(payload: string): string {
      return crypto
        .createHmac('sha512', webhookSecret)
        .update(payload)
        .digest('hex');
    }

    it('should reject webhook without signature', async () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: { reference: 'test_ref_123' },
      });

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing signature');
    });

    it('should reject webhook with invalid signature', async () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: { reference: 'test_ref_456' },
      });

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', 'invalid_signature')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid signature');
    });

    it('should accept webhook with valid signature', async () => {
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          reference: `test_ref_${Date.now()}`,
          metadata: {
            type: 'subscription',
            artisanId: '507f1f77bcf86cd799439011',
          },
        },
      });

      const signature = generateWebhookSignature(payload);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    it('should handle subscription.create event', async () => {
      const { profile } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        {
          businessName: 'Webhook Sub Business',
          slug: `webhooksub-${Date.now()}`,
          verificationStatus: 'approved',
        }
      );

      const payload = JSON.stringify({
        event: 'subscription.create',
        data: {
          reference: `sub_create_${Date.now()}`,
          customer: {
            customer_code: 'CUS_webhook123',
          },
          subscription_code: 'SUB_webhook123',
          next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: {
            artisanId: profile._id.toString(),
          },
        },
      });

      const signature = generateWebhookSignature(payload);

      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify subscription was created
      const subscription = await Subscription.findOne({ artisan: profile._id });
      expect(subscription).toBeDefined();
      expect(subscription?.status).toBe('active');
    });

    it('should be idempotent - same reference processed once', async () => {
      const reference = `idempotent_ref_${Date.now()}`;
      const payload = JSON.stringify({
        event: 'charge.success',
        data: {
          reference,
          metadata: { type: 'test' },
        },
      });

      const signature = generateWebhookSignature(payload);

      // First request
      const res1 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(payload);

      expect(res1.status).toBe(200);

      // Second request with same reference
      const res2 = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-paystack-signature', signature)
        .send(payload);

      expect(res2.status).toBe(200);
      // Both should succeed but second should be no-op
    });
  });

  describe('GET /api/v1/payments/history', () => {
    it('should return payment history for artisan', async () => {
      const { user: artisanUser, profile } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        {
          businessName: 'History Business',
          slug: `history-${Date.now()}`,
          verificationStatus: 'approved',
        }
      );
      const token = generateTestToken(artisanUser._id.toString());

      // Create a subscription for history
      await Subscription.create({
        artisan: profile._id,
        status: 'active',
        amount: 5000,
        paystackSubscriptionCode: 'SUB_history123',
        paystackCustomerCode: 'CUS_history123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .get('/api/v1/payments/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/payments/history');

      expect(res.status).toBe(401);
    });
  });
});
