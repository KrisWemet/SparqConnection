-- Advanced Streak System
-- Migration: 015_advanced_streaks.sql

-- Comprehensive streak tracking table
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    streak_type TEXT NOT NULL CHECK (streak_type IN ('daily_ritual', 'play_engagement', 'partner_interaction', 'weekly_connection', 'monthly_growth')),
    current_count INTEGER DEFAULT 0,
    longest_count INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    streak_start_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    grace_periods_used INTEGER DEFAULT 0,
    max_grace_periods INTEGER DEFAULT 2,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate streak types per user
    UNIQUE(user_id, streak_type)
);

-- Streak milestones and achievements
CREATE TABLE IF NOT EXISTS streak_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    streak_type TEXT NOT NULL,
    milestone_value INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    badge_icon TEXT,
    reward_type TEXT CHECK (reward_type IN ('badge', 'feature_unlock', 'content_unlock')),
    reward_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(streak_type, milestone_value)
);

-- User achievements tracking
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_type TEXT NOT NULL CHECK (achievement_type IN ('streak_milestone', 'game_master', 'connection_champion', 'exploration_expert', 'consistency_king', 'growth_guru')),
    achievement_key TEXT NOT NULL, -- e.g., 'daily_ritual_7', 'play_engagement_30'
    title TEXT NOT NULL,
    description TEXT,
    badge_icon TEXT,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    is_visible BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, achievement_key)
);

-- Streak activity log for detailed tracking
CREATE TABLE IF NOT EXISTS streak_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    streak_type TEXT NOT NULL,
    activity_date DATE DEFAULT CURRENT_DATE,
    activity_value INTEGER DEFAULT 1, -- Could be partial credit
    activity_source TEXT, -- 'ritual_completed', 'game_played', 'note_shared'
    grace_period_used BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_streaks_user_type_idx ON user_streaks(user_id, streak_type);
CREATE INDEX IF NOT EXISTS user_streaks_active_idx ON user_streaks(is_active, last_activity_date);
CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_type_idx ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS streak_activities_user_date_idx ON streak_activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS streak_activities_type_date_idx ON streak_activities(streak_type, activity_date);

-- RLS policies
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own streaks"
    ON user_streaks
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own achievements"
    ON user_achievements
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own streak activities"
    ON streak_activities
    FOR ALL
    USING (auth.uid() = user_id);

-- Allow reading milestone data for all authenticated users
CREATE POLICY "Authenticated users can read streak milestones"
    ON streak_milestones
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Update trigger
CREATE TRIGGER update_user_streaks_updated_at BEFORE UPDATE ON user_streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default streak milestones
INSERT INTO streak_milestones (streak_type, milestone_value, title, description, badge_icon, reward_type) VALUES
-- Daily ritual streaks
('daily_ritual', 3, 'Getting Started', 'Completed 3 days in a row', '🌱', 'badge'),
('daily_ritual', 7, 'Week Warrior', 'One full week of daily connection', '⭐', 'badge'),
('daily_ritual', 14, 'Two Week Champion', 'Two weeks of consistent ritual', '🔥', 'feature_unlock'),
('daily_ritual', 30, 'Monthly Master', 'A full month of daily rituals', '👑', 'feature_unlock'),
('daily_ritual', 60, 'Connection Devotee', 'Two months of dedication', '💎', 'content_unlock'),
('daily_ritual', 100, 'Ritual Legend', 'One hundred days of connection', '🏆', 'content_unlock'),

-- Play engagement streaks
('play_engagement', 3, 'Game Newbie', 'Played games 3 days this week', '🎮', 'badge'),
('play_engagement', 7, 'Play Partner', 'Played games every day this week', '🎯', 'badge'),
('play_engagement', 14, 'Game Master', 'Two weeks of consistent play', '🎲', 'feature_unlock'),
('play_engagement', 30, 'Play Champion', 'Monthly game engagement', '🏅', 'content_unlock'),

