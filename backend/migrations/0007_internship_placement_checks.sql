-- ── Placement checklist ──────────────────────────────────────────────────────
-- Check definitions: what checks exist, who owns them, required or optional.
CREATE TABLE IF NOT EXISTS internship_check_definitions (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  check_key        VARCHAR(100) NOT NULL UNIQUE,
  label            TEXT NOT NULL,
  category         VARCHAR(50) NOT NULL,  -- company | setup | learning | compliance
  responsible_role VARCHAR(50) NOT NULL,  -- student | company | school
  is_required      BOOLEAN NOT NULL DEFAULT true,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO internship_check_definitions (check_key, label, category, responsible_role, is_required, sort_order) VALUES
  ('company_details_verified',    'Company details verified',     'company',    'school',   true,  10),
  ('company_supervisor_assigned', 'Company supervisor assigned',  'company',    'company',  true,  20),
  ('start_date_defined',          'Start date defined',           'setup',      'company',  true,  30),
  ('end_date_defined',            'End date defined',             'setup',      'company',  true,  40),
  ('working_schedule_defined',    'Working schedule defined',     'setup',      'company',  false, 50),
  ('learning_objectives_set',     'Learning objectives assigned', 'learning',   'school',   true,  60),
  ('assessment_method_set',       'Assessment method assigned',   'learning',   'school',   true,  70),
  ('documents_uploaded',          'Required documents uploaded',  'compliance', 'student',  false, 80),
  ('student_signed',              'Agreement signed by student',  'compliance', 'student',  true,  90),
  ('company_signed',              'Agreement signed by company',  'compliance', 'company',  true,  100),
  ('school_signed',               'Agreement signed by school',   'compliance', 'school',   true,  110)
ON CONFLICT (check_key) DO NOTHING;

-- Per-internship checklist completions.
CREATE TABLE IF NOT EXISTS internship_placement_checks (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id  BIGINT NOT NULL REFERENCES internships(id),
  definition_id  BIGINT NOT NULL REFERENCES internship_check_definitions(id),
  is_completed   BOOLEAN NOT NULL DEFAULT false,
  completed_by   BIGINT REFERENCES users(id),
  completed_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (internship_id, definition_id)
);

CREATE INDEX IF NOT EXISTS idx_placement_checks_internship ON internship_placement_checks(internship_id);
