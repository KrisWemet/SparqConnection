-- Add missing updated_at column to quest_days table
-- This is needed because there's an update trigger but no updated_at column

ALTER TABLE quest_days ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();