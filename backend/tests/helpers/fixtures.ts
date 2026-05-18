/**
 * Seed data helpers for integration tests.
 */
import { agent } from './test-server';

export interface TestUser {
  email: string;
  password: string;
  token: string;
}

export async function createUser(
  email = 'test@example.com',
  password = 'password123',
): Promise<TestUser> {
  await agent.post('/register').send({ email, password });
  const res = await agent.post('/login').send({ email, password });
  return { email, password, token: (res.body as { access_token: string }).access_token };
}

export async function createNote(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await agent
    .post('/notes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Test Note',
      content: 'Test content',
      priority: 3,
      pinned: false,
      ...overrides,
    });
  return res.body as {
    id: string;
    title: string;
    content: string;
    priority: number;
    pinned: boolean;
    created_at: string;
    modified_at: string;
  };
}
