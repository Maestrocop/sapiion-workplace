-- ── Interim review attendance confirmation ───────────────────────────────────
-- Student and supervisor each confirm/decline independently — lets the
-- coordinator see at a glance who's confirmed before the meeting happens.
ALTER TABLE internship_reviews
  ADD COLUMN IF NOT EXISTS student_response VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (student_response IN ('pending', 'confirmed', 'declined'));

ALTER TABLE internship_reviews
  ADD COLUMN IF NOT EXISTS supervisor_response VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (supervisor_response IN ('pending', 'confirmed', 'declined'));
