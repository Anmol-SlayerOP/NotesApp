/**
 * Structured JSON logger.
 * Sensitive fields are stripped before any log entry is written.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'access_token',
  'jwt',
  'authorization',
  'gemini_api_key',
  'api_key',
  'secret',
  'jwt_secret',
]);

type LogLevel = 'info' | 'warn' | 'error';
type Context = Record<string, unknown>;

/**
 * Recursively removes sensitive keys from an object before logging.
 */
function sanitize(obj: Context): Context {
  const result: Context = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitize(value as Context);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function log(level: LogLevel, message: string, context: Context = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitize(context),
  };
  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (message: string, context?: Context) => log('info', message, context),
  warn: (message: string, context?: Context) => log('warn', message, context),
  error: (message: string, context?: Context) => log('error', message, context),
};
