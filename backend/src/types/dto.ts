/**
 * Data Transfer Objects (DTOs) for API request payloads.
 * These are validated at the API layer before reaching the service layer.
 */

/**
 * Payload for creating a new note.
 * Priority defaults to 3 and pinned defaults to false when omitted.
 */
export interface CreateNoteDto {
  title: string;
  content: string;
  priority?: number;
  pinned?: boolean;
}

/**
 * Payload for updating an existing note.
 * All fields are optional — only provided fields are updated.
 */
export interface UpdateNoteDto {
  title?: string;
  content?: string;
  priority?: number;
  pinned?: boolean;
}

/**
 * Pagination parameters for list and search endpoints.
 */
export interface PaginationDto {
  page: number;
  page_size: number;
}

/**
 * Payload for user registration.
 * The `email` field is used as the unique user identifier.
 */
export interface RegisterDto {
  email: string;
  password: string;
}

/**
 * Payload for user login.
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * Payload for sharing a note with another user.
 * The target user is identified by their email address.
 */
export interface ShareNoteDto {
  share_with_email: string;
}
