import request from 'supertest';
import { createTestApp } from '../utils/testApp';
import {
  createTestUser,
  testCustomer,
  testArtisan,
  generateTestToken,
  randomEmail,
  randomPhone,
} from '../utils/testHelpers';
import User from '../../models/User';

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '1d';

const app = createTestApp();

describe('Auth Routes', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: randomEmail(),
          phone: randomPhone(),
          password: 'SecurePass123!',
          role: 'customer',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined(); // Password should not be returned
      expect(res.body.data.token).toBeDefined();
    });

    it('should register a new artisan successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: randomEmail(),
          phone: randomPhone(),
          password: 'SecurePass123!',
          role: 'artisan',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('artisan');
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          phone: randomPhone(),
          password: 'SecurePass123!',
          role: 'customer',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: randomEmail(),
          phone: randomPhone(),
          password: '123',
          role: 'customer',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      const email = randomEmail();

      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email,
          phone: randomPhone(),
          password: 'SecurePass123!',
          role: 'customer',
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email,
          phone: randomPhone(),
          password: 'SecurePass123!',
          role: 'customer',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: randomEmail(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      // Create user first
      const email = randomEmail();
      const password = 'SecurePass123!';

      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email,
        phone: randomPhone(),
        password,
        role: 'customer',
        isEmailVerified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
    });

    it('should fail with incorrect password', async () => {
      const email = randomEmail();

      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email,
        phone: randomPhone(),
        password: 'CorrectPass123!',
        role: 'customer',
        isEmailVerified: true,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with missing credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const user = await createTestUser({ email: randomEmail() });
      const token = generateTestToken(user._id.toString());

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(user.email);
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });


  describe('POST /api/v1/auth/forgot-password', () => {
    it('should accept valid email for password reset', async () => {
      const email = randomEmail();
      await createTestUser({ email });

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email });

      // Should succeed even if email sending fails in test
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should not reveal if email does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      // Should return success to prevent email enumeration
      expect(res.status).toBe(200);
    });

    it('should fail with invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should clear the token cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      // Check that the token cookie is being cleared
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });

  describe('PUT /api/v1/auth/update-profile', () => {
    it('should update user profile successfully', async () => {
      const user = await createTestUser({ email: randomEmail() });
      const token = generateTestToken(user._id.toString());

      const res = await request(app)
        .put('/api/v1/auth/update-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.lastName).toBe('Name');
    });

    it('should fail to update without authentication', async () => {
      const res = await request(app)
        .put('/api/v1/auth/update-profile')
        .send({
          firstName: 'Updated',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/auth/update-password', () => {
    it('should update password successfully', async () => {
      const email = randomEmail();
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewSecurePass456!';

      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email,
        phone: randomPhone(),
        password: currentPassword,
        role: 'customer',
        isEmailVerified: true,
      });

      // Login first to get token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: currentPassword });

      const token = loginRes.body.data.token;

      // Update password
      const res = await request(app)
        .put('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify new password works
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: newPassword });

      expect(newLoginRes.status).toBe(200);
    });

    it('should fail with incorrect current password', async () => {
      const user = await createTestUser({ email: randomEmail() });
      const token = generateTestToken(user._id.toString());

      const res = await request(app)
        .put('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with weak new password', async () => {
      const email = randomEmail();
      const currentPassword = 'CurrentPass123!';

      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email,
        phone: randomPhone(),
        password: currentPassword,
        role: 'customer',
        isEmailVerified: true,
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: currentPassword });

      const token = loginRes.body.data.token;

      const res = await request(app)
        .put('/api/v1/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword,
          newPassword: '123', // Too short
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
