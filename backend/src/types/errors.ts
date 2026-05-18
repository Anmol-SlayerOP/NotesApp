/**
 * Enumeration of all application-level error codes.
 * These codes are included in error responses so clients can handle
 * specific error conditions programmatically.
 */
export enum ErrorCode {
  // Validation Errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_PRIORITY = 'INVALID_PRIORITY',

  // Authentication Errors (401)
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Authorization Errors (403)
  FORBIDDEN = 'FORBIDDEN',
  NOT_OWNER = 'NOT_OWNER',

  // Not Found Errors (404)
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',

  // Conflict Errors (409)
  EMAIL_EXISTS = 'EMAIL_EXISTS',

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server Errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Service Errors (503)
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
}

/**
 * Application-level error that carries an HTTP status code, a machine-readable
 * error code, and optional field-level validation details.
 *
 * Use the static factory methods to create errors for common HTTP scenarios
 * rather than constructing instances directly.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, string>;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Restore prototype chain (required when extending built-in classes in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * 400 Bad Request — invalid or missing input data.
   */
  static badRequest(
    message: string,
    code: ErrorCode = ErrorCode.INVALID_INPUT,
    details?: Record<string, string>,
  ): AppError {
    return new AppError(message, 400, code, details);
  }

  /**
   * 401 Unauthorized — missing or invalid authentication credentials.
   */
  static unauthorized(
    message: string,
    code: ErrorCode = ErrorCode.INVALID_TOKEN,
  ): AppError {
    return new AppError(message, 401, code);
  }

  /**
   * 403 Forbidden — authenticated but not permitted to perform the action.
   */
  static forbidden(
    message: string,
    code: ErrorCode = ErrorCode.FORBIDDEN,
  ): AppError {
    return new AppError(message, 403, code);
  }

  /**
   * 404 Not Found — the requested resource does not exist.
   */
  static notFound(
    message: string,
    code: ErrorCode = ErrorCode.NOTE_NOT_FOUND,
  ): AppError {
    return new AppError(message, 404, code);
  }

  /**
   * 409 Conflict — the request conflicts with existing state (e.g. duplicate email).
   */
  static conflict(
    message: string,
    code: ErrorCode = ErrorCode.EMAIL_EXISTS,
  ): AppError {
    return new AppError(message, 409, code);
  }

  /**
   * 500 Internal Server Error — unexpected server-side failure.
   */
  static internal(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
  ): AppError {
    return new AppError(message, 500, code);
  }

  /**
   * 503 Service Unavailable — a downstream service (e.g. AI) is unreachable.
   */
  static serviceUnavailable(
    message: string,
    code: ErrorCode = ErrorCode.AI_SERVICE_UNAVAILABLE,
  ): AppError {
    return new AppError(message, 503, code);
  }
}
