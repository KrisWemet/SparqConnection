-- Daily question swaps tracking
-- Migration: 008_daily_swaps.sql

-- Create daily_swaps table to track question swaps (1 per day limit)
CREATE TABLE IF NOT EXISTS daily_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swap_date DATE NOT NULL,
  original_question TEXT NOT NULL,
  new_question TEXT NOT NULL,
  new_tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure only one swap per user per day
  UNIQUE(user_id, swap_date)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_daily_swaps_user_id ON daily_swaps(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_swaps_date ON daily_swaps(swap_date);
CREATE INDEX IF NOT EXISTS idx_daily_swaps_created ON daily_swaps(created_at);

-- RLS policies
ALTER TABLE daily_swaps ENABLE ROW LEVEL SECURITY;

-- Users can only see their own swaps
CREATE POLICY "Users can view their own daily swaps" ON daily_swaps
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own swaps
CREATE POLICY "Users can create their own daily swaps" ON daily_swaps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check if user can swap today
CREATE OR REPLACE FUNCTION can_swap_question_today(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has already swapped today
  RETURN NOT EXISTS (
    SELECT 1 FROM daily_swaps 
    WHERE daily_swaps.user_id = can_swap_question_today.user_id 
    AND swap_date = CURRENT_DATE
  );
END;
$$;