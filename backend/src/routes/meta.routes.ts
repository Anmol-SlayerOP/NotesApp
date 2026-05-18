import { Router, Request, Response } from 'express';
import { openApiSpec } from '../openapi/spec';

const router = Router();

/**
 * GET /about
 * Returns service metadata. No authentication required.
 */
router.get('/about', (_req: Request, res: Response): void => {
  res.status(200).json({
    name: 'Your Name',
    email: 'your.email@example.com',
    'my features': {
      'Pin Notes':
        'Users can pin important notes so they always appear at the top of their notes list, providing quick access to high-priority information.',
      'Priority Sorting':
        'Notes support a 1–5 priority level. The notes list is sorted by pinned status first, then by priority descending, ensuring the most important notes are always visible first.',
      'AI Important Notes':
        'The GET /important endpoint uses Google Gemini AI to analyze all of a user\'s notes and return a ranked list of contextually important ones with explanations — acting as an intelligent reminder system.',
    },
  });
});

/**
 * GET /health
 * Health check endpoint for Render.com and other platform monitors.
 */
router.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /openapi.json
 * Returns the OpenAPI 3.0 specification document.
 */
router.get('/openapi.json', (_req: Request, res: Response): void => {
  res.status(200).json(openApiSpec);
});

export default router;
