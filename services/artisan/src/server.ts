import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { createServiceAuthMiddleware } from '@korrect/auth-middleware';
import { Logger, createHttpLoggerMiddleware, correlationIdMiddleware } from '@korrect/logger';
import { createHealthRouter, createMongoHealthCheck, createRedisHealthCheck, createMemoryCheck } from '@korrect/health';
import { createEventBus } from '@korrect/event-bus';
import { createServiceClient } from '@korrect/service-client';
import Redis from 'ioredis';

import artisanRoutes from './routes/artisans';
import reviewRoutes from './routes/reviews';
import verificationRoutes from './routes/verification';
import warrantyRoutes from './routes/warranty';

// ─── Configuration ───────────────────────────────────────────────────────────

const config = {
  port: parseInt(process.env.PORT || '3002', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/korrect_artisans',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  usersServiceUrl: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};

// ─── Initialize Services ─────────────────────────────────────────────────────

const logger = new Logger({ serviceName: 'artisan' });

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
  serviceName: 'artisan',
});

// Service clients
const usersClient = createServiceClient({
  baseURL: config.usersServiceUrl,
  serviceName: 'artisan',
});

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [config.clientUrl, 'exp://localhost:8081'],
    credentials: true,
    exposedHeaders: ['x-correlation-id'],
  })
);

// Correlation ID
app.use(correlationIdMiddleware);

// HTTP request logging
app.use(createHttpLoggerMiddleware(logger));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Auth Middleware ─────────────────────────────────────────────────────────

const serviceAuth = createServiceAuthMiddleware();

// Make services available to routes
app.locals.serviceAuth = serviceAuth;
app.locals.eventBus = eventBus;
app.locals.logger = logger;
app.locals.usersClient = usersClient;

// ─── Health Checks ───────────────────────────────────────────────────────────

const healthRouter = createHealthRouter({
  serviceName: 'artisan',
  version: '1.0.0',
  checks: [
    createMongoHealthCheck(mongoose),
    createRedisHealthCheck(redis),
    createMemoryCheck(),
  ],
});

app.use(healthRouter);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/v1/artisans', artisanRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/warranty', warrantyRoutes);

// ─── Internal API (for other services) ───────────────────────────────────────

// Get artisan profile by user ID
app.get('/internal/artisans/by-user/:userId', async (req, res) => {
  try {
    const { ArtisanProfile } = await import('./models');
    const profile = await ArtisanProfile.findOne({ user: req.params.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('Internal get artisan error', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update artisan stats (called by transaction service)
app.post('/internal/artisans/:id/stats', async (req, res) => {
  try {
    const { ArtisanProfile } = await import('./models');
    const { jobCompleted, jobCancelled, onTime, responseTimeMinutes } = req.body;

    const profile = await ArtisanProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    // Update counters
    if (jobCompleted) {
      profile.jobsCompleted += 1;
      profile.totalJobsAccepted += 1;
      if (onTime) profile.totalJobsOnTime += 1;
    }
    if (jobCancelled) {
      profile.totalJobsCancelled += 1;
    }
    if (responseTimeMinutes !== undefined) {
      profile.totalResponseTimeMinutes += responseTimeMinutes;
      profile.responseCount += 1;
    }

    // Recalculate rates
    if (profile.totalJobsAccepted > 0) {
      profile.completionRate = Math.round((profile.jobsCompleted / profile.totalJobsAccepted) * 100);
      profile.cancellationRate = Math.round((profile.totalJobsCancelled / profile.totalJobsAccepted) * 100);
      profile.onTimeRate = Math.round((profile.totalJobsOnTime / profile.jobsCompleted) * 100) || 0;
    }
    if (profile.responseCount > 0) {
      profile.responseTime = Math.round(profile.totalResponseTimeMinutes / profile.responseCount);
    }

    await profile.save();

    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error('Internal update stats error', { error: error instanceof Error ? error.message : error });
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

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message,
    });
  }

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
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected', { host: mongoose.connection.host });

    // Setup event handlers
    const { setupEventHandlers } = await import('./events/handlers');
    await setupEventHandlers(eventBus, logger);

    app.listen(config.port, () => {
      logger.info(`Artisan service running on port ${config.port}`, {
        port: config.port,
        env: process.env.NODE_ENV,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.disconnect();
  await eventBus.close();
  process.exit(0);
});

start();

export default app;
