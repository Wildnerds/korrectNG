import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { createAuthMiddleware } from '@korrect/auth-middleware';
import { Logger, createHttpLoggerMiddleware, correlationIdMiddleware } from '@korrect/logger';
import { createHealthRouter, createMongoHealthCheck, createRedisHealthCheck, createMemoryCheck } from '@korrect/health';
import { createEventBus, EVENT_TYPES } from '@korrect/event-bus';
import Redis from 'ioredis';

import { User } from './models/User';
import authRoutes from './routes/auth';
import accountRoutes from './routes/account';
import pushTokenRoutes from './routes/pushTokens';

// ─── Configuration ───────────────────────────────────────────────────────────

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/korrect_users',
  jwtSecret: process.env.JWT_SECRET || 'secret',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};

// ─── Initialize Services ─────────────────────────────────────────────────────

const logger = new Logger({ serviceName: 'users' });

// Redis for events
const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

// Event bus
const eventBus = createEventBus({
  redisUrl: config.redisUrl,
  serviceName: 'users',
});

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [config.clientUrl, 'exp://localhost:8081'],
    credentials: true,
    exposedHeaders: ['X-Refreshed-Token', 'x-correlation-id'],
  })
);

// Correlation ID - first middleware
app.use(correlationIdMiddleware);

// HTTP request logging
app.use(createHttpLoggerMiddleware(logger));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Auth Middleware ─────────────────────────────────────────────────────────

const authMiddleware = createAuthMiddleware({
  jwtSecret: config.jwtSecret,
  onUserLookup: async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) return null;
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  },
  enableTokenRefresh: true,
  tokenRefreshCallback: (user) => {
    const userDoc = { _id: user.id, getSignedJwtToken: () => '' };
    // Generate new token
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: config.jwtExpire });
  },
});

// Make auth middleware available to routes
app.locals.authMiddleware = authMiddleware;
app.locals.eventBus = eventBus;
app.locals.logger = logger;

// ─── Health Checks ───────────────────────────────────────────────────────────

const healthRouter = createHealthRouter({
  serviceName: 'users',
  version: '1.0.0',
  checks: [
    createMongoHealthCheck(mongoose),
    createRedisHealthCheck(redis),
    createMemoryCheck(),
  ],
});

app.use(healthRouter);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/push-tokens', pushTokenRoutes);

// ─── Internal API (for other services) ───────────────────────────────────────

// Get user by ID (internal)
app.get('/internal/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Internal get user error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get multiple users by IDs (internal)
app.post('/internal/users/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'ids must be an array' });
    }
    const users = await User.find({ _id: { $in: ids } }).select('-password');
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Internal batch get users error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message,
    });
  }

  // Handle duplicate key errors
  if ((err as any).code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry',
    });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected', { host: mongoose.connection.host });

    // Start server
    app.listen(config.port, () => {
      logger.info(`Users service running on port ${config.port}`, {
        port: config.port,
        env: process.env.NODE_ENV,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.disconnect();
  await eventBus.close();
  process.exit(0);
});

start();

export default app;
