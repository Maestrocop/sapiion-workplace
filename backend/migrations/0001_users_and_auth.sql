-- ── Users & Auth ─────────────────────────────────────────────────────────────
-- Local email/password (argon2) always works. Microsoft/Google OAuth are
-- optional — google_id/microsoft_id stay NULL until a user links or signs in
-- with that provider.

CREATE TABLE IF NOT EXISTS users (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email                  VARCHAR(255) NOT NULL,
  password_hash          VARCHAR(255),                      -- NULL for OAuth-only accounts
  first_name             VARCHAR(100) NOT NULL,
  last_name              VARCHAR(100) NOT NULL,
  roles                  TEXT[] NOT NULL DEFAULT '{student}',
  is_active              BOOLEAN NOT NULL DEFAULT true,
  avatar_url             TEXT,
  google_id              TEXT,
  microsoft_id           TEXT,
  failed_login_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until           TIMESTAMPTZ,
  password_reset_token   TEXT,
  password_reset_expires TIMESTAMPTZ,
  last_login_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users(lower(email)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_id ON users(google_id) WHERE google_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_microsoft_id ON users(microsoft_id) WHERE microsoft_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
