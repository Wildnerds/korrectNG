import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createClient } from 'redis';
import { createLogger, correlationIdMiddleware, createHttpLoggerMiddleware } from '@korrect/logger';
import { createHealthRouter } from '@korrect/health';
import { EventBus } from '@korrect/event-bus';
import { createServiceAuthMiddleware } from '@korrect/auth-middleware';
import { ServiceClient } from '@korrect/service-client';
import notificationsRouter from './routes/notifications';
import adminRouter from './routes/admin';
import uploadRouter from './routes/upload';
import legalRouter from './routes/legal';
import pricesRouter from './routes/prices';
import { setupEventHandlers } from './events/handlers';
import { SmsService } from './services/sms';
import { PushService } from './services/push';

const app = express();
const PORT = process.env.PORT || 3005;
const SERVICE_NAME = 'platform-service';

// Create logger
const logger = createLogger(SERVICE_NAME);

// Trust proxy for accurate IP logging
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(correlationIdMiddleware);
app.use(createHttpLoggerMiddleware(logger));

// Service clients for inter-service communication
const usersClient = new ServiceClient({
  baseURL: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
  serviceName: 'users-service',
  timeout: 5000,
});

const artisanClient = new ServiceClient({
  baseURL: process.env.ARTISAN_SERVICE_URL || 'http://localhost:3002',
  serviceName: 'artisan-service',
  timeout: 5000,
});

const transactionClient = new ServiceClient({
  baseURL: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
  serviceName: 'transaction-service',
  timeout: 5000,
});

// Initialize services
const smsService = new SmsService({
  apiKey: process.env.TERMII_API_KEY || '',
  senderId: process.env.TERMII_SENDER_ID || 'Korrect',
}, logger);

const pushService = new PushService(logger);

// Make clients and services available to routes
app.locals.logger = logger;
app.locals.usersClient = usersClient;
app.locals.artisanClient = artisanClient;
app.locals.transactionClient = transactionClient;
app.locals.smsService = smsService;
app.locals.pushService = pushService;

// Cloudinary config (for uploads)
app.locals.cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

async function startServer() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/korrect_platform';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB', { database: 'korrect_platform' });

    // Connect to Redis
    const redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Initialize Event Bus
    const eventBus = new EventBus(redisClient as any, SERVICE_NAME, logger);
    app.locals.eventBus = eventBus;

    // Setup event handlers
    await setupEventHandlers(eventBus, logger, smsService, pushService);

    // Health check routes
    app.use(
      '/health',
      createHealthRouter({
        serviceName: SERVICE_NAME,
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          mongodb: async () => {
            const state = mongoose.connection.readyState;
            return state === 1 ? 'healthy' : 'unhealthy';
          },
          redis: async () => {
            try {
              await redisClient.ping();
              return 'healthy';
            } catch {
              return 'unhealthy';
            }
          },
        },
      })
    );

    // Service auth middleware (validates x-user-id from gateway)
    const serviceAuth = createServiceAuthMiddleware();

    // API Routes
    app.use('/api/v1/notifications', serviceAuth, notificationsRouter);
    app.use('/api/v1/admin', serviceAuth, adminRouter);
    app.use('/api/v1/upload', serviceAuth, uploadRouter);
    app.use('/api/v1/legal', legalRouter); // Some legal routes are public
    app.use('/api/v1/prices', pricesRouter);

    // Internal API routes (for other services)
    app.post('/internal/notifications', async (req, res) => {
      try {
        const { Notification } = await import('./models');
        const notification = await Notification.create(req.body);
        res.json({ success: true, data: notification });
      } catch (error) {
        logger.error('Internal create notification error', { error });
        res.status(500).json({ success: false, error: 'Internal error' });
      }
    });

    app.post('/internal/send-sms', async (req, res) => {
      try {
        const { phone, message } = req.body;
        await smsService.send(phone, message);
        res.json({ success: true });
      } catch (error) {
        logger.error('Internal send SMS error', { error });
        res.status(500).json({ success: false, error: 'Internal error' });
      }
    });

    app.post('/internal/send-push', async (req, res) => {
      try {
        const { tokens, title, body, data } = req.body;
        await pushService.send(tokens, { title, body, data });
        res.json({ success: true });
      } catch (error) {
        logger.error('Internal send push error', { error });
        res.status(500).json({ success: false, error: 'Internal error' });
      }
    });

    app.get('/internal/prices/:category', async (req, res) => {
      try {
        const { PriceCatalog } = await import('./models');
        const prices = await PriceCatalog.find({
          category: req.params.category,
          isActive: true,
        }).lean();
        res.json({ success: true, data: prices });
      } catch (error) {
        logger.error('Internal get prices error', { error });
        res.status(500).json({ success: false, error: 'Internal error' });
      }
    });

    // Start server
    app.listen(PORT, () => {
      logger.info(`${SERVICE_NAME} started`, { port: PORT });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
