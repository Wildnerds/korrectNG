import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from '../../middleware/errorHandler';

import authRoutes from '../../routes/auth';
import artisanRoutes from '../../routes/artisans';
import reviewRoutes from '../../routes/reviews';
import verificationRoutes from '../../routes/verification';
import paymentRoutes from '../../routes/payments';
import warrantyRoutes from '../../routes/warranty';
import adminRoutes from '../../routes/admin';
import uploadRoutes from '../../routes/upload';
import bookingRoutes from '../../routes/bookings';

// Create a test app without database connection and server start
export function createTestApp() {
  const app = express();

  // Security (relaxed for testing)
  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Body parsing - raw body for webhooks
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/artisans', artisanRoutes);
  app.use('/api/v1/reviews', reviewRoutes);
  app.use('/api/v1/verification', verificationRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/warranty', warrantyRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/upload', uploadRoutes);
  app.use('/api/v1/bookings', bookingRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
