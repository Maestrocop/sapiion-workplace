-- ── User cohort (academic year) ──────────────────────────────────────────────
-- 0010 linked users to a Class and called it "cohort" in the UI — that was
-- wrong. Checked ILS-dev directly: there, cohort is the student's intake
-- year (e.g. "2025-2026"), entirely separate from which class/group they're
-- currently in. Workplace already has a real academic_years table (used by
-- Internship Programme), so cohort here is a proper FK into it rather than
-- a free-text duplicate.
ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year_id BIGINT REFERENCES academic_years(id);
CREATE INDEX IF NOT EXISTS idx_users_academic_year ON users(academic_year_id) WHERE deleted_at IS NULL;
