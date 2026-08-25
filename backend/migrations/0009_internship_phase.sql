-- ── Internship phase tracking (#1) ───────────────────────────────────────────
-- Purpose-built for the Internship entity only — not a generic reusable
-- process engine (Workplace has only one entity that needs this).
--
-- Two kinds of transition, both enforced in application code, not triggers:
--   - automatic: application outcome -> 'accepted' moves searching -> placed;
--     marking the internship complete moves any phase -> completed
--   - manual (staff only): an explicit "advance" action moves
--     placed -> on_site -> evaluating
ALTER TABLE internships
  ADD COLUMN IF NOT EXISTS phase VARCHAR(20) NOT NULL DEFAULT 'searching'
  CHECK (phase IN ('searching', 'placed', 'on_site', 'evaluating', 'completed'));

CREATE INDEX IF NOT EXISTS idx_internships_phase ON internships(phase) WHERE deleted_at IS NULL;
