import * as fc from 'fast-check';

/** Valid email addresses */
export const arbEmail = () =>
  fc
    .tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), {
        minLength: 3,
        maxLength: 20,
      }),
      fc.constantFrom('example.com', 'test.org', 'mail.net'),
    )
    .map(([local, domain]) => `${local}@${domain}`);

/** Valid passwords (min 8 chars) */
export const arbPassword = () =>
  fc.string({ minLength: 8, maxLength: 50 }).filter((s) => s.trim().length >= 8);

/** Invalid emails */
export const arbInvalidEmail = () =>
  fc.oneof(
    fc.constant(''),
    fc.constant('notanemail'),
    fc.constant('@nodomain'),
    fc.constant('no@'),
    fc.string({ maxLength: 5 }).filter((s) => !s.includes('@')),
  );

/** Invalid passwords (too short) */
export const arbInvalidPassword = () =>
  fc.string({ maxLength: 7 });

/** A pair of distinct emails */
export const arbEmailPair = () =>
  fc
    .tuple(arbEmail(), arbEmail())
    .filter(([a, b]) => a !== b);
