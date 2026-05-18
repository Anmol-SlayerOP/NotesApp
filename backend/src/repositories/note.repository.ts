import { query } from '../db/connection';
import { Note, PaginatedNotes } from '../types';
import { CreateNoteDto, UpdateNoteDto, PaginationDto } from '../types/dto';

/**
 * Repository interface for note data access operations.
 */
export interface NoteRepository {
  create(userId: string, data: CreateNoteDto): Promise<Note>;
  findById(noteId: string): Promise<Note | null>;
  findByUserId(userId: string, pagination: PaginationDto): Promise<PaginatedNotes>;
  findSharedWithUser(userId: string, pagination: PaginationDto): Promise<Note[]>;
  update(noteId: string, data: UpdateNoteDto): Promise<Note>;
  delete(noteId: string): Promise<void>;
  search(userId: string, queryStr: string, pagination: PaginationDto): Promise<PaginatedNotes>;
  findAllByUserId(userId: string): Promise<Note[]>;
}

interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  priority: number;
  pinned: boolean;
  created_at: Date;
  modified_at: Date;
  is_shared?: boolean;
}

function mapRowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    content: row.content,
    priority: Number(row.priority),
    pinned: row.pinned,
    created_at: row.created_at,
    modified_at: row.modified_at,
    is_shared: row.is_shared ?? false,
  };
}

export class NoteRepositoryImpl implements NoteRepository {
  /**
   * Creates a new note owned by the given user.
   */
  async create(userId: string, data: CreateNoteDto): Promise<Note> {
    const result = await query<NoteRow>(
      `INSERT INTO notes (id, user_id, title, content, priority, pinned)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id, user_id, title, content, priority, pinned, created_at, modified_at`,
      [userId, data.title, data.content, data.priority ?? 3, data.pinned ?? false],
    );
    return mapRowToNote(result.rows[0]);
  }

  /**
   * Finds a note by its UUID. Returns null if not found.
   */
  async findById(noteId: string): Promise<Note | null> {
    const result = await query<NoteRow>(
      `SELECT id, user_id, title, content, priority, pinned, created_at, modified_at
       FROM notes
       WHERE id = $1`,
      [noteId],
    );
    if (result.rows.length === 0) return null;
    return mapRowToNote(result.rows[0]);
  }

  /**
   * Returns all notes owned by a user, sorted and paginated.
   * Sort order: pinned DESC, priority DESC, modified_at DESC.
   */
  async findByUserId(userId: string, pagination: PaginationDto): Promise<PaginatedNotes> {
    const { page, page_size } = pagination;
    const offset = (page - 1) * page_size;

    const [dataResult, countResult] = await Promise.all([
      query<NoteRow>(
        `SELECT id, user_id, title, content, priority, pinned, created_at, modified_at,
                FALSE AS is_shared
         FROM notes
         WHERE user_id = $1
         ORDER BY pinned DESC, priority DESC, modified_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, page_size, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM notes WHERE user_id = $1`,
        [userId],
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    return {
      notes: dataResult.rows.map(mapRowToNote),
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    };
  }

  /**
   * Returns all notes shared with a user (not owned by them).
   */
  async findSharedWithUser(userId: string, pagination: PaginationDto): Promise<Note[]> {
    const { page_size, page } = pagination;
    const offset = (page - 1) * page_size;

    const result = await query<NoteRow>(
      `SELECT n.id, n.user_id, n.title, n.content, n.priority, n.pinned,
              n.created_at, n.modified_at, TRUE AS is_shared
       FROM notes n
       INNER JOIN shares s ON s.note_id = n.id
       WHERE s.shared_with_user_id = $1
       ORDER BY n.pinned DESC, n.priority DESC, n.modified_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, page_size, offset],
    );
    return result.rows.map(mapRowToNote);
  }

  /**
   * Updates specified fields on a note and refreshes modified_at.
   */
  async update(noteId: string, data: UpdateNoteDto): Promise<Note> {
    // Build dynamic SET clause from provided fields only
    const setClauses: string[] = ['modified_at = NOW()'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (data.title !== undefined) {
      setClauses.push(`title = $${paramIdx++}`);
      params.push(data.title);
    }
    if (data.content !== undefined) {
      setClauses.push(`content = $${paramIdx++}`);
      params.push(data.content);
    }
    if (data.priority !== undefined) {
      setClauses.push(`priority = $${paramIdx++}`);
      params.push(data.priority);
    }
    if (data.pinned !== undefined) {
      setClauses.push(`pinned = $${paramIdx++}`);
      params.push(data.pinned);
    }

    params.push(noteId);

    const result = await query<NoteRow>(
      `UPDATE notes
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx}
       RETURNING id, user_id, title, content, priority, pinned, created_at, modified_at`,
      params,
    );
    return mapRowToNote(result.rows[0]);
  }

  /**
   * Deletes a note by ID. Shares are cascade-deleted by the DB constraint.
   */
  async delete(noteId: string): Promise<void> {
    await query(`DELETE FROM notes WHERE id = $1`, [noteId]);
  }

  /**
   * Full-text search across notes accessible to a user (owned + shared).
   * Uses PostgreSQL to_tsvector / plainto_tsquery for case-insensitive matching.
   */
  async search(userId: string, queryStr: string, pagination: PaginationDto): Promise<PaginatedNotes> {
    const { page, page_size } = pagination;
    const offset = (page - 1) * page_size;

    // Accessible note IDs = owned + shared
    const [dataResult, countResult] = await Promise.all([
      query<NoteRow>(
        `SELECT DISTINCT n.id, n.user_id, n.title, n.content, n.priority, n.pinned,
                n.created_at, n.modified_at,
                (n.user_id != $1) AS is_shared
         FROM notes n
         LEFT JOIN shares s ON s.note_id = n.id AND s.shared_with_user_id = $1
         WHERE (n.user_id = $1 OR s.shared_with_user_id = $1)
           AND to_tsvector('english', n.title || ' ' || n.content) @@ plainto_tsquery('english', $2)
         ORDER BY n.pinned DESC, n.priority DESC, n.modified_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, queryStr, page_size, offset],
      ),
      query<{ count: string }>(
        `SELECT COUNT(DISTINCT n.id) AS count
         FROM notes n
         LEFT JOIN shares s ON s.note_id = n.id AND s.shared_with_user_id = $1
         WHERE (n.user_id = $1 OR s.shared_with_user_id = $1)
           AND to_tsvector('english', n.title || ' ' || n.content) @@ plainto_tsquery('english', $2)`,
        [userId, queryStr],
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    return {
      notes: dataResult.rows.map(mapRowToNote),
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    };
  }

  /**
   * Returns all notes owned by a user without pagination (used by AI analyzer).
   */
  async findAllByUserId(userId: string): Promise<Note[]> {
    const result = await query<NoteRow>(
      `SELECT id, user_id, title, content, priority, pinned, created_at, modified_at
       FROM notes
       WHERE user_id = $1
       ORDER BY pinned DESC, priority DESC, modified_at DESC`,
      [userId],
    );
    return result.rows.map(mapRowToNote);
  }
}

export const noteRepository = new NoteRepositoryImpl();
