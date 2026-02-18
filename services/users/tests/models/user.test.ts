import { User } from '../../src/models/User';

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+2348012345678',
      };

      const user = await User.create(userData);

      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.phone).toBe(userData.phone);
      expect(user.password).not.toBe(userData.password); // Password should be hashed
      expect(user.isActive).toBe(true);
      expect(user.role).toBe('customer');
    });

    it('should fail to create user without required fields', async () => {
      const userData = {
        email: 'test@example.com',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail to create user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should not create duplicate users with same email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Password Comparison', () => {
    it('should return true for correct password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword('Password123!');

      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword('WrongPassword');

      expect(isMatch).toBe(false);
    });
  });

  describe('JWT Generation', () => {
    it('should generate valid access token', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await User.create(userData);
      const token = user.generateAccessToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate valid refresh token', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await User.create(userData);
      const token = user.generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('Full Name', () => {
    it('should return correct full name', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const user = await User.create(userData);

      expect(user.fullName).toBe('John Doe');
    });
  });
});
