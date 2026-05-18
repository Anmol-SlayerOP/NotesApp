import { Router, Response, NextFunction } from 'express';
import { noteService } from '../services/note.service';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';
import { PaginationDto } from '../types/dto';
import { AppError, ErrorCode } from '../types/errors';
import { z } from 'zod';

const router = Router();

// Combined schema that validates q + pagination in one pass,
// so nothing gets stripped when req.query is replaced.
const searchQuerySchema = z.object({
  q: z.string({ required_error: 'Search query q is required' }),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /search?q=keyword&page=1&page_size=20
 * Case-insensitive search across notes accessible to the authenticated user.
 * Returns empty results for an empty query string.
 */
router.get(
  '/',
  authenticate,
  (req, _res, next) => {
    const result = searchQuerySchema.safeParse(req.query);
    if (!result.success) {
      const details: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : '_root';
        details[field] = issue.message;
      }
      return next(
        AppError.badRequest('Validation failed', ErrorCode.VALIDATION_ERROR, details),
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).query = result.data;
    next();
  },
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { q, page, page_size } = req.query as unknown as { q: string; page: number; page_size: number };
      const pagination: PaginationDto = { page, page_size };
      const result = await noteService.searchNotes(userId, q, pagination);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
