import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Load .env.test so property-based tests have required env vars
    // without needing a real database connection.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/notes_test',
      JWT_SECRET: 'test-secret-key-for-unit-tests-only-not-production',
      JWT_EXPIRATION: '1h',
      GEMINI_API_KEY: 'test-gemini-key',
      GEMINI_MODEL: 'gemini-1.5-flash-latest',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX_REQUESTS: '1000',
      DB_POOL_MIN: '1',
      DB_POOL_MAX: '2',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/db/migrate.ts'],
    },
    // Increase timeout for integration tests that hit a real DB
    testTimeout: 15000,
  },
});
