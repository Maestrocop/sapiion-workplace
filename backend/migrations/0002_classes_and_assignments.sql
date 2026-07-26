-- ── Classes & Assignments (lightweight, Workplace-local) ────────────────────
-- These are NOT the curriculum-hierarchy tables from the commercial Sapiion
-- platform (no institution/campus/course/module concepts here) — just enough
-- shape to satisfy the same FKs the internship domain has always had, and to
-- keep a straightforward upgrade path if a school later moves to full Sapiion.
--
-- `assignments` is deliberately a plain record — title/points/discipline only,
-- no grading or rubric engine. That boundary is intentional, not a gap.

CREATE TABLE IF NOT EXISTS classes (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assignments (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            TEXT NOT NULL,
  points_possible  NUMERIC(10,2),
  discipline       TEXT,
  due_date         TIMESTAMPTZ,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);
