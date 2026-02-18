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

import bookingRoutes from './routes/bookings';
import contractRoutes from './routes/contracts';
import escrowRoutes from './routes/escrow';
import disputeRoutes from './routes/disputes';
import paymentRoutes from './routes/payments';

// ─── Configuration ───────────────────────────────────────────────────────────

const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/korrect_transactions',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  usersServiceUrl: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
  artisanServiceUrl: process.env.ARTISAN_SERVICE_URL || 'http://localhost:3002',
  platformServiceUrl: process.env.PLATFORM_SERVICE_URL || 'http://localhost:3005',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};

// ─── Initialize Services ─────────────────────────────────────────────────────

const logger = new Logger({ serviceName: 'transaction' });

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

const eventBus = createEventBus({
  redisUrl: config.redisUrl,
  serviceName: 'transaction',
});

const usersClient = createServiceClient({ baseURL: config.usersServiceUrl, serviceName: 'transaction' });
const artisanClient = createServiceClient({ baseURL: config.artisanServiceUrl, serviceName: 'transaction' });
const platformClient = createServiceClient({ baseURL: config.platformServiceUrl, serviceName: 'transaction' });

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

app.use(helmet());
app.use(cors({
  origin: [config.clientUrl, 'exp://localhost:8081'],
  credentials: true,
  exposedHeaders: ['x-correlation-id'],
}));

app.use(correlationIdMiddleware);
app.use(createHttpLoggerMiddleware(logger));

// Raw body for Paystack webhooks
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const serviceAuth = createServiceAuthMiddleware();

app.locals.serviceAuth = serviceAuth;
app.locals.eventBus = eventBus;
app.locals.logger = logger;
app.locals.usersClient = usersClient;
app.locals.artisanClient = artisanClient;
app.locals.platformClient = platformClient;
app.locals.paystackSecretKey = config.paystackSecretKey;

// ─── Health Checks ───────────────────────────────────────────────────────────

const healthRouter = createHealthRouter({
  serviceName: 'transaction',
  version: '1.0.0',
  checks: [
    createMongoHealthCheck(mongoose),
    createRedisHealthCheck(redis),
    createMemoryCheck(),
  ],
});

app.use(healthRouter);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/escrow', escrowRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/payments', paymentRoutes);

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, error: 'Validation error', details: err.message });
  }

  if ((err as any).code === 11000) {
    return res.status(400).json({ success: false, error: 'Duplicate entry' });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Start Server ────────────────────────────────────────────────────────────

async function start() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected', { host: mongoose.connection.host });

    const { setupEventHandlers } = await import('./events/handlers');
    await setupEventHandlers(eventBus, logger);

    app.listen(config.port, () => {
      logger.info(`Transaction service running on port ${config.port}`, {
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
