import { Router, Response, NextFunction } from 'express';
import { noteService } from '../services/note.service';
import { authenticate } from '../middleware/auth.middleware';
import { validateSearch, validatePagination } from '../middleware/validation.middleware';
import { AuthenticatedRequest } from '../types';
import { PaginationDto } from '../types/dto';

const router = Router();

/**
 * GET /search?q=keyword&page=1&page_size=20
 * Full-text search across notes accessible to the authenticated user.
 * Returns empty results for an empty query string.
 */
router.get(
  '/',
  authenticate,
  validateSearch,
  validatePagination,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const q = (req.query as Record<string, string>).q ?? '';
      const pagination = req.query as unknown as PaginationDto;
      const result = await noteService.searchNotes(userId, q, pagination);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
