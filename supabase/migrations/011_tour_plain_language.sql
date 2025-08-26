-- 011_tour_plain_language.sql: Add tour gating and plain-language defaults

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT jsonb_build_object('plain_language', true);

-- Backfill existing rows to ensure settings has plain_language true
UPDATE profiles
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('plain_language', true)
WHERE (settings->>'plain_language') IS NULL;

