-- ── User cohort/class assignment ─────────────────────────────────────────────
-- ILS-dev has a free-text "cohort" label directly on users; Workplace already
-- has a real Class entity, so this links to it properly instead of adding a
-- loose text field. Nullable — only students meaningfully use it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_id BIGINT REFERENCES classes(id);
CREATE INDEX IF NOT EXISTS idx_users_class ON users(class_id) WHERE deleted_at IS NULL;
