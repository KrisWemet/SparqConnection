-- 019_coachmarks.sql: Add coach marks completion timestamp (renumbered)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tour_completed_at TIMESTAMPTZ;

