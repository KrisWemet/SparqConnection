-- Enhanced Achievement & Rewards System
-- Migration: 017_enhanced_achievements.sql

-- Expand achievement types for comprehensive rewards system
DO $$ 
BEGIN
    -- Add new achievement types to the enum constraint
    ALTER TABLE user_achievements 
    DROP CONSTRAINT IF EXISTS user_achievements_achievement_type_check;
    
    ALTER TABLE user_achievements 
    ADD CONSTRAINT user_achievements_achievement_type_check 
    CHECK (achievement_type IN (
        -- Existing types
        'streak_milestone', 'game_master', 'connection_champion', 'exploration_expert', 'consistency_king', 'growth_guru',
        -- New milestone categories
        'relationship_milestone', 'communication_master', 'play_discovery', 'growth_reflection', 'partnership_excellence',
        -- Special achievement types
        'seasonal', 'couple_achievement', 'rare_milestone', 'custom_goal'
    ));
END $$;

-- Achievement progress tracking table for multi-step achievements
CREATE TABLE IF NOT EXISTS user_achievement_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_key TEXT NOT NULL,
    current_progress INTEGER DEFAULT 0,
    required_progress INTEGER NOT NULL,
    progress_metadata JSONB DEFAULT '{}',
    last_progress_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_key)
);

-- Couple achievements that both partners earn together
CREATE TABLE IF NOT EXISTS couple_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pair_id UUID REFERENCES pairs(id) ON DELETE CASCADE NOT NULL,
    achievement_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    badge_icon TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    is_visible BOOLEAN DEFAULT TRUE,
    
    UNIQUE(pair_id, achievement_key)
);

-- Achievement celebrations tracking for UI/UX optimization
CREATE TABLE IF NOT EXISTS achievement_celebrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID, -- Can reference user_achievements or couple_achievements
    achievement_type TEXT NOT NULL, -- 'individual' or 'couple'
    celebration_type TEXT CHECK (celebration_type IN ('modal', 'notification', 'dashboard_highlight', 'email')),
    shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    engagement_level TEXT CHECK (engagement_level IN ('viewed', 'dismissed', 'shared', 'ignored')),
    celebration_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced achievement types with comprehensive metadata
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    achievement_key TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    long_description TEXT,
    badge_icon TEXT NOT NULL,
    badge_color TEXT DEFAULT '#6366f1',
    rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    required_progress INTEGER DEFAULT 1,
    is_couple_achievement BOOLEAN DEFAULT FALSE,
    unlock_requirements JSONB DEFAULT '{}',
    reward_data JSONB DEFAULT '{}',
    celebration_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS user_achievement_progress_user_idx ON user_achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS user_achievement_progress_key_idx ON user_achievement_progress(achievement_key);
CREATE INDEX IF NOT EXISTS couple_achievements_pair_idx ON couple_achievements(pair_id);
CREATE INDEX IF NOT EXISTS achievement_celebrations_user_idx ON achievement_celebrations(user_id);
CREATE INDEX IF NOT EXISTS achievement_celebrations_type_idx ON achievement_celebrations(achievement_type, celebration_type);
CREATE INDEX IF NOT EXISTS achievement_definitions_category_idx ON achievement_definitions(category, is_active);

-- RLS policies
ALTER TABLE user_achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_celebrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own achievement progress"
    ON user_achievement_progress
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can access their couple achievements"
    ON couple_achievements
    FOR ALL
    USING (
        pair_id IN (
            SELECT id FROM pairs 
            WHERE (user_a = auth.uid() OR user_b = auth.uid()) 
            AND status = 'active'
        )
    );

CREATE POLICY "Users can access their own celebration data"
    ON achievement_celebrations
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read achievement definitions"
    ON achievement_definitions
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Insert initial achievement definitions
INSERT INTO achievement_definitions (achievement_key, category, title, description, badge_icon, required_progress, celebration_config) VALUES
-- Relationship Milestones
('first_ritual', 'relationship_milestone', 'First Steps Together', 'Complete your first daily ritual as a couple', '🌱', 1, '{"confetti": true, "sound": "celebration"}'),
('week_together', 'relationship_milestone', 'One Week Strong', 'Complete daily rituals together for 7 consecutive days', '🗓️', 7, '{"confetti": true, "badge_animation": "bounce"}'),
('month_milestone', 'relationship_milestone', 'Monthly Champions', 'Maintain your connection for 30 consecutive days', '🏆', 30, '{"confetti": true, "special_message": true}'),

-- Communication Masters
('daily_notes_streak', 'communication_master', 'Daily Communicator', 'Share notes with your partner for 7 days straight', '💬', 7, '{"badge_animation": "pulse"}'),
('appreciation_master', 'communication_master', 'Appreciation Expert', 'Send 10 appreciations to your partner', '💝', 10, '{"confetti": true}'),
('deep_conversation', 'communication_master', 'Heart-to-Heart Hero', 'Have meaningful conversations for 14 days', '❤️', 14, '{"special_message": true}'),

-- Play & Discovery
('game_variety', 'play_discovery', 'Game Explorer', 'Try all 3 different game types with your partner', '🎮', 3, '{"badge_animation": "spin"}'),
('play_week', 'play_discovery', 'Playful Partnership', 'Play games together for 7 consecutive days', '🎯', 7, '{"confetti": true}'),
('trivia_master', 'play_discovery', 'Trivia Champion', 'Answer 50 trivia questions correctly', '🧠', 50, '{"badge_animation": "bounce"}'),

