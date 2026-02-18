import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { initSentry, sentryErrorHandler } from './config/sentry';
import { httpLogger, log } from './utils/logger';
import { csrfProtection, getCsrfToken } from './middleware/csrf';
import { sanitizeInput } from './middleware/sanitize';

import authRoutes from './routes/auth';
import artisanRoutes from './routes/artisans';
import reviewRoutes from './routes/reviews';
import verificationRoutes from './routes/verification';
import paymentRoutes from './routes/payments';
import warrantyRoutes from './routes/warranty';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import notificationRoutes from './routes/notifications';
import messageRoutes from './routes/messages';
import bookingRoutes from './routes/bookings';
import accountRoutes from './routes/account';
import pushTokenRoutes from './routes/pushTokens';
import contractRoutes from './routes/contracts';
import escrowRoutes from './routes/escrow';
import disputeRoutes from './routes/disputes';
import legalRoutes from './routes/legal';
import priceRoutes from './routes/prices';
import { startDisputeEscalationJob } from './jobs/disputeEscalation';

const app = express();

// Initialize Sentry (must be first)
initSentry(app);

// Security
app.use(helmet());
app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'exp://localhost:8081'],
    credentials: true,
    exposedHeaders: ['X-Refreshed-Token'],
  })
);

// HTTP request logging
app.use(httpLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Body parsing - raw body for webhooks
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Input sanitization (NoSQL injection + XSS prevention)
app.use(sanitizeInput);

// CSRF Protection (must be after cookieParser)
app.use(csrfProtection);

// CSRF Token endpoint
app.get('/api/v1/csrf-token', getCsrfToken);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/artisans', artisanRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/warranty', warrantyRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/push-tokens', pushTokenRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/escrow', escrowRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/legal', legalRoutes);
app.use('/api/v1/prices', priceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sentry error handler (must be before custom error handler)
app.use(sentryErrorHandler());

// Error handler
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    log.info(`Server running on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV });

    // Start background jobs
    startDisputeEscalationJob();
  });
}

start();

export default app;
