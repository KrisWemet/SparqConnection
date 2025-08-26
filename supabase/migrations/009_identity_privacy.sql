-- Identity privacy and selection enhancements
-- Migration: 009_identity_privacy.sql

-- Add identity privacy field to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS identity_is_private BOOLEAN DEFAULT false;