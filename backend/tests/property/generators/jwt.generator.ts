import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { config } from '../../../src/config/env';

/** A valid JWT signed with the app secret */
export const arbValidJwt = () =>
  fc
    .record({
      userId: fc.uuid(),
      email: fc
        .tuple(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), {
            minLength: 3,
            maxLength: 10,
          }),
          fc.constantFrom('example.com', 'test.org'),
        )
        .map(([l, d]) => `${l}@${d}`),
    })
    .map(({ userId, email }) =>
      jwt.sign({ userId, email }, config.jwtSecret, { expiresIn: '1h' }),
    );

/** An expired JWT */
export const arbExpiredJwt = () =>
  fc
    .record({ userId: fc.uuid(), email: fc.constant('expired@example.com') })
    .map(({ userId, email }) =>
      jwt.sign({ userId, email }, config.jwtSecret, { expiresIn: '-1s' }),
    );

/** A JWT signed with a wrong secret */
export const arbInvalidJwt = () =>
  fc
    .record({ userId: fc.uuid(), email: fc.constant('invalid@example.com') })
    .map(({ userId, email }) =>
      jwt.sign({ userId, email }, 'wrong-secret', { expiresIn: '1h' }),
    );

/** Completely random strings that are not valid JWTs */
export const arbGarbageJwt = () =>
  fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('.'));
