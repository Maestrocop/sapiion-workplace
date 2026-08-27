-- ── Interim reviews / school visits ──────────────────────────────────────────
-- A coach/teacher's periodic visit to a student during their internship —
-- distinct from company_visits (CRM outreach to companies) and distinct from
-- the final teacher/supervisor assessment. Multiple per internship.
--
-- Two purposes: (1) evidence a visit was scheduled/who was meant to attend,
-- independent of whether it's happened yet; (2) the actual report once it has.
-- Resolves "who controls total hours" — the hours stay auto-summed from
-- activity logs, and this is the human check-in that catches problems early,
-- not a gatekeeping field on the final total.
CREATE TABLE IF NOT EXISTS internship_reviews (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id        BIGINT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  scheduled_date        DATE NOT NULL,
  status                TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  reviewer_id           BIGINT REFERENCES users(id),
  supervisor_id         BIGINT REFERENCES internship_supervisors(id),
  report                TEXT,
  hours_logged_snapshot NUMERIC(7,1),
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_internship_reviews_internship
  ON internship_reviews(internship_id, scheduled_date) WHERE deleted_at IS NULL;