-- Partner interaction streaks  
('partner_interaction', 5, 'Sweet Talker', 'Shared notes 5 days in a row', '💬', 'badge'),
('partner_interaction', 10, 'Communication Pro', 'Ten days of partner notes', '💝', 'badge'),
('partner_interaction', 21, 'Connection Expert', 'Three weeks of interaction', '🤝', 'feature_unlock'),

-- Weekly connection streaks
('weekly_connection', 4, 'Monthly Connector', 'Four weeks of connection', '📅', 'badge'),
('weekly_connection', 8, 'Bi-Monthly Boss', 'Two months of weekly goals', '📈', 'feature_unlock'),
('weekly_connection', 12, 'Quarterly Champion', 'Three months strong', '🎊', 'content_unlock')
ON CONFLICT (streak_type, milestone_value) DO NOTHING;

-- Function to calculate streak status
CREATE OR REPLACE FUNCTION calculate_user_streak_status(target_user_id UUID, target_streak_type TEXT)
RETURNS JSONB AS $$
DECLARE
    streak_record user_streaks%ROWTYPE;
    days_since_last_activity INTEGER;
    grace_periods_available INTEGER;
    is_broken BOOLEAN DEFAULT FALSE;
    status TEXT;
    next_milestone RECORD;
    recent_activities INTEGER;
