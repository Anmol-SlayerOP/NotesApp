-- Notes App Backend — PostgreSQL DDL
-- Run via: npm run migrate

-- ─────────────────────────────────────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  content     TEXT         NOT NULL,
  priority    INTEGER      NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  pinned      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id
  ON notes(user_id);

CREATE INDEX IF NOT EXISTS idx_notes_pinned_priority
  ON notes(pinned DESC, priority DESC, modified_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_search
  ON notes USING GIN(to_tsvector('english', title || ' ' || content));

-- ─────────────────────────────────────────────────────────────────────────────
-- Shares
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shares (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id              UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  shared_with_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(note_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shares_note_id
  ON shares(note_id);

CREATE INDEX IF NOT EXISTS idx_shares_shared_with_user_id
  ON shares(shared_with_user_id);
