import { Router, Response, NextFunction } from 'express';
import { aiAnalyzerService } from '../services/ai-analyzer.service';
import { authenticate } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /important
 * Uses Google Gemini AI to analyze the authenticated user's notes and
 * return a ranked list of contextually important ones with explanations.
 *
 * Response 200: ImportantNote[]
 * Response 503: AI service unavailable
 */
router.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const importantNotes = await aiAnalyzerService.analyzeImportantNotes(userId);
      res.status(200).json(importantNotes);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
