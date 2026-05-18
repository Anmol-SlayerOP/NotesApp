import { Router, Response, NextFunction } from 'express';
import { noteService } from '../services/note.service';
import { shareService } from '../services/share.service';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateCreateNote,
  validateUpdateNote,
  validateShareNote,
  validatePagination,
} from '../middleware/validation.middleware';
import { AuthenticatedRequest } from '../types';
import { CreateNoteDto, UpdateNoteDto, ShareNoteDto, PaginationDto } from '../types/dto';
import { AppError, ErrorCode } from '../types/errors';

const router = Router();

// All note routes require authentication
router.use(authenticate);

/**
 * GET /notes
 * Returns all notes accessible to the authenticated user (owned + shared).
 * Query params: page, page_size
 */
router.get(
  '/',
  validatePagination,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const pagination = req.query as unknown as PaginationDto;
      const result = await noteService.getAllNotes(userId, pagination);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /notes
 * Creates a new note.
 * Body: { title, content, priority?, pinned? }
 * Response 201: Note
 */
router.post(
  '/',
  validateCreateNote,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = req.body as CreateNoteDto;
      const note = await noteService.createNote(userId, data);
      res.status(201).json(note);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /notes/:id
 * Returns a specific note by ID.
 * User must own or have shared access to the note.
 */
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      if (!id || id.trim() === '') {
        throw AppError.badRequest('Note ID is required', ErrorCode.INVALID_INPUT);
      }

      const note = await noteService.getNoteById(id, userId);
      res.status(200).json(note);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /notes/:id
 * Updates a note. Only the owner may update.
 * Body: { title?, content?, priority?, pinned? } (at least one field)
 * Response 200: Updated Note
 */
router.put(
  '/:id',
  validateUpdateNote,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const data = req.body as UpdateNoteDto;
      const note = await noteService.updateNote(id, userId, data);
      res.status(200).json(note);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /notes/:id
 * Deletes a note. Only the owner may delete.
 * Response 204: No Content
 */
router.delete(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await noteService.deleteNote(id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /notes/:id/share
 * Shares a note with another user identified by email.
 * Body: { share_with_email }
 * Response 200: { message }
 */
router.post(
  '/:id/share',
  validateShareNote,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { share_with_email } = req.body as ShareNoteDto;
      await shareService.shareNote(id, userId, share_with_email);
      res.status(200).json({ message: 'Note shared successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
