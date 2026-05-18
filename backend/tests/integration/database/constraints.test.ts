import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { query } from '../../../src/db/connection';
import { clearDatabase, closeDatabase } from '../../helpers/test-db';
import { userRepository } from '../../../src/repositories/user.repository';
import { noteRepository } from '../../../src/repositories/note.repository';
import { shareRepository } from '../../../src/repositories/share.repository';

describe('Database Constraints', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Users table', () => {
    it('enforces unique email constraint', async () => {
      await userRepository.create('unique@example.com', 'hash1');

      await expect(
        userRepository.create('unique@example.com', 'hash2'),
      ).rejects.toThrow();
    });

    it('rejects null email', async () => {
      await expect(
        query('INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid(), NULL, $1)', ['hash']),
      ).rejects.toThrow();
    });

    it('rejects null password_hash', async () => {
      await expect(
        query('INSERT INTO users (id, email, password_hash) VALUES (gen_random_uuid(), $1, NULL)', ['test@example.com']),
      ).rejects.toThrow();
    });
  });

  describe('Notes table', () => {
    it('enforces priority CHECK constraint (1-5)', async () => {
      const user = await userRepository.create('noteuser@example.com', 'hash');

      await expect(
        query(
          'INSERT INTO notes (id, user_id, title, content, priority) VALUES (gen_random_uuid(), $1, $2, $3, $4)',
          [user.id, 'Title', 'Content', 6],
        ),
      ).rejects.toThrow();

      await expect(
        query(
          'INSERT INTO notes (id, user_id, title, content, priority) VALUES (gen_random_uuid(), $1, $2, $3, $4)',
          [user.id, 'Title', 'Content', 0],
        ),
      ).rejects.toThrow();
    });

    it('defaults priority to 3', async () => {
      const user = await userRepository.create('defpri@example.com', 'hash');
      const note = await noteRepository.create(user.id, { title: 'T', content: 'C' });
      expect(note.priority).toBe(3);
    });

    it('defaults pinned to false', async () => {
      const user = await userRepository.create('defpin@example.com', 'hash');
      const note = await noteRepository.create(user.id, { title: 'T', content: 'C' });
      expect(note.pinned).toBe(false);
    });

    it('cascades delete to notes when user is deleted', async () => {
      const user = await userRepository.create('cascade@example.com', 'hash');
      const note = await noteRepository.create(user.id, { title: 'T', content: 'C' });

      await query('DELETE FROM users WHERE id = $1', [user.id]);

      const found = await noteRepository.findById(note.id);
      expect(found).toBeNull();
    });
  });

  describe('Shares table', () => {
    it('enforces unique (note_id, shared_with_user_id) constraint via ON CONFLICT DO NOTHING', async () => {
      const owner = await userRepository.create('shareowner@example.com', 'hash');
      const recipient = await userRepository.create('sharerecip@example.com', 'hash');
      const note = await noteRepository.create(owner.id, { title: 'T', content: 'C' });

      // First share
      await shareRepository.create(note.id, recipient.id);

      // Second share — should not throw (ON CONFLICT DO NOTHING)
      await expect(shareRepository.create(note.id, recipient.id)).resolves.not.toThrow();

      // Verify only one share record exists
      const result = await query(
        'SELECT COUNT(*) AS count FROM shares WHERE note_id = $1 AND shared_with_user_id = $2',
        [note.id, recipient.id],
      );
      expect(parseInt(result.rows[0].count, 10)).toBe(1);
    });

    it('cascades delete shares when note is deleted', async () => {
      const owner = await userRepository.create('cascnote@example.com', 'hash');
      const recipient = await userRepository.create('cascrecip@example.com', 'hash');
      const note = await noteRepository.create(owner.id, { title: 'T', content: 'C' });

      await shareRepository.create(note.id, recipient.id);

      await noteRepository.delete(note.id);

      const result = await query(
        'SELECT COUNT(*) AS count FROM shares WHERE note_id = $1',
        [note.id],
      );
      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });

    it('cascades delete shares when user is deleted', async () => {
      const owner = await userRepository.create('cascusr@example.com', 'hash');
      const recipient = await userRepository.create('cascusrrecip@example.com', 'hash');
      const note = await noteRepository.create(owner.id, { title: 'T', content: 'C' });

      await shareRepository.create(note.id, recipient.id);

      await query('DELETE FROM users WHERE id = $1', [recipient.id]);

      const result = await query(
        'SELECT COUNT(*) AS count FROM shares WHERE shared_with_user_id = $1',
        [recipient.id],
      );
      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });
  });
});
