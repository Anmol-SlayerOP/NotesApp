import { AppError, ErrorCode } from '../types/errors';
import { noteRepository, NoteRepository } from '../repositories/note.repository';
import { shareRepository, ShareRepository } from '../repositories/share.repository';
import { userRepository, UserRepository } from '../repositories/user.repository';
import { User } from '../types';

export interface ShareService {
  shareNote(noteId: string, ownerId: string, targetEmail: string): Promise<void>;
  unshareNote(noteId: string, ownerId: string, targetUserId: string): Promise<void>;
  getSharedUsers(noteId: string, ownerId: string): Promise<Pick<User, 'id' | 'email'>[]>;
  deleteAllShares(noteId: string): Promise<void>;
}

export class ShareServiceImpl implements ShareService {
  constructor(
    private readonly noteRepo: NoteRepository = noteRepository,
    private readonly shareRepo: ShareRepository = shareRepository,
    private readonly userRepo: UserRepository = userRepository,
  ) {}

  /**
   * Shares a note with another user identified by email.
   * - Only the note owner may share it (403 if not owner).
   * - Target user must exist (404 if not found).
   * - Sharing the same note twice is idempotent (no error, no duplicate).
   * - Owner cannot share a note with themselves (400).
   */
  async shareNote(noteId: string, ownerId: string, targetEmail: string): Promise<void> {
    // Verify note exists and requester is the owner
    const note = await this.noteRepo.findById(noteId);
    if (!note) {
      throw AppError.notFound('Note not found', ErrorCode.NOTE_NOT_FOUND);
    }
    if (note.user_id !== ownerId) {
      throw AppError.forbidden('You do not own this note', ErrorCode.NOT_OWNER);
    }

    // Verify target user exists
    const targetUser = await this.userRepo.findByEmail(targetEmail);
    if (!targetUser) {
      throw AppError.notFound(
        `No user found with email: ${targetEmail}`,
        ErrorCode.USER_NOT_FOUND,
      );
    }

    // Prevent sharing with yourself
    if (targetUser.id === ownerId) {
      throw AppError.badRequest(
        'You cannot share a note with yourself',
        ErrorCode.INVALID_INPUT,
      );
    }

    // Idempotent — ON CONFLICT DO NOTHING in the repository
    await this.shareRepo.create(noteId, targetUser.id);
  }

  /**
   * Removes a sharing relationship. Only the note owner may unshare.
   */
  async unshareNote(noteId: string, ownerId: string, targetUserId: string): Promise<void> {
    const note = await this.noteRepo.findById(noteId);
    if (!note) {
      throw AppError.notFound('Note not found', ErrorCode.NOTE_NOT_FOUND);
    }
    if (note.user_id !== ownerId) {
      throw AppError.forbidden('You do not own this note', ErrorCode.NOT_OWNER);
    }

    await this.shareRepo.delete(noteId, targetUserId);
  }

  /**
   * Returns the list of users a note has been shared with.
   * Only the note owner may query this.
   */
  async getSharedUsers(
    noteId: string,
    ownerId: string,
  ): Promise<Pick<User, 'id' | 'email'>[]> {
    const note = await this.noteRepo.findById(noteId);
    if (!note) {
      throw AppError.notFound('Note not found', ErrorCode.NOTE_NOT_FOUND);
    }
    if (note.user_id !== ownerId) {
      throw AppError.forbidden('You do not own this note', ErrorCode.NOT_OWNER);
    }

    return this.shareRepo.findSharedUsers(noteId);
  }

  /**
   * Removes all sharing relationships for a note.
   * Used internally when a note is deleted.
   */
  async deleteAllShares(noteId: string): Promise<void> {
    await this.shareRepo.deleteAllForNote(noteId);
  }
}

export const shareService = new ShareServiceImpl();
