import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import hpp from 'hpp';
import * as Sentry from '@sentry/node';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createGatewayAuthMiddleware, AuthRequest } from '@korrect/auth-middleware';
import { Logger, createHttpLoggerMiddleware, correlationIdMiddleware } from '@korrect/logger';
import { createHealthRouter, createRedisHealthCheck, createMemoryCheck } from '@korrect/health';
import Redis from 'ioredis';
import { setupProxyRoutes } from './routes/proxy';

// ─── Configuration ───────────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'secret',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  sentryDsn: process.env.SENTRY_DSN || '',
  services: {
    users: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
    artisan: process.env.ARTISAN_SERVICE_URL || 'http://localhost:3002',
    transaction: process.env.TRANSACTION_SERVICE_URL || 'http://localhost:3003',
    messaging: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3004',
    platform: process.env.PLATFORM_SERVICE_URL || 'http://localhost:3005',
    legacy: process.env.LEGACY_BACKEND_URL || 'http://localhost:5001',
  },
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'exp://localhost:8081'],
};

// ─── Initialize Sentry ──────────────────────────────────────────────────────

if (config.sentryDsn && isProduction) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
}

// ─── Initialize Services ─────────────────────────────────────────────────────

const logger = new Logger({ serviceName: 'gateway' });

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

// ─── Swagger/OpenAPI Configuration ──────────────────────────────────────────

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KorrectNG API',
      version: '1.0.0',
      description: 'API documentation for KorrectNG - Nigeria\'s Verified Artisan Marketplace',
      contact: {
        name: 'KorrectNG Support',
        email: 'support@korrect.ng',
      },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://api.korrect.ng', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/docs/*.yaml'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Sentry request handler (must be first)
if (config.sentryDsn && isProduction) {
  app.use(Sentry.Handlers.requestHandler());
}

// Security middleware - Helmet with production configuration
app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://api.korrect.ng'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: isProduction,
    crossOriginOpenerPolicy: isProduction ? { policy: 'same-origin' } : false,
    crossOriginResourcePolicy: isProduction ? { policy: 'same-origin' } : false,
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// HTTP Parameter Pollution protection
app.use(hpp());

// Compression
app.use(compression());

// CORS with production configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (config.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (!isProduction) {
        // In development, allow all origins
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    exposedHeaders: ['X-Refreshed-Token', 'x-correlation-id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-platform'],
    maxAge: 86400, // 24 hours
  })
);

// Correlation ID - first middleware
app.use(correlationIdMiddleware);

// HTTP request logging
app.use(createHttpLoggerMiddleware(logger));

// Body parsing - raw body for webhooks
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiting with Redis store for distributed rate limiting
const createRateLimiter = (windowMs: number, max: number, message: string) => {
  const options: rateLimit.Options = {
    windowMs,
    max,
    message: { success: false, error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/health/ready' || req.path === '/health/live';
    },
  };

  // Use Redis store in production for distributed rate limiting
  if (isProduction && redis.status === 'ready') {
    options.store = new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args) as any,
    });
  }

  return rateLimit(options);
};

// Global rate limiter
app.use('/api/', createRateLimiter(15 * 60 * 1000, 500, 'Too many requests, please try again later'));

// Stricter rate limiting for auth endpoints
app.use('/api/v1/auth/login', createRateLimiter(15 * 60 * 1000, 5, 'Too many login attempts'));
app.use('/api/v1/auth/register', createRateLimiter(60 * 60 * 1000, 3, 'Too many registration attempts'));
app.use('/api/v1/auth/forgot-password', createRateLimiter(60 * 60 * 1000, 3, 'Too many password reset requests'));

// ─── API Documentation ──────────────────────────────────────────────────────

if (!isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KorrectNG API Documentation',
  }));

  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });
}

// ─── Auth Middleware ─────────────────────────────────────────────────────────

const gatewayAuth = createGatewayAuthMiddleware(config.jwtSecret);

// ─── Health Checks ───────────────────────────────────────────────────────────

const healthRouter = createHealthRouter({
  serviceName: 'gateway',
  version: process.env.npm_package_version || '1.0.0',
  checks: [createRedisHealthCheck(redis), createMemoryCheck()],
});

app.use(healthRouter);

// ─── Route Protection ────────────────────────────────────────────────────────

// Public routes (no auth required)
const publicRoutes = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/verify-email',
  '/api/v1/artisans', // Public artisan listing
  '/api/v1/legal',
  '/api/v1/prices',
  '/api/v1/csrf-token',
  '/api/v1/payments/webhook', // Paystack webhook
];

// Optional auth routes (user attached if token exists)
const optionalAuthRoutes = ['/api/v1/artisans', '/api/v1/prices'];

// Apply auth middleware
app.use('/api/v1', (req: AuthRequest, res: Response, next: NextFunction) => {
  const path = req.path;

  // Check if public route
  if (publicRoutes.some((route) => path.startsWith(route.replace('/api/v1', '')))) {
    return next();
  }

  // Check if optional auth route (GET only)
  if (
    optionalAuthRoutes.some((route) => path.startsWith(route.replace('/api/v1', ''))) &&
    req.method === 'GET'
  ) {
    return gatewayAuth.optionalValidation(req, res, next);
  }

  // All other routes require auth
  return gatewayAuth.validateToken(req, res, next);
});

// ─── Proxy Routes ────────────────────────────────────────────────────────────

setupProxyRoutes(app, config.services, logger);

// ─── CSRF Token Endpoint ─────────────────────────────────────────────────────

app.get('/api/v1/csrf-token', (_req: Request, res: Response) => {
  res.json({ success: true, csrfToken: 'not-required-in-microservices' });
});

// ─── Sentry Error Handler ───────────────────────────────────────────────────

if (config.sentryDsn && isProduction) {
  app.use(Sentry.Handlers.errorHandler());
}

// ─── Fallback Error Handler ──────────────────────────────────────────────────

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Don't expose error details in production
  res.status(500).json({
    success: false,
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  // Close Redis connection
  await redis.quit();

  // Close Sentry
  if (config.sentryDsn && isProduction) {
    await Sentry.close(2000);
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Start Server ────────────────────────────────────────────────────────────

const startServer = async () => {
  try {
    // Connect to Redis
    await redis.connect();

    app.listen(config.port, () => {
      logger.info(`Gateway running on port ${config.port}`, {
        port: config.port,
        env: process.env.NODE_ENV,
        docsUrl: !isProduction ? `http://localhost:${config.port}/api-docs` : undefined,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();

export default app;
