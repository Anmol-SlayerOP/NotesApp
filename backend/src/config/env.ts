import dotenv from 'dotenv';

// Load .env file (no-op in production where env vars are set directly)
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function optionalEnvInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got: "${raw}"`);
  }
  return parsed;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiration: string;
  geminiApiKey: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  dbPoolMin: number;
  dbPoolMax: number;
}

function loadConfig(): AppConfig {
  return {
    port: optionalEnvInt('PORT', 3000),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
    // Required — will throw if missing
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtSecret: requireEnv('JWT_SECRET'),
    geminiApiKey: requireEnv('GEMINI_API_KEY'),
    // Optional with sensible defaults
    jwtExpiration: optionalEnv('JWT_EXPIRATION', '7d'),
    rateLimitWindowMs: optionalEnvInt('RATE_LIMIT_WINDOW_MS', 900000),
    rateLimitMaxRequests: optionalEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),
    dbPoolMin: optionalEnvInt('DB_POOL_MIN', 2),
    dbPoolMax: optionalEnvInt('DB_POOL_MAX', 10),
  };
}

export const config: AppConfig = loadConfig();
