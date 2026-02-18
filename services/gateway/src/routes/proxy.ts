import { Express, Request, Response } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Logger } from '@korrect/logger';

interface ServiceUrls {
  users: string;
  artisan: string;
  transaction: string;
  messaging: string;
  platform: string;
  legacy: string;
}

interface RouteConfig {
  path: string;
  target: keyof ServiceUrls;
  rewrite?: (path: string) => string;
  methods?: string[];
}

// ─── Route Configuration ─────────────────────────────────────────────────────

const routeConfigs: RouteConfig[] = [
  // Users Service Routes
  { path: '/api/v1/auth', target: 'users' },
  { path: '/api/v1/account', target: 'users' },
  { path: '/api/v1/push-tokens', target: 'users' },

  // Artisan Service Routes
  { path: '/api/v1/artisans', target: 'artisan' },
  { path: '/api/v1/reviews', target: 'artisan' },
  { path: '/api/v1/verification', target: 'artisan' },
  { path: '/api/v1/warranty', target: 'artisan' },

  // Transaction Service Routes
  { path: '/api/v1/bookings', target: 'transaction' },
  { path: '/api/v1/contracts', target: 'transaction' },
  { path: '/api/v1/escrow', target: 'transaction' },
  { path: '/api/v1/disputes', target: 'transaction' },
  { path: '/api/v1/payments', target: 'transaction' },

  // Messaging Service Routes
  { path: '/api/v1/messages', target: 'messaging' },

  // Platform Service Routes
  { path: '/api/v1/notifications', target: 'platform' },
  { path: '/api/v1/admin', target: 'platform' },
  { path: '/api/v1/upload', target: 'platform' },
  { path: '/api/v1/legal', target: 'platform' },
  { path: '/api/v1/prices', target: 'platform' },
];

// ─── Proxy Options Factory ───────────────────────────────────────────────────

function createProxyOptions(
  targetUrl: string,
  logger: Logger,
  routeConfig: RouteConfig
): Options {
  return {
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: routeConfig.rewrite
      ? { [`^${routeConfig.path}`]: routeConfig.rewrite(routeConfig.path) }
      : undefined,
    onProxyReq: (proxyReq, req: Request) => {
      // Forward correlation ID
      const correlationId = req.headers['x-correlation-id'];
      if (correlationId) {
        proxyReq.setHeader('x-correlation-id', correlationId);
      }

      // Forward user ID (set by auth middleware)
      const userId = req.headers['x-user-id'];
      if (userId) {
        proxyReq.setHeader('x-user-id', userId);
      }

      // Forward auth token
      const authToken = req.headers['x-auth-token'];
      if (authToken) {
        proxyReq.setHeader('x-auth-token', authToken);
      }

      logger.debug(`Proxying ${req.method} ${req.path} to ${targetUrl}`, {
        service: routeConfig.target,
        userId,
        correlationId,
      });
    },
    onProxyRes: (proxyRes, req: Request) => {
      logger.debug(`Proxy response ${proxyRes.statusCode} for ${req.method} ${req.path}`, {
        service: routeConfig.target,
        statusCode: proxyRes.statusCode,
      });
    },
    onError: (err, req: Request, res: Response) => {
      logger.error(`Proxy error for ${req.method} ${req.path}`, {
        service: routeConfig.target,
        error: err.message,
        target: targetUrl,
      });

      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        service: routeConfig.target,
      });
    },
  };
}

// ─── Setup Proxy Routes ──────────────────────────────────────────────────────

export function setupProxyRoutes(
  app: Express,
  services: ServiceUrls,
  logger: Logger
): void {
  // Track which routes are handled by microservices
  const handledRoutes = new Set<string>();

  // Setup proxy for each route configuration
  for (const routeConfig of routeConfigs) {
    const targetUrl = services[routeConfig.target];

    // Skip if service URL not configured (fall back to legacy)
    if (!targetUrl || targetUrl === services.legacy) {
      logger.warn(`Service ${routeConfig.target} not configured, route ${routeConfig.path} will use legacy`);
      continue;
    }

    const proxyOptions = createProxyOptions(targetUrl, logger, routeConfig);
    const proxyMiddleware = createProxyMiddleware(proxyOptions);

    app.use(routeConfig.path, proxyMiddleware);
    handledRoutes.add(routeConfig.path);

    logger.info(`Route ${routeConfig.path} -> ${routeConfig.target} (${targetUrl})`);
  }

  // Fallback to legacy backend for unhandled routes
  if (services.legacy) {
    const legacyProxy = createProxyMiddleware({
      target: services.legacy,
      changeOrigin: true,
      onProxyReq: (proxyReq, req: Request) => {
        // Forward headers
        const correlationId = req.headers['x-correlation-id'];
        if (correlationId) {
          proxyReq.setHeader('x-correlation-id', correlationId);
        }

        const userId = req.headers['x-user-id'];
        if (userId) {
          proxyReq.setHeader('x-user-id', userId);
        }

        logger.debug(`Proxying ${req.method} ${req.path} to legacy backend`, {
          correlationId,
          userId,
        });
      },
      onError: (err, _req, res: Response) => {
        logger.error('Legacy proxy error', { error: err.message });

        res.status(503).json({
          success: false,
          error: 'Backend service temporarily unavailable',
        });
      },
    });

    // Apply legacy proxy to all unhandled /api routes
    app.use('/api', (req, res, next) => {
      // Check if this route is handled by a microservice
      const isHandled = Array.from(handledRoutes).some((route) =>
        req.path.startsWith(route.replace('/api', ''))
      );

      if (isHandled) {
        return next();
      }

      // Proxy to legacy
      return legacyProxy(req, res, next);
    });

    logger.info(`Fallback routes -> legacy (${services.legacy})`);
  }
}

// ─── Service Health Check Helper ─────────────────────────────────────────────

export async function checkServiceHealth(
  serviceUrl: string
): Promise<{ healthy: boolean; error?: string }> {
  try {
    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { healthy: true };
    }

    return { healthy: false, error: `Status ${response.status}` };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
