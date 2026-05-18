import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { agent } from '../../helpers/test-server';
import { clearDatabase, closeDatabase } from '../../helpers/test-db';
import { createUser, createNote } from '../../helpers/fixtures';

describe('Sharing API', () => {
  let token: string;
  let token2: string;
  let email2: string;

  beforeEach(async () => {
    await clearDatabase();
    const user1 = await createUser('owner@example.com', 'password123');
    const user2 = await createUser('recipient@example.com', 'password123');
    token = user1.token;
    token2 = user2.token;
    email2 = user2.email;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  // ── POST /notes/:id/share ───────────────────────────────────────────────────

  describe('POST /notes/:id/share', () => {
    it('shares a note and returns 200', async () => {
      const note = await createNote(token, { title: 'Shared Note' });

      const res = await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: email2 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('shared note is accessible by the recipient via GET /notes/:id', async () => {
      const note = await createNote(token, { title: 'Shared Note' });

      await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: email2 });

      const res = await agent
        .get(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(note.id);
      expect(res.body.is_shared).toBe(true);
    });

    it('shared note appears in recipient GET /notes list', async () => {
      const note = await createNote(token, { title: 'Shared Note' });

      await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: email2 });

      const res = await agent
        .get('/notes')
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      const ids = res.body.notes.map((n: { id: string }) => n.id);
      expect(ids).toContain(note.id);
    });

    it('is idempotent — sharing twice does not create duplicates', async () => {
      const note = await createNote(token);

      await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: email2 });

      const res = await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: email2 });

      expect(res.status).toBe(200);

      // Recipient should still see the note exactly once
      const listRes = await agent
        .get('/notes')
        .set('Authorization', `Bearer ${token2}`);
      const noteCount = listRes.body.notes.filter(
        (n: { id: string }) => n.id === note.id,
      ).length;
      expect(noteCount).toBe(1);
    });

    it('returns 403 when non-owner tries to share', async () => {
      const note = await createNote(token);

      const res = await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ share_with_email: 'other@example.com' });

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent note', async () => {
      const res = await agent
        .post('/notes/00000000-0000-0000-0000-000000000000/share')
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: email2 });

      expect(res.status).toBe(404);
    });

    it('returns 404 when target user does not exist', async () => {
      const note = await createNote(token);

      const res = await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: 'nobody@example.com' });

      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid email in share_with_email', async () => {
      const note = await createNote(token);

      const res = await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when owner tries to share with themselves', async () => {
      const note = await createNote(token);

      const res = await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: 'owner@example.com' });

      expect(res.status).toBe(400);
    });
  });

  // ── Cascade delete ──────────────────────────────────────────────────────────

  describe('Cascade delete', () => {
    it('deleting a note removes sharing — recipient can no longer access it', async () => {
      const note = await createNote(token);

      await agent
        .post(`/notes/${note.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({ share_with_email: email2 });

      // Confirm recipient can access
      const beforeDelete = await agent
        .get(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token2}`);
      expect(beforeDelete.status).toBe(200);

      // Owner deletes
      await agent
        .delete(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`);

      // Recipient can no longer access
      const afterDelete = await agent
        .get(`/notes/${note.id}`)
        .set('Authorization', `Bearer ${token2}`);
      expect(afterDelete.status).toBe(404);
    });
  });
});
