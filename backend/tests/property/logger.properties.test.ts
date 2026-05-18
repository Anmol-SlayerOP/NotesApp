/**
 * Property-based tests for sensitive data exclusion from logs.
 * Property 27 from the design document.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { logger } from '../../src/utils/logger';

const SENSITIVE_KEYS = [
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
];

describe('Property 27: Sensitive Data Exclusion from Logs', () => {
  let logOutput: string[] = [];
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logOutput = [];
    consoleSpy = vi.spyOn(console, 'log').mockImplementation((msg: string) => {
      logOutput.push(msg);
    });
    vi.spyOn(console, 'error').mockImplementation((msg: string) => {
      logOutput.push(msg);
    });
    vi.spyOn(console, 'warn').mockImplementation((msg: string) => {
      logOutput.push(msg);
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('sensitive keys are redacted in log output', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SENSITIVE_KEYS),
        fc.string({ minLength: 1, maxLength: 50 }),
        (sensitiveKey, sensitiveValue) => {
          logOutput = [];
          logger.info('Test log', { [sensitiveKey]: sensitiveValue });

          const combined = logOutput.join(' ');
          const parsed = JSON.parse(combined);

          // The key should be present but value should be [REDACTED]
          expect(parsed[sensitiveKey]).toBe('[REDACTED]');
          expect(parsed[sensitiveKey]).not.toBe(sensitiveValue);
        },
      ),
      { numRuns: SENSITIVE_KEYS.length * 3 },
    );
  });

  it('non-sensitive keys are logged normally', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (k) => !SENSITIVE_KEYS.includes(k.toLowerCase()),
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        (key, value) => {
          logOutput = [];
          logger.info('Test log', { [key]: value });

          const combined = logOutput.join(' ');
          const parsed = JSON.parse(combined);
          expect(parsed[key]).toBe(value);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('log entries always contain timestamp, level, and message', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('info', 'warn', 'error') as fc.Arbitrary<'info' | 'warn' | 'error'>,
        fc.string({ minLength: 1, maxLength: 100 }),
        (level, message) => {
          logOutput = [];
          logger[level](message);

          const combined = logOutput.join(' ');
          const parsed = JSON.parse(combined);
          expect(parsed.timestamp).toBeDefined();
          expect(parsed.level).toBe(level);
          expect(parsed.message).toBe(message);
        },
      ),
      { numRuns: 30 },
    );
  });
});
