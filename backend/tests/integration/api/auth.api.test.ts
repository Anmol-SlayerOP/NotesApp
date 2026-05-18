import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { agent } from '../../helpers/test-server';
import { clearDatabase, closeDatabase } from '../../helpers/test-db';

describe('Auth API', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ── POST /register ──────────────────────────────────────────────────────────

  describe('POST /register', () => {
    it('returns 201 and success message for valid input', async () => {
      const res = await agent
        .post('/register')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('userId');
      expect(res.body.email).toBe('user@example.com');
    });

    it('returns 409 when email is already registered', async () => {
      await agent
        .post('/register')
        .send({ email: 'dup@example.com', password: 'password123' });

      const res = await agent
        .post('/register')
        .send({ email: 'dup@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('returns 400 for invalid email', async () => {
      const res = await agent
        .post('/register')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for password shorter than 8 characters', async () => {
      const res = await agent
        .post('/register')
        .send({ email: 'user@example.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error.details).toHaveProperty('password');
    });

    it('returns 400 when email is missing', async () => {
      const res = await agent
        .post('/register')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const res = await agent
        .post('/register')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(400);
    });

    it('does not expose password hash in response', async () => {
      const res = await agent
        .post('/register')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(JSON.stringify(res.body)).not.toContain('password_hash');
      expect(JSON.stringify(res.body)).not.toContain('password123');
    });
  });

  // ── POST /login ─────────────────────────────────────────────────────────────

  describe('POST /login', () => {
    beforeEach(async () => {
      await agent
        .post('/register')
        .send({ email: 'login@example.com', password: 'password123' });
    });

    it('returns 200 and access_token for valid credentials', async () => {
      const res = await agent
        .post('/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token.length).toBeGreaterThan(0);
    });

    it('returns 401 for wrong password', async () => {
      const res = await agent
        .post('/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 for non-existent email', async () => {
      const res = await agent
        .post('/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 for invalid email format', async () => {
      const res = await agent
        .post('/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when fields are missing', async () => {
      const res = await agent.post('/login').send({});
      expect(res.status).toBe(400);
    });
  });
});
