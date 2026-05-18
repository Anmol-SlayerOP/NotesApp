import { query } from '../db/connection';
import { User } from '../types';

/**
 * Repository interface for user data access operations.
 */
export interface UserRepository {
  create(email: string, passwordHash: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(userId: string): Promise<User | null>;
  exists(email: string): Promise<boolean>;
}

/**
 * Row shape returned by the database for the users table.
 */
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Maps a snake_case database row to the camelCase User domain model.
 */
function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.email, // email serves as the unique identifier / username
    email: row.email,
    password_hash: row.password_hash,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * PostgreSQL-backed implementation of UserRepository.
 * All queries use parameterized placeholders ($1, $2, …) to prevent SQL injection.
 */
export class UserRepositoryImpl implements UserRepository {
  /**
   * Inserts a new user record and returns the created user.
   */
  async create(email: string, passwordHash: string): Promise<User> {
    const result = await query<UserRow>(
      `INSERT INTO users (id, email, password_hash)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id, email, password_hash, created_at, updated_at`,
      [email, passwordHash],
    );
    return mapRowToUser(result.rows[0]);
  }

  /**
   * Finds a user by their email address.
   * Returns null when no matching record exists.
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await query<UserRow>(
      `SELECT id, email, password_hash, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToUser(result.rows[0]);
  }

  /**
   * Finds a user by their UUID primary key.
   * Returns null when no matching record exists.
   */
  async findById(userId: string): Promise<User | null> {
    const result = await query<UserRow>(
      `SELECT id, email, password_hash, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToUser(result.rows[0]);
  }

  /**
   * Returns true when a user with the given email already exists.
   */
  async exists(email: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) AS exists`,
      [email],
    );
    return result.rows[0].exists;
  }
}

/**
 * Singleton instance for use throughout the application.
 */
export const userRepository = new UserRepositoryImpl();
