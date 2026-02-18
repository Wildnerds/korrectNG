import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoggerConfig {
  serviceName: string;
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  logDirectory?: string;
}

export interface RequestWithLogger extends Request {
  requestId?: string;
  log?: winston.Logger;
}

// ─── Log Levels ──────────────────────────────────────────────────────────────

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// ─── Formats ─────────────────────────────────────────────────────────────────

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, requestId, ...meta }) => {
    const svc = service ? `[${service}]` : '';
    const reqId = requestId ? `[${requestId}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${svc}${reqId}: ${message}${metaStr}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ─── Create Logger ───────────────────────────────────────────────────────────

export function createLogger(config: LoggerConfig): winston.Logger {
  const {
    serviceName,
    level = process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableConsole = true,
    enableFile = process.env.NODE_ENV === 'production',
    logDirectory = 'logs',
  } = config;

  const transports: winston.transport[] = [];

  // Console transport
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
      })
    );
  }

  // File transports (production only by default)
  if (enableFile) {
    transports.push(
      new winston.transports.File({
        filename: `${logDirectory}/${serviceName}-error.log`,
        level: 'error',
        format: jsonFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: `${logDirectory}/${serviceName}-combined.log`,
        format: jsonFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  return winston.createLogger({
    level,
    levels,
    defaultMeta: { service: serviceName },
    transports,
    exitOnError: false,
  });
}

// ─── Logger Helper ───────────────────────────────────────────────────────────

export class Logger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(config: LoggerConfig) {
    this.serviceName = config.serviceName;
    this.logger = createLogger(config);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  http(message: string, meta?: Record<string, unknown>): void {
    this.logger.http(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  child(meta: Record<string, unknown>): winston.Logger {
    return this.logger.child(meta);
  }

  /**
   * Get the underlying Winston logger
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// ─── Request ID Generator ────────────────────────────────────────────────────

export function generateRequestId(): string {
  return uuidv4().slice(0, 8);
}

// ─── Correlation ID Middleware ───────────────────────────────────────────────

export function correlationIdMiddleware(
  req: RequestWithLogger,
  res: Response,
  next: NextFunction
): void {
  // Check for existing correlation ID from gateway
  const existingId = req.headers['x-correlation-id'] as string | undefined;
  const requestId = existingId || generateRequestId();

  req.requestId = requestId;

  // Set correlation ID in response header
  res.setHeader('x-correlation-id', requestId);

  next();
}

// ─── HTTP Logger Middleware ──────────────────────────────────────────────────

export function createHttpLoggerMiddleware(logger: Logger) {
  return (req: RequestWithLogger, res: Response, next: NextFunction): void => {
    const requestId = req.requestId || generateRequestId();
    req.requestId = requestId;

    // Create request-scoped logger
    req.log = logger.child({ requestId });

    const startTime = Date.now();

    // Log incoming request
    logger.http(`${req.method} ${req.originalUrl}`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLevel = res.statusCode >= 400 ? 'warn' : 'http';

      logger[logLevel](`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  };
}

// ─── Service Logging Utilities ───────────────────────────────────────────────

/**
 * Log service startup
 */
export function logServiceStart(logger: Logger, port: number): void {
  logger.info('Service started', {
    port,
    env: process.env.NODE_ENV,
    nodeVersion: process.version,
  });
}

/**
 * Log database connection
 */
export function logDatabaseConnection(logger: Logger, host: string): void {
  logger.info('Database connected', { host });
}

/**
 * Log Redis connection
 */
export function logRedisConnection(logger: Logger, url: string): void {
  // Don't log credentials
  const safeUrl = url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  logger.info('Redis connected', { url: safeUrl });
}

/**
 * Log event published
 */
export function logEventPublished(
  logger: Logger,
  eventType: string,
  eventId: string,
  requestId?: string
): void {
  logger.debug('Event published', {
    eventType,
    eventId,
    requestId,
  });
}

/**
 * Log event received
 */
export function logEventReceived(
  logger: Logger,
  eventType: string,
  eventId: string,
  source: string
): void {
  logger.debug('Event received', {
    eventType,
    eventId,
    source,
  });
}

// ─── Default Export ──────────────────────────────────────────────────────────

export default Logger;
