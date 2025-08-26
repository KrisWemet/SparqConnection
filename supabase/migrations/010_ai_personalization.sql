-- AI Personalization Framework
-- Migration: 010_ai_personalization.sql

-- Daily plans table for storing personalized AI-generated content
CREATE TABLE IF NOT EXISTS daily_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    content JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate plans for same user/date
    UNIQUE(user_id, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS daily_plans_user_date_idx ON daily_plans(user_id, date);
CREATE INDEX IF NOT EXISTS daily_plans_date_idx ON daily_plans(date);

-- RLS policies for daily_plans
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own daily plans"
    ON daily_plans
    FOR ALL
    USING (auth.uid() = user_id);

-- Quest days table for canonical content (already exists, but let's ensure structure)
CREATE TABLE IF NOT EXISTS quest_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quest_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    base_content JSONB NOT NULL, -- canonical content before personalization
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(quest_id, day)
);

-- Index quest days for fast lookups
CREATE INDEX IF NOT EXISTS quest_days_quest_day_idx ON quest_days(quest_id, day);

-- User quest progress tracking
CREATE TABLE IF NOT EXISTS user_quest_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    current_quest_id TEXT DEFAULT 'default-quest',
    current_day INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Index for quest progress
CREATE INDEX IF NOT EXISTS user_quest_progress_user_idx ON user_quest_progress(user_id);

-- RLS for quest progress
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own quest progress"
    ON user_quest_progress
    FOR ALL
    USING (auth.uid() = user_id);

-- User activities table for tracking engagement patterns
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL, -- 'micro_action_completed', 'ritual_completed', etc.
    activity_date DATE DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for activity tracking
CREATE INDEX IF NOT EXISTS user_activities_user_idx ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS user_activities_user_date_idx ON user_activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS user_activities_type_idx ON user_activities(activity_type);

-- RLS for user activities
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own activities"
    ON user_activities
    FOR ALL
    USING (auth.uid() = user_id);

-- Enhance profiles table with additional fields for personalization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attachment_style TEXT DEFAULT 'secure';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS love_languages TEXT[] DEFAULT ARRAY['words'];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boundaries_comfort INTEGER DEFAULT 3 CHECK (boundaries_comfort BETWEEN 1 AND 5);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS time_preference TEXT DEFAULT 'morning';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS life_stage TEXT DEFAULT 'married';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_long_distance BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cohabiting BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_shift_worker BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cultural_notes TEXT;

-- Add trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_daily_plans_updated_at BEFORE UPDATE ON daily_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quest_days_updated_at BEFORE UPDATE ON quest_days FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_quest_progress_updated_at BEFORE UPDATE ON user_quest_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample canonical content for testing
-- Day 1
INSERT INTO quest_days (quest_id, day, base_content, version)
SELECT
  'default-quest',
  1,
  '{
    "story": "Today begins your journey of deeper connection. Sometimes the smallest moments create the strongest bonds.",
    "dq": "What''s one thing your partner did this week that made you smile, even if they didn''t realize it?",
    "micro_action": "Send your partner a quick text sharing one thing you appreciate about them right now.",
    "journal": "Reflect on a recent moment when you felt truly seen by your partner. What made that moment special?",
    "reflection": "Connection grows through noticing and appreciating the small gestures that show love.",
    "tags": ["light", "words", "mindfulness"]
  }'::jsonb,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM quest_days q
  WHERE q.quest_id = 'default-quest' AND q.day = 1
);

-- Day 2
INSERT INTO quest_days (quest_id, day, base_content, version)
SELECT
  'default-quest',
  2,
  '{
    "story": "Building intimacy happens through small, consistent acts of attention and care.",
    "dq": "When do you feel most comfortable being completely yourself with your partner?",
    "micro_action": "Create a cozy space together - dim the lights, make tea, and just be present with each other for 10 minutes.",
    "journal": "Write about what makes you feel safe to be vulnerable with your partner.",
    "reflection": "Intimacy grows when we create spaces where authenticity feels safe and welcomed.",
    "tags": ["deep", "time", "mindfulness", "secure"]
  }'::jsonb,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM quest_days q
  WHERE q.quest_id = 'default-quest' AND q.day = 2
);

-- Function to get user's daily plan (personalized or fallback)
CREATE OR REPLACE FUNCTION get_user_daily_plan(target_user_id UUID, target_date DATE)
RETURNS JSONB AS $$
DECLARE
    personalized_plan JSONB;
    canonical_content JSONB;
    user_identity TEXT;
BEGIN
    -- Try to get personalized plan first
    SELECT content INTO personalized_plan
    FROM daily_plans 
    WHERE user_id = target_user_id 
    AND date = target_date;
    
    IF personalized_plan IS NOT NULL THEN
        RETURN personalized_plan;
    END IF;
    
    -- Get user's current identity
    SELECT current_identity INTO user_identity
    FROM profiles 
    WHERE user_id = target_user_id;
    
    -- Get canonical content as fallback
    SELECT base_content INTO canonical_content
    FROM quest_days 
    ORDER BY quest_id, day 
    LIMIT 1;
    
    -- Return enhanced canonical content
    RETURN jsonb_build_object(
        'date', target_date,
        'identity', COALESCE(user_identity, 'Mindful Partner'),
        'story', canonical_content->>'story',
        'dq', canonical_content->>'dq',
        'micro_action', canonical_content->>'micro_action',
        'journal', canonical_content->>'journal',
        'reflection', canonical_content->>'reflection',
        'appreciation_templates', ARRAY['I appreciate how you...', 'Thank you for doing...'],
        'tags', COALESCE(canonical_content->'tags', '[]'::jsonb),
        'version', 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_daily_plan(UUID, DATE) TO authenticated;