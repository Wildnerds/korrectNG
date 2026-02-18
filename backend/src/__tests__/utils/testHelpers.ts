import { Express } from 'express';
import request from 'supertest';
import User from '../../models/User';
import ArtisanProfile from '../../models/ArtisanProfile';
import jwt from 'jsonwebtoken';

// Test user data
export const testCustomer = {
  firstName: 'Test',
  lastName: 'Customer',
  email: 'testcustomer@test.com',
  phone: '08012345678',
  password: 'TestPass123!',
  role: 'customer' as const,
};

export const testArtisan = {
  firstName: 'Test',
  lastName: 'Artisan',
  email: 'testartisan@test.com',
  phone: '08087654321',
  password: 'TestPass123!',
  role: 'artisan' as const,
};

export const testAdmin = {
  firstName: 'Test',
  lastName: 'Admin',
  email: 'testadmin@test.com',
  phone: '08011111111',
  password: 'AdminPass123!',
  role: 'admin' as const,
};

// Create a test user directly in database
export async function createTestUser(userData: Partial<typeof testCustomer> = {}) {
  const user = await User.create({
    ...testCustomer,
    ...userData,
    isEmailVerified: true,
  });
  return user;
}

// Create a test artisan with profile
export async function createTestArtisanWithProfile(
  userData: Partial<typeof testArtisan> = {},
  profileData: Partial<any> = {}
) {
  const user = await User.create({
    ...testArtisan,
    ...userData,
    isEmailVerified: true,
  });

  const profile = await ArtisanProfile.create({
    user: user._id,
    businessName: profileData.businessName || 'Test Business',
    slug: profileData.slug || 'test-business',
    trade: profileData.trade || 'mechanic',
    description: profileData.description || 'Test description for artisan',
    location: profileData.location || 'lagos',
    address: profileData.address || '123 Test Street, Lagos',
    whatsappNumber: profileData.whatsappNumber || '08087654321',
    yearsOfExperience: profileData.yearsOfExperience || 5,
    verificationStatus: profileData.verificationStatus || 'approved',
    isPublished: profileData.isPublished ?? true,
    subscriptionActive: profileData.subscriptionActive ?? true,
    ...profileData,
  });

  return { user, profile };
}

// Create admin user
export async function createTestAdmin(userData: Partial<typeof testAdmin> = {}) {
  const admin = await User.create({
    ...testAdmin,
    ...userData,
    isEmailVerified: true,
  });
  return admin;
}

// Generate JWT token for a user
export function generateTestToken(userId: string): string {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1d' }
  );
}

// Helper to make authenticated requests
export function authenticatedRequest(app: Express, token: string) {
  return {
    get: (url: string) =>
      request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) =>
      request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) =>
      request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) =>
      request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

// Clean up helper
export async function cleanupDatabase() {
  await User.deleteMany({});
  await ArtisanProfile.deleteMany({});
}

// Wait helper for async operations
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate random email for unique test users
export function randomEmail(): string {
  return `test${Date.now()}${Math.random().toString(36).substring(7)}@test.com`;
}

// Generate random phone number
export function randomPhone(): string {
  return `080${Math.floor(10000000 + Math.random() * 90000000)}`;
}
