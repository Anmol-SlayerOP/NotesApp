import { query } from '../db/connection';
import { User } from '../types';

/**
 * Repository interface for note-sharing data access operations.
 */
export interface ShareRepository {
  create(noteId: string, sharedWithUserId: string): Promise<void>;
  delete(noteId: string, sharedWithUserId: string): Promise<void>;
  deleteAllForNote(noteId: string): Promise<void>;
  findSharedUsers(noteId: string): Promise<Pick<User, 'id' | 'email'>[]>;
  isSharedWith(noteId: string, userId: string): Promise<boolean>;
}

interface ShareUserRow {
  id: string;
  email: string;
}

export class ShareRepositoryImpl implements ShareRepository {
  /**
   * Creates a sharing relationship between a note and a user.
   * Uses ON CONFLICT DO NOTHING to make the operation idempotent —
   * sharing the same note with the same user twice is a no-op.
   */
  async create(noteId: string, sharedWithUserId: string): Promise<void> {
    await query(
      `INSERT INTO shares (id, note_id, shared_with_user_id)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (note_id, shared_with_user_id) DO NOTHING`,
      [noteId, sharedWithUserId],
    );
  }

  /**
   * Removes a specific sharing relationship.
   */
  async delete(noteId: string, sharedWithUserId: string): Promise<void> {
    await query(
      `DELETE FROM shares WHERE note_id = $1 AND shared_with_user_id = $2`,
      [noteId, sharedWithUserId],
    );
  }

  /**
   * Removes all sharing relationships for a note.
   * Called before deleting a note to ensure clean cascade behaviour
   * (the DB ON DELETE CASCADE also handles this, but explicit cleanup
   * is safer when called from the service layer).
   */
  async deleteAllForNote(noteId: string): Promise<void> {
    await query(`DELETE FROM shares WHERE note_id = $1`, [noteId]);
  }

  /**
   * Returns the list of users a note has been shared with.
   */
  async findSharedUsers(noteId: string): Promise<Pick<User, 'id' | 'email'>[]> {
    const result = await query<ShareUserRow>(
      `SELECT u.id, u.email
       FROM users u
       INNER JOIN shares s ON s.shared_with_user_id = u.id
       WHERE s.note_id = $1`,
      [noteId],
    );
    return result.rows.map((row) => ({ id: row.id, email: row.email }));
  }

  /**
   * Returns true when the note has been shared with the given user.
   */
  async isSharedWith(noteId: string, userId: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM shares
         WHERE note_id = $1 AND shared_with_user_id = $2
       ) AS exists`,
      [noteId, userId],
    );
    return result.rows[0].exists;
  }
}

export const shareRepository = new ShareRepositoryImpl();
