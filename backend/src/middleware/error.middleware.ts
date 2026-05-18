import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../types/errors';
import { logger } from '../utils/logger';

/**
 * Global Express error-handling middleware.
 *
 * Maps AppError and ZodError instances to structured JSON responses.
 * All other errors are treated as 500 Internal Server Error.
 *
 * Response shape:
 * {
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "Human-readable message",
 *     "details": { "field": "field-specific message" }  // optional
 *   }
 * }
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // ── AppError (our own typed errors) ────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, {
        error_code: err.code,
        status_code: err.statusCode,
        path: req.path,
        method: req.method,
        stack: err.stack,
      });
    } else {
      logger.warn(err.message, {
        error_code: err.code,
        status_code: err.statusCode,
        path: req.path,
        method: req.method,
      });
    }

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // ── ZodError (validation errors that escaped the middleware) ───────────────
  if (err instanceof ZodError) {
    const details: Record<string, string> = {};
    for (const issue of err.issues) {
      const field = issue.path.length > 0 ? issue.path.join('.') : '_root';
      details[field] = issue.message;
    }

    logger.warn('Validation error', { path: req.path, method: req.method, details });

    res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details,
      },
    });
    return;
  }

  // ── Unknown / unexpected errors ────────────────────────────────────────────
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error('Unhandled error', {
    message,
    path: req.path,
    method: req.method,
    stack,
  });

  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An internal server error occurred',
    },
  });
};
