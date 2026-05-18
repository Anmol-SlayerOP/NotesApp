import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { agent } from '../../helpers/test-server';
import { clearDatabase, closeDatabase } from '../../helpers/test-db';
import { createUser, createNote } from '../../helpers/fixtures';

describe('Search API', () => {
  let token: string;

  beforeEach(async () => {
    await clearDatabase();
    const user = await createUser('searcher@example.com', 'password123');
    token = user.token;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('GET /search', () => {
    it('returns notes matching the query in title', async () => {
      await createNote(token, { title: 'Meeting notes', content: 'Agenda items' });
      await createNote(token, { title: 'Shopping list', content: 'Milk, eggs' });

      const res = await agent
        .get('/search?q=meeting')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(1);
      expect(res.body.notes[0].title).toBe('Meeting notes');
    });

    it('returns notes matching the query in content', async () => {
      await createNote(token, { title: 'Note 1', content: 'Important deadline tomorrow' });
      await createNote(token, { title: 'Note 2', content: 'Nothing special here' });

      const res = await agent
        .get('/search?q=deadline')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(1);
      expect(res.body.notes[0].title).toBe('Note 1');
    });

    it('is case-insensitive', async () => {
      await createNote(token, { title: 'TypeScript Tips', content: 'Use strict mode' });

      const res = await agent
        .get('/search?q=typescript')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(1);
    });

    it('returns empty results for empty query string', async () => {
      await createNote(token, { title: 'Some note', content: 'Content' });

      const res = await agent
        .get('/search?q=')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(0);
    });

    it('returns empty results when no notes match', async () => {
      await createNote(token, { title: 'Unrelated', content: 'Nothing here' });

      const res = await agent
        .get('/search?q=xyznotfound')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(0);
    });

    it('supports pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createNote(token, { title: `Note ${i}`, content: 'searchable content' });
      }

      const res = await agent
        .get('/search?q=searchable&page=1&page_size=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(2);
      expect(res.body.total).toBe(5);
    });

    it('only returns notes accessible to the user', async () => {
      const other = await createUser('other@example.com', 'password123');
      await createNote(other.token, { title: 'Private note', content: 'secret content' });

      const res = await agent
        .get('/search?q=secret')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(0);
    });

    it('includes shared notes in search results', async () => {
      const owner = await createUser('owner2@example.com', 'password123');
      const note = await createNote(owner.token, {
        title: 'Shared searchable',
        content: 'findme',
      });

      await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ share_with_email: 'searcher@example.com' });

      const res = await agent
        .get('/search?q=findme')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(1);
    });

    it('returns 401 without token', async () => {
      const res = await agent.get('/search?q=test');
      expect(res.status).toBe(401);
    });

    it('returns 400 when q param is missing', async () => {
      const res = await agent
        .get('/search')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});
