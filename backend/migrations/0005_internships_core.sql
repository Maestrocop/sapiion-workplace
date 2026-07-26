-- ── Internship Entity ────────────────────────────────────────────────────────
-- The internship is its OWN entity — not a module. External company, external
-- supervisor (token access, no user account), continuous weekly activity logs,
-- bilateral assessment (teacher + supervisor).
--
--   internships               : the placement record (student + campaign + company)
--   internship_supervisors    : external supervisor, token-based access (no account)
--   internship_activity_logs  : continuous weekly logs written by the student
--   internship_assessments    : bilateral evaluation (one row per assessor)

CREATE TABLE IF NOT EXISTS internships (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id          BIGINT REFERENCES internship_campaigns(id) ON DELETE SET NULL,
  class_id             BIGINT REFERENCES classes(id),           -- legacy fallback only; prefer campaign.class_id
  title                TEXT,                                     -- optional role title, e.g. "Junior BIM Modeller"
  company_name         TEXT,
  company_address      TEXT,
  company_sector       VARCHAR(100),
  start_date           DATE,
  end_date             DATE,
  working_schedule     TEXT,
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','completed','cancelled','withdrawn')),
  placement_substate   VARCHAR(50),   -- pending_company_details | pending_review | pending_signatures | ready_to_start
  completed_at         TIMESTAMPTZ,
  total_hours          NUMERIC(7,1),
  final_score          NUMERIC(5,2),
  completion_note      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_internships_student  ON internships(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_internships_campaign ON internships(campaign_id) WHERE deleted_at IS NULL;

-- ── internship_supervisors ────────────────────────────────────────────────────
-- External actor — NO user account. Access is via a unique, scoped, expiring
-- token. Friction kills adoption: supervisors will not create accounts.
CREATE TABLE IF NOT EXISTS internship_supervisors (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id    BIGINT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  job_title        TEXT,
  access_token     TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,      -- set to 30 days after end_date; regenerable
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_internship_supervisors_token
  ON internship_supervisors(access_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_internship_supervisors_internship
  ON internship_supervisors(internship_id) WHERE deleted_at IS NULL;

-- ── internship_activity_logs ──────────────────────────────────────────────────
-- Continuous weekly logs written by the student. Engagement signal = frequency.
CREATE TABLE IF NOT EXISTS internship_activity_logs (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id      BIGINT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  title              VARCHAR(200),
  week_starting      DATE,                                 -- Monday of the logged week
  hours_logged       NUMERIC(5,1),
  content            TEXT NOT NULL,                         -- what the student did / learned
  supervisor_ack     BOOLEAN NOT NULL DEFAULT false,        -- supervisor confirmed via token
  supervisor_comment TEXT,
  created_by         BIGINT REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_internship_activity_logs_internship
  ON internship_activity_logs(internship_id, week_starting) WHERE deleted_at IS NULL;

-- ── internship_assessments ────────────────────────────────────────────────────
-- Bilateral: teacher and supervisor each submit independently. The gap between
-- their scores is a calibration signal. assessor_user_id is NULL for the
-- external token supervisor.
CREATE TABLE IF NOT EXISTS internship_assessments (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id    BIGINT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  assessor_role    TEXT NOT NULL CHECK (assessor_role IN ('teacher','supervisor')),
  assessor_user_id BIGINT REFERENCES users(id),
  score            NUMERIC(5,2),
  max_score        NUMERIC(5,2) NOT NULL DEFAULT 100,
  feedback         TEXT,
  reflection       TEXT,
  competency_notes TEXT,
  is_completed     BOOLEAN NOT NULL DEFAULT false,
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_internship_assessments_role
  ON internship_assessments(internship_id, assessor_role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_internship_assessments_internship
  ON internship_assessments(internship_id) WHERE deleted_at IS NULL;
