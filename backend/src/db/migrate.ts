/**
 * Database migration script.
 *
 * Reads schema.sql from the same directory and executes it against the
 * configured PostgreSQL database.
 *
 * Usage:
 *   npm run migrate
 *   # or directly:
 *   ts-node src/db/migrate.ts
 */

import fs from 'fs';
import path from 'path';
import { pool } from './connection';

async function migrate(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');

  console.log(`Reading schema from: ${schemaPath}`);

  let sql: string;
  try {
    sql = fs.readFileSync(schemaPath, 'utf8');
  } catch (err) {
    console.error('Failed to read schema.sql:', err);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('Running migration…');
    await client.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
