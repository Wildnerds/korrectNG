import * as Sentry from '@sentry/node';
import { Express, Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

// Initialize Sentry
export function initSentry(app: Express) {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    log.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Set sampling rate for profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter out sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const data = typeof event.request.data === 'string'
          ? JSON.parse(event.request.data)
          : event.request.data;

        if (data.password) data.password = '[FILTERED]';
        if (data.currentPassword) data.currentPassword = '[FILTERED]';
        if (data.newPassword) data.newPassword = '[FILTERED]';
        if (data.token) data.token = '[FILTERED]';

        event.request.data = JSON.stringify(data);
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'cancelled',
    ],
  });

  // Sentry v8 uses setupExpressErrorHandler - handlers are set up differently
  // For now, skip the old handler setup since v8 has a different API
  log.info('Sentry initialized successfully');
}

// Sentry error handler middleware (must be after all routes)
export function sentryErrorHandler() {
  // If Sentry is not configured, return a no-op middleware
  if (!process.env.SENTRY_DSN) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  // Sentry v8 uses setupExpressErrorHandler instead of Handlers.errorHandler
  // For now, return a simple error logging middleware
  return (err: any, _req: Request, _res: Response, next: NextFunction) => {
    if (!err.statusCode || err.statusCode >= 500) {
      Sentry.captureException(err);
    }
    next(err);
  };
}

// Manual error capture
export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

// Set user context for error tracking
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
}

// Clear user context (on logout)
export function clearUserContext() {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level,
    });
  }
}

export default {
  initSentry,
  sentryErrorHandler,
  captureError,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
};
