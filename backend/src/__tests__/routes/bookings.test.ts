import request from 'supertest';
import { createTestApp } from '../utils/testApp';
import {
  createTestUser,
  createTestArtisanWithProfile,
  generateTestToken,
  randomEmail,
  randomPhone,
} from '../utils/testHelpers';
import Booking from '../../models/Booking';

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '1d';

const app = createTestApp();

describe('Booking Routes', () => {
  describe('POST /api/v1/bookings', () => {
    it('should create a booking successfully as a customer', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan', slug: `test-artisan-${Date.now()}` }
      );
      const token = generateTestToken(customer._id.toString());

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          artisanProfileId: artisan._id.toString(),
          jobType: 'Car Repair',
          description: 'Need to fix the engine of my Toyota Camry. It is making strange noises.',
          location: 'Lagos',
          address: '123 Test Street, Victoria Island, Lagos',
          estimatedPrice: 50000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobType).toBe('Car Repair');
      expect(res.body.data.status).toBe('pending');
    });

    it('should fail to create booking without authentication', async () => {
      const { profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 2', slug: `test-artisan-2-${Date.now()}` }
      );

      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          artisanProfileId: artisan._id.toString(),
          jobType: 'Car Repair',
          description: 'Need to fix the engine',
          location: 'Lagos',
          address: '123 Test Street',
          estimatedPrice: 50000,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid artisan profile ID', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const token = generateTestToken(customer._id.toString());

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          artisanProfileId: '507f1f77bcf86cd799439011', // Non-existent ID
          jobType: 'Car Repair',
          description: 'Need to fix the engine of my car',
          location: 'Lagos',
          address: '123 Test Street',
          estimatedPrice: 50000,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const token = generateTestToken(customer._id.toString());

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jobType: 'Car Repair',
          // Missing artisanProfileId, description, etc.
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with price below minimum', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 3', slug: `test-artisan-3-${Date.now()}` }
      );
      const token = generateTestToken(customer._id.toString());

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          artisanProfileId: artisan._id.toString(),
          jobType: 'Small Repair',
          description: 'Need a small fix for my car',
          location: 'Lagos',
          address: '123 Test Street',
          estimatedPrice: 500, // Below minimum
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/bookings', () => {
    it('should return user bookings (customer)', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 4', slug: `test-artisan-4-${Date.now()}` }
      );
      const token = generateTestToken(customer._id.toString());

      // Create a booking
      await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Test Job',
        description: 'Test description for booking',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 25000,
        status: 'pending',
      });

      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return user bookings (artisan)', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 5', slug: `test-artisan-5-${Date.now()}` }
      );
      const artisanToken = generateTestToken(artisanUser._id.toString());

      // Create a booking
      await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Artisan Test Job',
        description: 'Test description for artisan booking',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 30000,
        status: 'pending',
      });

      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail without authentication', async () => {
      const res = await request(app).get('/api/v1/bookings');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('should return a specific booking', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 6', slug: `test-artisan-6-${Date.now()}` }
      );
      const token = generateTestToken(customer._id.toString());

      const booking = await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Specific Job',
        description: 'Test description for specific booking',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 35000,
        status: 'pending',
      });

      const res = await request(app)
        .get(`/api/v1/bookings/${booking._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobType).toBe('Specific Job');
    });

    it('should not allow access to other users booking', async () => {
      const customer1 = await createTestUser({ email: randomEmail(), role: 'customer' });
      const customer2 = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 7', slug: `test-artisan-7-${Date.now()}` }
      );
      const customer2Token = generateTestToken(customer2._id.toString());

      const booking = await Booking.create({
        customer: customer1._id, // Belongs to customer1
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Private Job',
        description: 'Test description',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 40000,
        status: 'pending',
      });

      // Customer2 tries to access customer1's booking
      const res = await request(app)
        .get(`/api/v1/bookings/${booking._id}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/bookings/:id/accept', () => {
    it('should allow artisan to accept a booking', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 8', slug: `test-artisan-8-${Date.now()}` }
      );
      const artisanToken = generateTestToken(artisanUser._id.toString());

      const booking = await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Accept Test',
        description: 'Test description for acceptance',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 45000,
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ finalPrice: 45000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('accepted');
    });

    it('should not allow customer to accept a booking', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 9', slug: `test-artisan-9-${Date.now()}` }
      );
      const customerToken = generateTestToken(customer._id.toString());

      const booking = await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Customer Accept Test',
        description: 'Test description',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 50000,
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/accept`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ finalPrice: 50000 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/bookings/:id/reject', () => {
    it('should allow artisan to reject a booking', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 10', slug: `test-artisan-10-${Date.now()}` }
      );
      const artisanToken = generateTestToken(artisanUser._id.toString());

      const booking = await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Reject Test',
        description: 'Test description for rejection',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 55000,
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/reject`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ reason: 'Not available this week' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('rejected');
    });
  });

  describe('PATCH /api/v1/bookings/:id/complete', () => {
    it('should allow artisan to mark booking as completed', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 11', slug: `test-artisan-11-${Date.now()}` }
      );
      const artisanToken = generateTestToken(artisanUser._id.toString());

      const booking = await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Complete Test',
        description: 'Test description for completion',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 60000,
        finalPrice: 60000,
        status: 'in_progress',
        paymentStatus: 'escrow',
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/complete`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
    });

    it('should not allow completion of non-in_progress booking', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 12', slug: `test-artisan-12-${Date.now()}` }
      );
      const artisanToken = generateTestToken(artisanUser._id.toString());

      const booking = await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Invalid Complete Test',
        description: 'Test description',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 65000,
        status: 'pending', // Not in_progress
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/complete`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/bookings/:id/confirm', () => {
    it('should allow customer to confirm completion', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 13', slug: `test-artisan-13-${Date.now()}` }
      );
      const customerToken = generateTestToken(customer._id.toString());

      const booking = await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Confirm Test',
        description: 'Test description for confirmation',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 70000,
        finalPrice: 70000,
        status: 'completed',
        paymentStatus: 'escrow',
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/confirm`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('confirmed');
    });

    it('should not allow artisan to confirm their own work', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan 14', slug: `test-artisan-14-${Date.now()}` }
      );
      const artisanToken = generateTestToken(artisanUser._id.toString());

      const booking = await Booking.create({
        customer: customer._id,
        artisan: artisan._id,
        artisanUser: artisanUser._id,
        jobType: 'Artisan Confirm Test',
        description: 'Test description',
        location: 'Lagos',
        address: '123 Test Street',
        estimatedPrice: 75000,
        status: 'completed',
      });

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/confirm`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Booking Status Flow', () => {
    it('should follow correct status transitions: pending -> accepted -> in_progress -> completed -> confirmed', async () => {
      const customer = await createTestUser({ email: randomEmail(), role: 'customer' });
      const { user: artisanUser, profile: artisan } = await createTestArtisanWithProfile(
        { email: randomEmail() },
        { businessName: 'Test Artisan Flow', slug: `test-artisan-flow-${Date.now()}` }
      );
      const customerToken = generateTestToken(customer._id.toString());
      const artisanToken = generateTestToken(artisanUser._id.toString());

      // 1. Create booking (pending)
      const createRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          artisanProfileId: artisan._id.toString(),
          jobType: 'Full Flow Test',
          description: 'Testing the complete booking flow from start to finish',
          location: 'Lagos',
          address: '123 Test Street',
          estimatedPrice: 100000,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.status).toBe('pending');
      const bookingId = createRes.body.data._id;

      // 2. Artisan accepts (accepted)
      const acceptRes = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ finalPrice: 100000 });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('accepted');

      // Update booking to in_progress status for completion test
      await Booking.findByIdAndUpdate(bookingId, {
        status: 'in_progress',
        paymentStatus: 'escrow',
      });

      // 3. Artisan completes work (completed)
      const completeRes = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/complete`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('completed');

      // 4. Customer confirms (confirmed)
      const confirmRes = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/confirm`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.status).toBe('confirmed');
    });
  });
});
