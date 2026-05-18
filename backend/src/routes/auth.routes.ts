import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { validateRegistration, validateLogin } from '../middleware/validation.middleware';
import { RegisterDto, LoginDto } from '../types/dto';

const router = Router();

/**
 * POST /register
 * Creates a new user account.
 * Body: { email, password }
 * Response 201: { message, userId, email }
 */
router.post(
  '/register',
  validateRegistration,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as RegisterDto;
      const result = await authService.register(email, password);
      res.status(201).json({
        message: 'User registered successfully',
        userId: result.userId,
        email: result.email,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /login
 * Authenticates a user and returns a JWT access token.
 * Body: { email, password }
 * Response 200: { access_token }
 * Response 401: { error: { code: INVALID_CREDENTIALS, message } }
 */
router.post(
  '/login',
  validateLogin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as LoginDto;
      const result = await authService.login(email, password);
      res.status(200).json({ access_token: result.access_token });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
