import * as fc from 'fast-check';

/** Valid pagination parameters */
export const arbPagination = () =>
  fc.record({
    page: fc.integer({ min: 1, max: 100 }),
    page_size: fc.integer({ min: 1, max: 100 }),
  });

/** SQL injection attempt strings */
export const arbSQLInjection = () =>
  fc.constantFrom(
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "' OR 1=1--",
    "'; SELECT * FROM users; --",
    "1; DELETE FROM notes WHERE 1=1; --",
  );

/** XSS attempt strings */
export const arbXSSAttempt = () =>
  fc.constantFrom(
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    '<svg onload=alert(1)>',
    '"><script>alert(document.cookie)</script>',
  );

/** Combined injection attempts */
export const arbInjectionAttempt = () =>
  fc.oneof(arbSQLInjection(), arbXSSAttempt());

/** Invalid input for registration */
export const arbInvalidRegistrationInput = () =>
  fc.oneof(
    // Missing fields
    fc.constant({}),
    fc.constant({ email: 'user@example.com' }),
    fc.constant({ password: 'password123' }),
    // Invalid email
    fc.record({
      email: fc.constant('not-an-email'),
      password: fc.constant('password123'),
    }),
    // Short password
    fc.record({
      email: fc.constant('user@example.com'),
      password: fc.string({ maxLength: 7 }),
    }),
  );

/** A non-existent UUID */
export const arbNonExistentUuid = () =>
  fc.constant('00000000-0000-0000-0000-000000000000');

/** Search query strings */
export const arbSearchQuery = () =>
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
