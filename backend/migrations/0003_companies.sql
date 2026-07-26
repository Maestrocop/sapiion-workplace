-- ── Companies registry + CRM ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                TEXT NOT NULL,
  address             TEXT,
  city                VARCHAR(100),
  postal_code         VARCHAR(20),
  country             VARCHAR(100),
  website             TEXT,
  phone               VARCHAR(50),
  email               TEXT,
  sector              VARCHAR(100),
  company_size        VARCHAR(50),                       -- micro / small / medium / large

  -- Audit: how and why this company was created
  source_type         VARCHAR(50) NOT NULL DEFAULT 'application', -- application | supervisor_invite | manual_import
  source_id           BIGINT,

  -- Deduplication
  duplicate_of        BIGINT REFERENCES companies(id),
  is_flagged          BOOLEAN NOT NULL DEFAULT false,
  flag_reason         TEXT,

  -- CRM
  partnership_status  VARCHAR(20) NOT NULL DEFAULT 'prospect'
                      CHECK (partnership_status IN ('prospect','active','inactive','blacklisted')),
  notes               TEXT,
  last_contact_date   DATE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_source ON companies(source_type, source_id);

CREATE TABLE IF NOT EXISTS company_visits (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id),
  visited_by  BIGINT REFERENCES users(id),
  visit_date  DATE NOT NULL,
  visit_type  VARCHAR(20) NOT NULL DEFAULT 'visit',
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_company_visits_company ON company_visits(company_id);
