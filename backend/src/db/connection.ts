import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/env';

/**
 * PostgreSQL connection pool.
 *
 * SSL is enabled (with rejectUnauthorized: false) in production so the app
 * works with Render-hosted PostgreSQL, which uses self-signed certificates.
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  min: config.dbPoolMin,
  max: config.dbPoolMax,
  ...(config.nodeEnv === 'production'
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(1);
});

/**
 * Convenience wrapper around pool.query that preserves full TypeScript
 * generics for row types.
 *
 * @example
 * const result = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
