import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import sanitizeHtml from 'sanitize-html';
import { log } from '../utils/logger';

/**
 * Options for sanitize-html
 * Strips all HTML tags by default for text fields
 */
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [], // No HTML tags allowed
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

/**
 * Recursively sanitize string values in an object
 */
function sanitizeObject(obj: any, path = ''): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Sanitize HTML to prevent XSS
    const sanitized = sanitizeHtml(obj, sanitizeOptions);
    if (sanitized !== obj) {
      log.debug('XSS sanitization applied', { path, original: obj.substring(0, 100) });
    }
    return sanitized;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => sanitizeObject(item, `${path}[${index}]`));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value, path ? `${path}.${key}` : key);
    }
    return sanitized;
  }

  return obj;
}

/**
 * XSS Sanitization Middleware
 * Sanitizes request body, query, and params to prevent XSS attacks
 */
export function xssSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeObject(req.body, 'body');
  }
  if (req.query) {
    req.query = sanitizeObject(req.query, 'query');
  }
  if (req.params) {
    req.params = sanitizeObject(req.params, 'params');
  }
  next();
}

/**
 * NoSQL Injection Prevention Middleware
 * Uses express-mongo-sanitize to remove $ and . from user input
 */
export const noSqlSanitize = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    log.warn('NoSQL injection attempt blocked', {
      key,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
  },
});

/**
 * Combined sanitization middleware
 * Apply both NoSQL injection prevention and XSS sanitization
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  // First apply NoSQL sanitization
  noSqlSanitize(req, res, (err?: any) => {
    if (err) {
      return next(err);
    }
    // Then apply XSS sanitization
    xssSanitize(req, res, next);
  });
}
