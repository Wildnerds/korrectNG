import { Router, Request, Response } from 'express';

// ─── Types ───────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  name: string;
  check: () => Promise<CheckResult>;
}

export interface CheckResult {
  status: HealthStatus;
  message?: string;
  details?: Record<string, unknown>;
  responseTime?: number;
}

export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: Record<string, CheckResult>;
}

export interface HealthConfig {
  serviceName: string;
  version?: string;
  checks?: HealthCheck[];
}

// ─── Health Check Implementations ────────────────────────────────────────────

/**
 * MongoDB health check
 */
export function createMongoHealthCheck(
  mongoose: { connection: { readyState: number } }
): HealthCheck {
  return {
    name: 'mongodb',
    check: async () => {
      const states: Record<number, string> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
      };

      const state = mongoose.connection.readyState;

      if (state === 1) {
        return { status: 'healthy', message: 'Connected' };
      }

      return {
        status: 'unhealthy',
        message: states[state] || 'unknown',
      };
    },
  };
}

/**
 * Redis health check
 */
export function createRedisHealthCheck(
  redis: { ping: () => Promise<string>; status: string }
): HealthCheck {
  return {
    name: 'redis',
    check: async () => {
      try {
        if (redis.status !== 'ready') {
          return { status: 'unhealthy', message: `Status: ${redis.status}` };
        }

        const start = Date.now();
        await redis.ping();
        const responseTime = Date.now() - start;

        return {
          status: 'healthy',
          message: 'Connected',
          responseTime,
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  };
}

/**
 * External service health check
 */
export function createExternalServiceCheck(
  name: string,
  checkFn: () => Promise<boolean>
): HealthCheck {
  return {
    name,
    check: async () => {
      try {
        const start = Date.now();
        const isHealthy = await checkFn();
        const responseTime = Date.now() - start;

        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  };
}

/**
 * Memory usage check
 */
export function createMemoryCheck(thresholdMB: number = 512): HealthCheck {
  return {
    name: 'memory',
    check: async () => {
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

      const isHealthy = heapUsedMB < thresholdMB;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        message: `${heapUsedMB}MB / ${heapTotalMB}MB`,
        details: {
          heapUsedMB,
          heapTotalMB,
          rssMB: Math.round(usage.rss / 1024 / 1024),
          externalMB: Math.round(usage.external / 1024 / 1024),
        },
      };
    },
  };
}

// ─── Health Router ───────────────────────────────────────────────────────────

export function createHealthRouter(config: HealthConfig): Router {
  const router = Router();
  const startTime = Date.now();
  const { serviceName, version = '1.0.0', checks = [] } = config;

  /**
   * GET /health - Basic health check (for load balancers)
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: serviceName,
    });
  });

  /**
   * GET /health/live - Liveness probe (is the process running?)
   */
  router.get('/health/live', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/ready - Readiness probe (can the service handle requests?)
   */
  router.get('/health/ready', async (_req: Request, res: Response) => {
    const checkResults: Record<string, CheckResult> = {};
    let overallStatus: HealthStatus = 'healthy';

    // Run all health checks
    await Promise.all(
      checks.map(async (check) => {
        try {
          const result = await check.check();
          checkResults[check.name] = result;

          if (result.status === 'unhealthy') {
            overallStatus = 'unhealthy';
          } else if (result.status === 'degraded' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          checkResults[check.name] = {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Check failed',
          };
          overallStatus = 'unhealthy';
        }
      })
    );

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks: checkResults,
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    res.status(statusCode).json(response);
  });

  /**
   * GET /health/details - Detailed health information
   */
  router.get('/health/details', async (_req: Request, res: Response) => {
    const checkResults: Record<string, CheckResult> = {};
    let overallStatus: HealthStatus = 'healthy';

    // Run all health checks with timing
    await Promise.all(
      checks.map(async (check) => {
        const start = Date.now();
        try {
          const result = await check.check();
          checkResults[check.name] = {
            ...result,
            responseTime: result.responseTime ?? Date.now() - start,
          };

          if (result.status === 'unhealthy') {
            overallStatus = 'unhealthy';
          } else if (result.status === 'degraded' && overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          checkResults[check.name] = {
            status: 'unhealthy',
            message: error instanceof Error ? error.message : 'Check failed',
            responseTime: Date.now() - start,
          };
          overallStatus = 'unhealthy';
        }
      })
    );

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks: checkResults,
    };

    res.json(response);
  });

  return router;
}

// ─── Standalone Health Check Function ────────────────────────────────────────

export async function checkHealth(checks: HealthCheck[]): Promise<{
  isHealthy: boolean;
  results: Record<string, CheckResult>;
}> {
  const results: Record<string, CheckResult> = {};
  let isHealthy = true;

  await Promise.all(
    checks.map(async (check) => {
      try {
        const result = await check.check();
        results[check.name] = result;
        if (result.status === 'unhealthy') {
          isHealthy = false;
        }
      } catch (error) {
        results[check.name] = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Check failed',
        };
        isHealthy = false;
      }
    })
  );

  return { isHealthy, results };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export default createHealthRouter;
