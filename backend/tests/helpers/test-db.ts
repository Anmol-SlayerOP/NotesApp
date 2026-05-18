/**
 * Test database helpers.
 * Cleans tables between tests so each test suite starts with a fresh state.
 * Requires DATABASE_URL to point to a real PostgreSQL instance.
 */
import { pool, query } from '../../src/db/connection';

/**
 * Truncates all application tables in dependency order.
 * Call this in beforeEach / afterEach hooks.
 */
export async function clearDatabase(): Promise<void> {
  await query('TRUNCATE TABLE shares, notes, users RESTART IDENTITY CASCADE');
}

/**
 * Closes the connection pool. Call this in afterAll.
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
