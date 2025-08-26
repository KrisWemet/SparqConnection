-- 018_onboarding.sql: Add onboarding timestamp (renumbered)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

