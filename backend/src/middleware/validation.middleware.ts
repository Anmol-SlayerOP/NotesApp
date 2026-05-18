import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError, ErrorCode } from '../types/errors';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be at most 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title must be at most 500 characters'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content must be at most 50000 characters'),
  priority: z.number().int('Priority must be an integer').min(1, 'Priority must be at least 1').max(5, 'Priority must be at most 5').optional().default(3),
  pinned: z.boolean().optional().default(false),
});

export const updateNoteSchema = z
  .object({
    title: z.string().min(1, 'Title must not be empty').max(500, 'Title must be at most 500 characters').optional(),
    content: z.string().min(1, 'Content must not be empty').max(50000, 'Content must be at most 50000 characters').optional(),
    priority: z.number().int('Priority must be an integer').min(1, 'Priority must be at least 1').max(5, 'Priority must be at most 5').optional(),
    pinned: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.content !== undefined ||
      data.priority !== undefined ||
      data.pinned !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export const shareNoteSchema = z.object({
  share_with_email: z.string().email('Must be a valid email address'),
});

export const searchSchema = z.object({
  q: z.string({ required_error: 'Search query is required' }),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int('Page must be an integer').min(1, 'Page must be at least 1').default(1),
  page_size: z.coerce.number().int('Page size must be an integer').min(1, 'Page size must be at least 1').max(100, 'Page size must be at most 100').default(20),
});

// ---------------------------------------------------------------------------
// Helper: convert ZodError to field-specific details map
// ---------------------------------------------------------------------------

function zodErrorToDetails(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : '_root';
    details[field] = issue.message;
  }
  return details;
}

// ---------------------------------------------------------------------------
// Middleware factory helpers
// ---------------------------------------------------------------------------

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = zodErrorToDetails(result.error);
      return next(
        AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, details),
      );
    }
    // Replace body with parsed (coerced/defaulted) values
    req.body = result.data;
    next();
  };
}

function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = zodErrorToDetails(result.error);
      return next(
        AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, details),
      );
    }
    // Replace query with parsed (coerced/defaulted) values
    (req as Request & { query: unknown }).query = result.data as Record<string, string>;
    next();
  };
}

// ---------------------------------------------------------------------------
// Exported middleware
// ---------------------------------------------------------------------------

/** Validates POST /register request body. */
export const validateRegistration = validateBody(registerSchema);

/** Validates POST /login request body. */
export const validateLogin = validateBody(loginSchema);

/** Validates POST /notes request body. */
export const validateCreateNote = validateBody(createNoteSchema);

/** Validates PUT /notes/:id request body (at least one field required). */
export const validateUpdateNote = validateBody(updateNoteSchema);

/** Validates POST /notes/:id/share request body. */
export const validateShareNote = validateBody(shareNoteSchema);

/** Validates GET /search query params. */
export const validateSearch = validateQuery(searchSchema);

/** Validates pagination query params (page, page_size). */
export const validatePagination = validateQuery(paginationSchema);
