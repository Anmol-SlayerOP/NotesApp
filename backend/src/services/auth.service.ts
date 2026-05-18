import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { AppError, ErrorCode } from '../types/errors';

const SALT_ROUNDS = 12;

/**
 * JWT payload shape stored inside the token.
 */
interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Public interface for authentication operations.
 */
export interface AuthService {
  register(email: string, password: string): Promise<{ userId: string; email: string }>;
  login(email: string, password: string): Promise<{ access_token: string; userId: string }>;
  verifyToken(token: string): { userId: string; email: string } | null;
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}

/**
 * Concrete implementation of AuthService backed by bcrypt and jsonwebtoken.
 */
export class AuthServiceImpl implements AuthService {
  constructor(
    private readonly userRepo: UserRepository = userRepository,
    private readonly saltRounds: number = SALT_ROUNDS,
  ) {}

  /**
   * Hashes a plain-text password using bcrypt with configurable salt rounds.
   * Production uses SALT_ROUNDS=12; tests can inject 1 for speed.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compares a plain-text password against a bcrypt hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Registers a new user.
   * Throws a 409 Conflict if the email is already taken.
   */
  async register(email: string, password: string): Promise<{ userId: string; email: string }> {
    const emailExists = await this.userRepo.exists(email);
    if (emailExists) {
      throw AppError.conflict('Email already registered', ErrorCode.EMAIL_EXISTS);
    }

    const passwordHash = await this.hashPassword(password);
    const user = await this.userRepo.create(email, passwordHash);

    return { userId: user.id, email: user.email as string };
  }

  /**
   * Authenticates a user and returns a signed JWT access token.
   * Throws a 401 Unauthorized if the credentials are invalid.
   */
  async login(email: string, password: string): Promise<{ access_token: string; userId: string }> {
    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw AppError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    const passwordMatches = await this.comparePassword(password, user.password_hash);
    if (!passwordMatches) {
      throw AppError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    const payload: JwtPayload = { userId: user.id, email: user.email as string };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration,
    } as jwt.SignOptions);

    return { access_token: token, userId: user.id };
  }

  /**
   * Verifies a JWT and returns the decoded payload.
   * Returns null for any error (expired, tampered, malformed, etc.).
   */
  verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      return { userId: decoded.userId, email: decoded.email };
    } catch {
      return null;
    }
  }
}

/**
 * Singleton instance for use throughout the application.
 */
export const authService = new AuthServiceImpl();
