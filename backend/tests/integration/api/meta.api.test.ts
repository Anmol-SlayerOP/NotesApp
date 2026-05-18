import { describe, it, expect } from 'vitest';
import { agent } from '../../helpers/test-server';

describe('Meta API', () => {
  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await agent.get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /about', () => {
    it('returns 200 with name and email fields', async () => {
      const res = await agent.get('/about');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('my features');
    });

    it('does not require authentication', async () => {
      const res = await agent.get('/about');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /openapi.json', () => {
    it('returns 200 with a valid OpenAPI 3.0 document', async () => {
      const res = await agent.get('/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.info).toBeDefined();
      expect(res.body.paths).toBeDefined();
    });

    it('documents all required endpoints', async () => {
      const res = await agent.get('/openapi.json');
      const paths = Object.keys(res.body.paths);
      expect(paths).toContain('/register');
      expect(paths).toContain('/login');
      expect(paths).toContain('/notes');
      expect(paths).toContain('/notes/{id}');
      expect(paths).toContain('/notes/{id}/share');
      expect(paths).toContain('/search');
      expect(paths).toContain('/important');
      expect(paths).toContain('/about');
      expect(paths).toContain('/health');
    });
  });
});
