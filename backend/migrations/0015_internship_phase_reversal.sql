-- ── Internship phase reversal history ────────────────────────────────────────
-- Reversing a phase is an unusual, staff-only action — worth a record of why,
-- same spirit as internship_application_history's outcome/notes log.
CREATE TABLE IF NOT EXISTS internship_phase_history (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id  BIGINT NOT NULL REFERENCES internships(id),
  from_phase     VARCHAR(20) NOT NULL,
  to_phase       VARCHAR(20) NOT NULL,
  reason         TEXT NOT NULL,
  created_by     BIGINT REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_internship_phase_history_internship
  ON internship_phase_history(internship_id) WHERE deleted_at IS NULL;
