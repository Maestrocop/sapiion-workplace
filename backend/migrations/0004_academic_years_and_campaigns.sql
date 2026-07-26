-- ── Academic Years & Internship Campaigns ────────────────────────────────────
-- Separates program management (campaign) from student journey (internship).
-- Coordinator thinks in campaigns; the internship record holds the personal
-- journey. Same class can have multiple campaigns across academic years.

CREATE TABLE IF NOT EXISTS academic_years (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  label       TEXT NOT NULL UNIQUE,           -- "2026-2027" display label, set once
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_current  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_years_current
  ON academic_years(is_current) WHERE is_current = true;

-- Seed the current academic year plus one before/after, relative to today
-- (so a fresh install always has sane defaults, regardless of when it's run).
DO $$
DECLARE
  base_year INT := EXTRACT(YEAR FROM CURRENT_DATE) - CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) < 9 THEN 1 ELSE 0 END;
  y INT;
BEGIN
  FOR y IN (base_year - 1)..(base_year + 1) LOOP
    INSERT INTO academic_years (label, start_date, end_date, is_current)
    VALUES (
      y || '-' || (y + 1),
      make_date(y, 9, 1),
      make_date(y + 1, 8, 31),
      y = base_year
    )
    ON CONFLICT (label) DO NOTHING;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS internship_campaigns (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  class_id               BIGINT NOT NULL REFERENCES classes(id),
  academic_year_id       BIGINT NOT NULL REFERENCES academic_years(id),
  campaign_type          TEXT NOT NULL DEFAULT 'graduation'
                         CHECK (campaign_type IN ('graduation','summer','optional')),
  name                   TEXT NOT NULL,              -- e.g. "Graduation Internship 2027"
  coordinator_id         BIGINT REFERENCES users(id),
  search_start_date      DATE,
  placement_target_date  DATE,
  internship_start_date  DATE,
  internship_end_date    DATE,
  status                 TEXT NOT NULL DEFAULT 'planning'
                         CHECK (status IN ('planning','active','closed','cancelled')),
  document_policy        VARCHAR(50) DEFAULT 'recommended', -- required_before_apply | recommended | disabled
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_internship_campaigns_class_year_type
  ON internship_campaigns(class_id, academic_year_id, campaign_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_internship_campaigns_class ON internship_campaigns(class_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_internship_campaigns_year  ON internship_campaigns(academic_year_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_internship_campaigns_status ON internship_campaigns(status) WHERE deleted_at IS NULL;
