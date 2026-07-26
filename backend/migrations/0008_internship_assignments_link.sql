-- ── Internship ↔ Assignment link ─────────────────────────────────────────────
-- Ties a placement to a plain deliverable (title/points/discipline — no
-- grading/rubric engine; see CLAUDE.md scope boundaries).
CREATE TABLE IF NOT EXISTS internship_assignments (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id     BIGINT NOT NULL REFERENCES internships(id),
  assignment_id     BIGINT NOT NULL REFERENCES assignments(id),
  due_date_override DATE,
  display_order     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (internship_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_internship_assignments_internship ON internship_assignments(internship_id);
