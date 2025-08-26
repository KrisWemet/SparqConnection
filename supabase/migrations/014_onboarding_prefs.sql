-- 014_onboarding_prefs.sql: Add tone_preference and appreciation_channel to profiles

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tone_preference TEXT CHECK (tone_preference IN ('fun','gentle')),
  ADD COLUMN IF NOT EXISTS appreciation_channel TEXT CHECK (appreciation_channel IN ('text','voice','in_person'));

