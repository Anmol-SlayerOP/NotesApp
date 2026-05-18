import { Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError, ErrorCode } from '../types/errors';
import { AuthenticatedRequest } from '../types/index';

/**
 * Express middleware that validates the JWT from the Authorization header
 * and attaches the decoded user identity to the request object.
 *
 * Expects: `Authorization: Bearer <token>`
 *
 * On success: sets `req.user = { userId, username }` and calls `next()`.
 * On missing token: throws 401 MISSING_TOKEN.
 * On invalid/expired token: throws 401 INVALID_TOKEN.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No token provided', ErrorCode.MISSING_TOKEN));
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    return next(AppError.unauthorized('No token provided', ErrorCode.MISSING_TOKEN));
  }

  const payload = authService.verifyToken(token);

  if (!payload) {
    return next(AppError.unauthorized('Invalid or expired token', ErrorCode.INVALID_TOKEN));
  }

  // Attach user identity to the request for downstream handlers
  req.user = {
    userId: payload.userId,
    username: payload.email, // email is stored in the JWT payload as the identifier
  };

  next();
};
