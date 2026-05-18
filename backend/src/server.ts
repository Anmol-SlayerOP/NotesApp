import app from './app';
import { config } from './config/env';
import { pool } from './db/connection';
import { logger } from './utils/logger';

const PORT = config.port;

async function start(): Promise<void> {
  // Verify database connectivity before accepting traffic
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Failed to connect to database', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  // Bind to 0.0.0.0 so Render can route traffic to the container
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('Server started', {
      port: PORT,
      env: config.nodeEnv,
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

start();
