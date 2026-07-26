-- ── Documents & Applications ─────────────────────────────────────────────────
-- SEARCH phase: student uploads CV/letter → coach reviews → student sends
-- application directly from the app via the school's email relay.

CREATE TABLE IF NOT EXISTS internship_documents (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id   BIGINT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL CHECK (doc_type IN ('cv','motivation_letter','other')),
  version         SMALLINT NOT NULL DEFAULT 1,
  original_name   TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('submitted','under_review','approved','needs_revision')),
  coach_feedback  TEXT,
  reviewed_by     BIGINT REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  uploaded_by     BIGINT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_internship_documents_internship
  ON internship_documents(internship_id, doc_type) WHERE deleted_at IS NULL;

-- One row per company the student applied to.
CREATE TABLE IF NOT EXISTS internship_applications (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  internship_id        BIGINT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,

  company_name         TEXT NOT NULL,
  company_email        TEXT,
  company_website      TEXT,
  company_contact_name TEXT,
  company_address      TEXT,
  company_city         VARCHAR(100),
  company_postal_code  VARCHAR(20),
  company_country      VARCHAR(100),

  cv_document_id       BIGINT REFERENCES internship_documents(id) ON DELETE SET NULL,
  letter_document_id   BIGINT REFERENCES internship_documents(id) ON DELETE SET NULL,

  sent_via_app         BOOLEAN NOT NULL DEFAULT false,
  sent_at              TIMESTAMPTZ,
  email_subject        TEXT,

  outcome              TEXT NOT NULL DEFAULT 'pending'
                       CHECK (outcome IN ('pending','no_reply','interview_scheduled','rejected','accepted')),
  interview_date       DATE,
  notes                TEXT,
  coach_note           TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_internship_applications_internship
  ON internship_applications(internship_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_internship_applications_outcome
  ON internship_applications(internship_id, outcome) WHERE deleted_at IS NULL;

-- Outcome change history per application.
CREATE TABLE IF NOT EXISTS internship_application_history (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id  BIGINT NOT NULL REFERENCES internship_applications(id),
  outcome         VARCHAR(50) NOT NULL,
  interview_date  DATE,
  notes           TEXT,
  created_by      BIGINT REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_history_app_id  ON internship_application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_app_history_created ON internship_application_history(created_at);
