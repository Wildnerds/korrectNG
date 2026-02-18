import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { createClient } from 'redis';
import { createLogger, correlationIdMiddleware, createHttpLoggerMiddleware } from '@korrect/logger';
import { createHealthRouter } from '@korrect/health';
import { EventBus } from '@korrect/event-bus';
import { createServiceAuthMiddleware } from '@korrect/auth-middleware';
import { ServiceClient } from '@korrect/service-client';
import messagesRouter from './routes/messages';
import { setupEventHandlers } from './events/handlers';

const app = express();
const PORT = process.env.PORT || 3004;
const SERVICE_NAME = 'messaging-service';

// Create logger
const logger = createLogger(SERVICE_NAME);

// Trust proxy for accurate IP logging
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(createHttpLoggerMiddleware(logger));

// Service clients for inter-service communication
const usersClient = new ServiceClient({
  baseURL: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
  serviceName: 'users-service',
  timeout: 5000,
});

// Make clients available to routes
app.locals.logger = logger;
app.locals.usersClient = usersClient;

async function startServer() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/korrect_messaging';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB', { database: 'korrect_messaging' });

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
    await setupEventHandlers(eventBus, logger);

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
    app.use('/api/v1/messages', serviceAuth, messagesRouter);

    // Internal API routes (for other services)
    app.get('/internal/conversations/:userId', async (req, res) => {
      try {
        const { Conversation } = await import('./models');
        const conversations = await Conversation.find({
          participants: req.params.userId,
        })
          .sort({ lastMessageAt: -1 })
          .limit(20)
          .lean();
        res.json({ success: true, data: conversations });
      } catch (error) {
        logger.error('Internal get conversations error', { error });
        res.status(500).json({ success: false, error: 'Internal error' });
      }
    });

    app.get('/internal/conversations/:id/messages', async (req, res) => {
      try {
        const { Message } = await import('./models');
        const messages = await Message.find({
          conversation: req.params.id,
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();
        res.json({ success: true, data: messages });
      } catch (error) {
        logger.error('Internal get messages error', { error });
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
