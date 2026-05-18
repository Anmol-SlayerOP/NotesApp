import { Note, PaginatedNotes } from '../types';
import { CreateNoteDto, UpdateNoteDto, PaginationDto } from '../types/dto';
import { AppError, ErrorCode } from '../types/errors';
import { noteRepository, NoteRepository } from '../repositories/note.repository';
import { shareRepository, ShareRepository } from '../repositories/share.repository';

export interface NoteService {
  createNote(userId: string, data: CreateNoteDto): Promise<Note>;
  getNoteById(noteId: string, userId: string): Promise<Note>;
  getAllNotes(userId: string, pagination: PaginationDto): Promise<PaginatedNotes>;
  updateNote(noteId: string, userId: string, data: UpdateNoteDto): Promise<Note>;
  deleteNote(noteId: string, userId: string): Promise<void>;
  searchNotes(userId: string, queryStr: string, pagination: PaginationDto): Promise<PaginatedNotes>;
}

export class NoteServiceImpl implements NoteService {
  constructor(
    private readonly noteRepo: NoteRepository = noteRepository,
    private readonly shareRepo: ShareRepository = shareRepository,
  ) {}

  /**
   * Creates a new note owned by the authenticated user.
   * Defaults priority to 3 and pinned to false when not provided.
   */
  async createNote(userId: string, data: CreateNoteDto): Promise<Note> {
    return this.noteRepo.create(userId, {
      ...data,
      priority: data.priority ?? 3,
      pinned: data.pinned ?? false,
    });
  }

  /**
   * Retrieves a note by ID.
   * The requesting user must own the note or have it shared with them.
   * Returns 404 if the note doesn't exist, 403 if the user has no access.
   */
  async getNoteById(noteId: string, userId: string): Promise<Note> {
    const note = await this.noteRepo.findById(noteId);

    if (!note) {
      throw AppError.notFound('Note not found', ErrorCode.NOTE_NOT_FOUND);
    }

    if (note.user_id === userId) {
      return { ...note, is_shared: false };
    }

    const shared = await this.shareRepo.isSharedWith(noteId, userId);
    if (!shared) {
      throw AppError.forbidden('You do not have access to this note', ErrorCode.FORBIDDEN);
    }

    return { ...note, is_shared: true };
  }

  /**
   * Returns all notes accessible to the user (owned + shared),
   * merged and sorted: pinned first → priority desc → modified_at desc.
   * Supports pagination.
   */
  async getAllNotes(userId: string, pagination: PaginationDto): Promise<PaginatedNotes> {
    // Fetch owned notes (paginated) and all shared notes in parallel
    const [ownedResult, sharedNotes] = await Promise.all([
      this.noteRepo.findByUserId(userId, pagination),
      this.noteRepo.findSharedWithUser(userId, pagination),
    ]);

    // Merge, de-duplicate (shouldn't happen but guard anyway), and re-sort
    const noteMap = new Map<string, Note>();
    for (const n of ownedResult.notes) noteMap.set(n.id, n);
    for (const n of sharedNotes) {
      if (!noteMap.has(n.id)) noteMap.set(n.id, n);
    }

    const merged = Array.from(noteMap.values()).sort((a, b) => {
      // pinned first
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      // higher priority first
      if (a.priority !== b.priority) return b.priority - a.priority;
      // most recently modified first
      return new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime();
    });

    // Apply pagination to merged result
    const { page, page_size } = pagination;
    const offset = (page - 1) * page_size;
    const paginated = merged.slice(offset, offset + page_size);
    const total = merged.length;

    return {
      notes: paginated,
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    };
  }

  /**
   * Updates a note. Only the owner may update.
   * Throws 404 if not found, 403 if not the owner.
   */
  async updateNote(noteId: string, userId: string, data: UpdateNoteDto): Promise<Note> {
    const note = await this.noteRepo.findById(noteId);

    if (!note) {
      throw AppError.notFound('Note not found', ErrorCode.NOTE_NOT_FOUND);
    }

    if (note.user_id !== userId) {
      throw AppError.forbidden('You do not own this note', ErrorCode.NOT_OWNER);
    }

    return this.noteRepo.update(noteId, data);
  }

  /**
   * Deletes a note. Only the owner may delete.
   * Explicitly removes shares first (DB cascade also handles this).
   * Throws 404 if not found, 403 if not the owner.
   */
  async deleteNote(noteId: string, userId: string): Promise<void> {
    const note = await this.noteRepo.findById(noteId);

    if (!note) {
      throw AppError.notFound('Note not found', ErrorCode.NOTE_NOT_FOUND);
    }

    if (note.user_id !== userId) {
      throw AppError.forbidden('You do not own this note', ErrorCode.NOT_OWNER);
    }

    await this.shareRepo.deleteAllForNote(noteId);
    await this.noteRepo.delete(noteId);
  }

  /**
   * Full-text search across notes accessible to the user.
   * Returns an empty result set for an empty query string.
   */
  async searchNotes(
    userId: string,
    queryStr: string,
    pagination: PaginationDto,
  ): Promise<PaginatedNotes> {
    const trimmed = queryStr.trim();
    if (!trimmed) {
      return { notes: [], total: 0, page: pagination.page, page_size: pagination.page_size, total_pages: 0 };
    }
    return this.noteRepo.search(userId, trimmed, pagination);
  }
}

export const noteService = new NoteServiceImpl();