-- Growth & Reflection  
('reflection_streak', 'growth_reflection', 'Thoughtful Partner', 'Complete daily reflections for 14 days', '🤔', 14, '{"special_message": true}'),
('identity_explorer', 'growth_reflection', 'Self-Discovery Star', 'Explore 10 different identity aspects', '🎭', 10, '{"badge_animation": "fade"}'),
('growth_month', 'growth_reflection', 'Growth Guru', 'Focus on personal growth for 30 days', '🌟', 30, '{"confetti": true}'),

-- Partnership Excellence
('perfect_sync', 'partnership_excellence', 'Perfect Harmony', 'Complete rituals simultaneously for 5 days', '🎵', 5, '{"confetti": true, "special_message": true}'),
('weekend_warriors', 'partnership_excellence', 'Weekend Warriors', 'Never miss a weekend ritual for 4 weeks', '⚔️', 4, '{"badge_animation": "bounce"}'),
('anniversary_celebration', 'partnership_excellence', 'Milestone Memory', 'Celebrate your connection anniversary', '🎊', 1, '{"confetti": true, "special_message": true, "sound": "celebration"})

ON CONFLICT (achievement_key) DO NOTHING;

-- Function to evaluate and award achievements
CREATE OR REPLACE FUNCTION evaluate_user_achievements(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    achievement_record RECORD;
    new_achievements JSON[] DEFAULT '{}';
    result JSON;
BEGIN
    -- Evaluate each active achievement definition
    FOR achievement_record IN 
        SELECT * FROM achievement_definitions 
        WHERE is_active = true AND is_couple_achievement = false
    LOOP
        -- Check if user already has this achievement
        IF NOT EXISTS (
            SELECT 1 FROM user_achievements 
            WHERE user_id = target_user_id 
            AND achievement_key = achievement_record.achievement_key
        ) THEN
            -- Check achievement-specific conditions
            CASE achievement_record.achievement_key
                WHEN 'first_ritual' THEN
                    IF EXISTS (
                        SELECT 1 FROM streak_activities 
                        WHERE user_id = target_user_id 
                        AND activity_source = 'ritual_completed'
                    ) THEN
                        -- Award achievement
                        INSERT INTO user_achievements (
                            user_id, achievement_type, achievement_key, 
                            title, description, badge_icon
                        ) VALUES (
                            target_user_id, achievement_record.category, 
                            achievement_record.achievement_key,
                            achievement_record.title, achievement_record.description,
                            achievement_record.badge_icon
                        );
                        
                        new_achievements := new_achievements || 
                            json_build_object(
                                'key', achievement_record.achievement_key,
                                'title', achievement_record.title,
                                'description', achievement_record.description,
                                'badge_icon', achievement_record.badge_icon,
                                'celebration_config', achievement_record.celebration_config
                            );
                    END IF;
                    
                WHEN 'week_together' THEN
                    IF EXISTS (
                        SELECT 1 FROM user_streaks 
                        WHERE user_id = target_user_id 
                        AND streak_type = 'daily_ritual' 
                        AND current_count >= 7
                    ) THEN
                        INSERT INTO user_achievements (
                            user_id, achievement_type, achievement_key,
                            title, description, badge_icon
                        ) VALUES (
                            target_user_id, achievement_record.category,
                            achievement_record.achievement_key,
                            achievement_record.title, achievement_record.description,
                            achievement_record.badge_icon
                        );
                        
                        new_achievements := new_achievements || 
                            json_build_object(
                                'key', achievement_record.achievement_key,
                                'title', achievement_record.title,
                                'description', achievement_record.description,
                                'badge_icon', achievement_record.badge_icon,
                                'celebration_config', achievement_record.celebration_config
                            );
                    END IF;
                    
                -- Add more achievement evaluation logic here
            END CASE;
        END IF;
    END LOOP;
    
    -- Return results
    result := json_build_object(
        'user_id', target_user_id,
        'new_achievements', array_to_json(new_achievements),
        'achievement_count', array_length(new_achievements, 1)
    );
    
    RETURN result;
END;
$$;

-- Function to evaluate couple achievements
CREATE OR REPLACE FUNCTION evaluate_couple_achievements(target_pair_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pair_record RECORD;
    achievement_record RECORD;
    new_achievements JSON[] DEFAULT '{}';
    result JSON;
BEGIN
    -- Get pair information
    SELECT * INTO pair_record FROM pairs WHERE id = target_pair_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Invalid or inactive pair');
    END IF;
    
    -- Evaluate couple achievements
    FOR achievement_record IN 
        SELECT * FROM achievement_definitions 
        WHERE is_active = true AND is_couple_achievement = true
    LOOP
        -- Check if couple already has this achievement
        IF NOT EXISTS (
            SELECT 1 FROM couple_achievements 
            WHERE pair_id = target_pair_id 
            AND achievement_key = achievement_record.achievement_key
        ) THEN
            -- Evaluate couple-specific achievements here
            -- (Implementation would depend on specific couple achievement logic)
            NULL;
        END IF;
    END LOOP;
    
    result := json_build_object(
        'pair_id', target_pair_id,
        'new_achievements', array_to_json(new_achievements),
        'achievement_count', array_length(new_achievements, 1)
    );
    
    RETURN result;
END;
$$;

-- Grant permissions
GRANT SELECT ON achievement_definitions TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_user_achievements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_couple_achievements(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE user_achievement_progress IS 'Tracks partial progress toward multi-step achievements';
COMMENT ON TABLE couple_achievements IS 'Achievements earned by both partners in a relationship';
COMMENT ON TABLE achievement_celebrations IS 'Tracks how achievements were presented to users for UX optimization';
COMMENT ON TABLE achievement_definitions IS 'Master list of all available achievements with metadata';
COMMENT ON FUNCTION evaluate_user_achievements IS 'Evaluates and awards new achievements for a user';
COMMENT ON FUNCTION evaluate_couple_achievements IS 'Evaluates and awards new couple achievements for a pair';