-- Allow students to submit their own reflection via the same assessments
-- table (assessor_role='student'), alongside the existing teacher/supervisor
-- bilateral assessment.
DO $$ BEGIN
  ALTER TABLE internship_assessments DROP CONSTRAINT IF EXISTS internship_assessments_assessor_role_check;
  ALTER TABLE internship_assessments ADD CONSTRAINT internship_assessments_assessor_role_check
    CHECK (assessor_role IN ('teacher', 'supervisor', 'student'));
END $$;
