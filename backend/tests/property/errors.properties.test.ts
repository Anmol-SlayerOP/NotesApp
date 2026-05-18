/**
 * Property-based tests for error handling.
 * Properties 21 and 22 from the design document.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AppError, ErrorCode } from '../../src/types/errors';

// ── Property 21: Error responses have correct status codes ───────────────────

describe('Property 21: Error Responses Have Correct Status Codes', () => {
  it('AppError.badRequest always produces status 400', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const err = AppError.badRequest(message);
        expect(err.statusCode).toBe(400);
      }),
      { numRuns: 50 },
    );
  });

  it('AppError.unauthorized always produces status 401', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const err = AppError.unauthorized(message);
        expect(err.statusCode).toBe(401);
      }),
      { numRuns: 50 },
    );
  });

  it('AppError.forbidden always produces status 403', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const err = AppError.forbidden(message);
        expect(err.statusCode).toBe(403);
      }),
      { numRuns: 50 },
    );
  });

  it('AppError.notFound always produces status 404', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const err = AppError.notFound(message);
        expect(err.statusCode).toBe(404);
      }),
      { numRuns: 50 },
    );
  });

  it('AppError.conflict always produces status 409', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const err = AppError.conflict(message);
        expect(err.statusCode).toBe(409);
      }),
      { numRuns: 50 },
    );
  });

  it('AppError.internal always produces status 500', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const err = AppError.internal(message);
        expect(err.statusCode).toBe(500);
      }),
      { numRuns: 50 },
    );
  });

  it('AppError.serviceUnavailable always produces status 503', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const err = AppError.serviceUnavailable(message);
        expect(err.statusCode).toBe(503);
      }),
      { numRuns: 50 },
    );
  });
});

// ── Property 22: Error responses have consistent structure ───────────────────

describe('Property 22: Error Responses Have Consistent Structure', () => {
  it('every AppError has a code and message', () => {
    const factories = [
      (m: string) => AppError.badRequest(m),
      (m: string) => AppError.unauthorized(m),
      (m: string) => AppError.forbidden(m),
      (m: string) => AppError.notFound(m),
      (m: string) => AppError.conflict(m),
      (m: string) => AppError.internal(m),
      (m: string) => AppError.serviceUnavailable(m),
    ];

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 0, max: factories.length - 1 }),
        (message, idx) => {
          const err = factories[idx](message);
          expect(err.message).toBe(message);
          expect(typeof err.code).toBe('string');
          expect(err.code.length).toBeGreaterThan(0);
          expect(err instanceof AppError).toBe(true);
          expect(err instanceof Error).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('AppError with details preserves field-level error information', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.record({
          field1: fc.string({ minLength: 1 }),
          field2: fc.string({ minLength: 1 }),
        }),
        (message, details) => {
          const err = AppError.badRequest(message, ErrorCode.VALIDATION_ERROR, details);
          expect(err.details).toEqual(details);
          expect(err.details!.field1).toBe(details.field1);
          expect(err.details!.field2).toBe(details.field2);
        },
      ),
      { numRuns: 50 },
    );
  });
});
