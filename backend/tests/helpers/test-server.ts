/**
 * Test server helper.
 * Creates a Supertest agent wrapping the Express app.
 * Does NOT start a real HTTP server — Supertest handles that internally.
 */
import request from 'supertest';
import app from '../../src/app';

export const agent = request(app);

/**
 * Registers a user and returns the JWT access token.
 */
export async function registerAndLogin(
  email: string,
  password: string,
): Promise<string> {
  await agent.post('/register').send({ email, password });
  const res = await agent.post('/login').send({ email, password });
  return (res.body as { access_token: string }).access_token;
}
