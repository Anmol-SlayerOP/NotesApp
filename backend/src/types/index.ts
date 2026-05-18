import { Request } from 'express';

/**
 * Domain model for a registered user.
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Domain model for a note.
 * `is_shared` is a computed field added in API responses to indicate
 * whether the note was shared with the requesting user (as opposed to owned).
 */
export interface Note {
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

/**
 * Paginated list of notes returned by list/search endpoints.
 */
export interface PaginatedNotes {
  notes: Note[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * A note identified as important by the AI analyzer, with a ranked
 * importance score and a human-readable explanation.
 */
export interface ImportantNote {
  noteId: string;
  title: string;
  content: string;
  importance_score: number;
  explanation: string;
}

/**
 * Structured log entry for application errors and events.
 * Sensitive values (passwords, tokens, API keys) must never appear here.
 */
export interface ErrorLog {
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  error_code: string;
  message: string;
  user_id?: string;
  request_id: string;
  stack_trace?: string;
  context: Record<string, unknown>;
}

/**
 * Express Request extended with the authenticated user identity.
 * Populated by the authentication middleware after JWT verification.
 *
 * We use a type intersection rather than interface extension to avoid
 * TypeScript strict-mode complaints about missing index signatures on
 * the base Request type when accessing .body, .params, .query.
 */
export type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
    username: string;
  };
};
