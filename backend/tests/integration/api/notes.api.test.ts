import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { agent } from '../../helpers/test-server';
import { clearDatabase, closeDatabase } from '../../helpers/test-db';
import { createUser, createNote } from '../../helpers/fixtures';

describe('Notes API', () => {
  let token: string;
  let token2: string;

  beforeEach(async () => {
    await clearDatabase();
    const user1 = await createUser('user1@example.com', 'password123');
    const user2 = await createUser('user2@example.com', 'password123');
    token = user1.token;
    token2 = user2.token;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ── POST /notes ─────────────────────────────────────────────────────────────

  describe('POST /notes', () => {
    it('creates a note and returns 201', async () => {
      const res = await agent
        .post('/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'My Note', content: 'Hello world', priority: 4, pinned: true });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('My Note');
      expect(res.body.content).toBe('Hello world');
      expect(res.body.priority).toBe(4);
      expect(res.body.pinned).toBe(true);
      expect(res.body.id).toBeDefined();
      expect(res.body.created_at).toBeDefined();
      expect(res.body.modified_at).toBeDefined();
    });

    it('defaults priority to 3 when not provided', async () => {
      const res = await agent
        .post('/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'No Priority', content: 'Content' });

      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(3);
    });

    it('defaults pinned to false when not provided', async () => {
      const res = await agent
        .post('/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'No Pin', content: 'Content' });

      expect(res.status).toBe(201);
      expect(res.body.pinned).toBe(false);
    });

    it('returns 400 when title is missing', async () => {
      const res = await agent
        .post('/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Content' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when content is missing', async () => {
      const res = await agent
        .post('/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Title' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for priority outside 1-5', async () => {
      const res = await agent
        .post('/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Title', content: 'Content', priority: 6 });

      expect(res.status).toBe(400);
    });

    it('returns 401 without token', async () => {
      const res = await agent
        .post('/notes')
        .send({ title: 'Title', content: 'Content' });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /notes ──────────────────────────────────────────────────────────────

  describe('GET /notes', () => {
    it('returns all notes owned by the user', async () => {
      await createNote(token, { title: 'Note 1' });
      await createNote(token, { title: 'Note 2' });

      const res = await agent
        .get('/notes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('returns empty list when user has no notes', async () => {
      const res = await agent
        .get('/notes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(0);
    });

    it('returns pinned notes before unpinned', async () => {
      await createNote(token, { title: 'Unpinned', pinned: false, priority: 5 });
      await createNote(token, { title: 'Pinned', pinned: true, priority: 1 });

      const res = await agent
        .get('/notes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.notes[0].title).toBe('Pinned');
      expect(res.body.notes[1].title).toBe('Unpinned');
    });

    it('sorts by priority descending within same pinned status', async () => {
      await createNote(token, { title: 'Low', priority: 1, pinned: false });
      await createNote(token, { title: 'High', priority: 5, pinned: false });
      await createNote(token, { title: 'Mid', priority: 3, pinned: false });

      const res = await agent
        .get('/notes')
        .set('Authorization', `Bearer ${token}`);

      const titles = res.body.notes.map((n: { title: string }) => n.title);
      expect(titles).toEqual(['High', 'Mid', 'Low']);
    });

    it('supports pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createNote(token, { title: `Note ${i}` });
      }

      const res = await agent
        .get('/notes?page=1&page_size=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.notes).toHaveLength(2);
      expect(res.body.total).toBe(5);
      expect(res.body.total_pages).toBe(3);
    });

    it('returns 401 without token', async () => {
      const res = await agent.get('/notes');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /notes/:id ──────────────────────────────────────────────────────────

  describe('GET /notes/:id', () => {
    it('returns the note for the owner', async () => {
      const note = await createNote(token, { title: 'My Note' });

      const res = await agent
        .get(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(note.id);
      expect(res.body.title).toBe('My Note');
    });

    it('returns 404 for non-existent note', async () => {
      const res = await agent
        .get('/notes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('returns 403 when user does not own or have access to the note', async () => {
      const note = await createNote(token, { title: 'Private' });

      const res = await agent
        .get(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const note = await createNote(token);
      const res = await agent.get(`/notes/${note.id}`);
      expect(res.status).toBe(401);
    });
  });

  // ── PUT /notes/:id ──────────────────────────────────────────────────────────

  describe('PUT /notes/:id', () => {
    it('updates the note and returns 200', async () => {
      const note = await createNote(token, { title: 'Old Title' });

      const res = await agent
        .put(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title', priority: 5 });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New Title');
      expect(res.body.priority).toBe(5);
    });

    it('updates modified_at timestamp', async () => {
      const note = await createNote(token);
      const originalModified = note.modified_at;

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10));

      const res = await agent
        .put(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(new Date(res.body.modified_at).getTime()).toBeGreaterThanOrEqual(
        new Date(originalModified).getTime(),
      );
    });

    it('returns 403 when user does not own the note', async () => {
      const note = await createNote(token);

      const res = await agent
        .put(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ title: 'Hacked' });

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent note', async () => {
      const res = await agent
        .put('/notes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('returns 400 when no fields are provided', async () => {
      const note = await createNote(token);

      const res = await agent
        .put(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('can pin and unpin a note', async () => {
      const note = await createNote(token, { pinned: false });

      const pinRes = await agent
        .put(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pinned: true });

      expect(pinRes.body.pinned).toBe(true);

      const unpinRes = await agent
        .put(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ pinned: false });

      expect(unpinRes.body.pinned).toBe(false);
    });
  });

  // ── DELETE /notes/:id ───────────────────────────────────────────────────────

  describe('DELETE /notes/:id', () => {
    it('deletes the note and returns 204', async () => {
      const note = await createNote(token);

      const res = await agent
        .delete(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      // Verify it's gone
      const getRes = await agent
        .get(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 403 when user does not own the note', async () => {
      const note = await createNote(token);

      const res = await agent
        .delete(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent note', async () => {
      const res = await agent
        .delete('/notes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