BEGIN
    -- Get current streak record
    SELECT * INTO streak_record
    FROM user_streaks 
    WHERE user_id = target_user_id 
    AND streak_type = target_streak_type;
    
    -- If no streak exists, return initial state
    IF NOT FOUND THEN
        SELECT * INTO next_milestone
        FROM streak_milestones 
        WHERE streak_type = target_streak_type 
        AND milestone_value > 0
        ORDER BY milestone_value ASC
        LIMIT 1;
        
        RETURN jsonb_build_object(
            'current_count', 0,
            'longest_count', 0,
            'status', 'inactive',
            'days_until_break', 1,
            'grace_periods_available', 2,
            'next_milestone', COALESCE(row_to_json(next_milestone), '{}'),
            'is_new', true
        );
    END IF;
    
    -- Calculate days since last activity
    days_since_last_activity := CURRENT_DATE - streak_record.last_activity_date;
    grace_periods_available := streak_record.max_grace_periods - streak_record.grace_periods_used;
    
    -- Determine streak status
    IF days_since_last_activity = 0 THEN
        status := 'active_today';
    ELSIF days_since_last_activity = 1 THEN
        status := 'active';
    ELSIF days_since_last_activity <= grace_periods_available + 1 THEN
        status := 'grace_period';
    ELSE
        status := 'broken';
        is_broken := TRUE;
    END IF;
    
    -- Get next milestone
    SELECT * INTO next_milestone
    FROM streak_milestones 
    WHERE streak_type = target_streak_type 
    AND milestone_value > streak_record.current_count
    ORDER BY milestone_value ASC
    LIMIT 1;
    
    -- Get recent activity count (last 7 days)
    SELECT COUNT(*) INTO recent_activities
    FROM streak_activities
    WHERE user_id = target_user_id
    AND streak_type = target_streak_type
    AND activity_date >= CURRENT_DATE - INTERVAL '7 days';
    
    RETURN jsonb_build_object(
        'current_count', streak_record.current_count,
        'longest_count', streak_record.longest_count,
        'status', status,
        'is_active', streak_record.is_active AND NOT is_broken,
        'days_since_activity', days_since_last_activity,
        'days_until_break', GREATEST(0, (grace_periods_available + 1) - days_since_last_activity),
        'grace_periods_available', grace_periods_available,
        'grace_periods_used', streak_record.grace_periods_used,
        'last_activity_date', streak_record.last_activity_date,
        'streak_start_date', streak_record.streak_start_date,
        'next_milestone', COALESCE(row_to_json(next_milestone), '{}'),
        'recent_activity_count', recent_activities
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak (called when user completes activities)
CREATE OR REPLACE FUNCTION update_user_streak(
    target_user_id UUID, 
    target_streak_type TEXT, 
    activity_source TEXT DEFAULT NULL,
    activity_value INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    streak_record user_streaks%ROWTYPE;
    days_since_last_activity INTEGER;
    grace_period_used BOOLEAN DEFAULT FALSE;
    new_achievement RECORD;
    achievement_earned BOOLEAN DEFAULT FALSE;
BEGIN
    -- Get or create streak record
    INSERT INTO user_streaks (user_id, streak_type)
    VALUES (target_user_id, target_streak_type)
    ON CONFLICT (user_id, streak_type) DO NOTHING;
    
    SELECT * INTO streak_record
    FROM user_streaks 
    WHERE user_id = target_user_id 
    AND streak_type = target_streak_type;
    
    days_since_last_activity := CURRENT_DATE - streak_record.last_activity_date;
    
    -- Check if we need to use grace period or reset streak
    IF days_since_last_activity > 1 THEN
        IF days_since_last_activity <= (streak_record.max_grace_periods - streak_record.grace_periods_used + 1) THEN
            -- Use grace period
            grace_period_used := TRUE;
            UPDATE user_streaks 
            SET grace_periods_used = grace_periods_used + (days_since_last_activity - 1)
            WHERE user_id = target_user_id AND streak_type = target_streak_type;
        ELSE
            -- Reset streak
            UPDATE user_streaks 
            SET 
                current_count = 1,
                streak_start_date = CURRENT_DATE,
                grace_periods_used = 0,
                last_activity_date = CURRENT_DATE,
                updated_at = NOW()
            WHERE user_id = target_user_id AND streak_type = target_streak_type;
            
            -- Log the activity
            INSERT INTO streak_activities (user_id, streak_type, activity_source, activity_value)
            VALUES (target_user_id, target_streak_type, activity_source, activity_value);
            
            RETURN jsonb_build_object(
                'streak_reset', true,
                'new_count', 1,
                'message', 'Streak reset - starting fresh!'
            );
        END IF;
    END IF;
    
    -- Update streak count (only if not already updated today)
    IF streak_record.last_activity_date < CURRENT_DATE THEN
        UPDATE user_streaks 
        SET 
            current_count = current_count + activity_value,
            longest_count = GREATEST(longest_count, current_count + activity_value),
            last_activity_date = CURRENT_DATE,
            is_active = TRUE,
            updated_at = NOW()
        WHERE user_id = target_user_id AND streak_type = target_streak_type
        RETURNING current_count INTO streak_record.current_count;
        
        -- Check for milestone achievement
        SELECT * INTO new_achievement
        FROM streak_milestones 
        WHERE streak_type = target_streak_type 
        AND milestone_value = streak_record.current_count
        AND NOT EXISTS (
            SELECT 1 FROM user_achievements 
            WHERE user_id = target_user_id 
            AND achievement_key = target_streak_type || '_' || milestone_value
        );
        
        IF FOUND THEN
            INSERT INTO user_achievements (
                user_id, 
                achievement_type, 
                achievement_key, 
                title, 
                description, 
                badge_icon,
                metadata
            ) VALUES (
                target_user_id,
                'streak_milestone',
                target_streak_type || '_' || new_achievement.milestone_value,
                new_achievement.title,
                new_achievement.description,
                new_achievement.badge_icon,
                jsonb_build_object(
                    'streak_type', target_streak_type,
                    'milestone_value', new_achievement.milestone_value,
                    'reward_type', new_achievement.reward_type,
                    'reward_data', new_achievement.reward_data
                )
            );
            
            achievement_earned := TRUE;
        END IF;
    END IF;
    
    -- Log the activity
    INSERT INTO streak_activities (
        user_id, 
        streak_type, 
        activity_source, 
        activity_value, 
        grace_period_used
    ) VALUES (
        target_user_id, 
        target_streak_type, 
        activity_source, 
        activity_value, 
        grace_period_used
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'current_count', streak_record.current_count,
        'grace_period_used', grace_period_used,
        'achievement_earned', achievement_earned,
        'achievement_data', COALESCE(row_to_json(new_achievement), '{}')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_user_streak_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streak(UUID, TEXT, TEXT, INTEGER) TO authenticated;