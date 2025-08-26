-- 005_partner_interaction.sql: Enhanced partner interaction features

-- Add partner sharing capabilities to existing notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS visible_to_partner BOOLEAN DEFAULT false;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add partner activity tracking
CREATE TABLE partner_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('ritual_completed', 'note_added', 'appreciation_sent', 'play_move', 'connection_milestone')),
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    item_type TEXT, -- 'dq', 'micro_action', etc. for item-specific activities
    item_id TEXT,    -- date or identifier for the specific item
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate activity logs per day per type
    UNIQUE(user_id, activity_type, activity_date, item_type, item_id)
);

-- Connection health metrics
CREATE TABLE connection_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID REFERENCES pairs(id) ON DELETE CASCADE NOT NULL,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_a_ritual_completed BOOLEAN DEFAULT false,
    user_b_ritual_completed BOOLEAN DEFAULT false,
    shared_activities_count INTEGER DEFAULT 0,
    notes_exchanged_count INTEGER DEFAULT 0,
    play_sessions_active INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(pair_id, metric_date)
);

-- Partner sharing preferences
CREATE TABLE partner_sharing_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE UNIQUE NOT NULL,
    share_ritual_completion BOOLEAN DEFAULT true,
    share_identity_choices BOOLEAN DEFAULT false,
    share_journal_entries BOOLEAN DEFAULT false,
    share_appreciation_content BOOLEAN DEFAULT true,
    share_reflection_notes BOOLEAN DEFAULT false,
    share_micro_action_completion BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{
        "ritual_reminders": true,
        "partner_activity": true,
        "play_invites": true,
        "milestone_celebrations": true
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced play sessions with game state
ALTER TABLE play_sessions ADD COLUMN IF NOT EXISTS game_type TEXT DEFAULT 'you_or_me' CHECK (game_type IN ('you_or_me', 'trivia', 'prompts', 'compatibility_quiz'));
ALTER TABLE play_sessions ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1;
ALTER TABLE play_sessions ADD COLUMN IF NOT EXISTS max_rounds INTEGER DEFAULT 5;
ALTER TABLE play_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Game moves/responses
CREATE TABLE game_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    play_session_id UUID REFERENCES play_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    round_number INTEGER NOT NULL,
    move_data JSONB NOT NULL, -- contains the actual move/choice/answer
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_partner_activity_user_date ON partner_activity(user_id, activity_date);
CREATE INDEX idx_partner_activity_type ON partner_activity(activity_type);
CREATE INDEX idx_connection_metrics_pair_date ON connection_metrics(pair_id, metric_date);
CREATE INDEX idx_game_moves_session_round ON game_moves(play_session_id, round_number);
CREATE INDEX idx_notes_partner_visible ON notes(visible_to_partner) WHERE visible_to_partner = true;

-- Enable RLS on new tables
ALTER TABLE partner_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_sharing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_activity
CREATE POLICY "Users can view their own activity"
    ON partner_activity FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Partners can view each other's activity"
    ON partner_activity FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pairs p
            WHERE (p.user_a = auth.uid() AND p.user_b = partner_activity.user_id)
               OR (p.user_b = auth.uid() AND p.user_a = partner_activity.user_id)
               AND p.status = 'active'
        )
    );

CREATE POLICY "Users can insert their own activity"
    ON partner_activity FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for connection_metrics
CREATE POLICY "Pair members can view their connection metrics"
    ON connection_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pairs p
            WHERE p.id = connection_metrics.pair_id
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
            AND p.status = 'active'
        )
    );

CREATE POLICY "System can manage connection metrics"
    ON connection_metrics FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for partner_sharing_preferences
CREATE POLICY "Users can manage their own sharing preferences"
    ON partner_sharing_preferences FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners can view sharing preferences"
    ON partner_sharing_preferences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pairs p
            WHERE (p.user_a = auth.uid() AND p.user_b = partner_sharing_preferences.user_id)
               OR (p.user_b = auth.uid() AND p.user_a = partner_sharing_preferences.user_id)
               AND p.status = 'active'
        )
    );

-- RLS Policies for game_moves
CREATE POLICY "Users can view moves in their play sessions"
    ON game_moves FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM play_sessions ps
            JOIN pairs p ON p.id = ps.pair_id
            WHERE ps.id = game_moves.play_session_id
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
            AND p.status = 'active'
        )
    );

CREATE POLICY "Users can insert moves in their play sessions"
    ON game_moves FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM play_sessions ps
            JOIN pairs p ON p.id = ps.pair_id
            WHERE ps.id = play_session_id
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
            AND p.status = 'active'
        )
    );

-- Update existing notes RLS to include partner visibility
DROP POLICY IF EXISTS "Users can view partner notes on shared items" ON notes;

CREATE POLICY "Users can view partner notes when shared"
    ON notes FOR SELECT
    USING (
        auth.uid() != user_id AND
        visible_to_partner = true AND
        EXISTS (
            SELECT 1 FROM pairs p
            WHERE (p.user_a = auth.uid() AND p.user_b = notes.user_id)
               OR (p.user_b = auth.uid() AND p.user_a = notes.user_id)
               AND p.status = 'active'
        )
    );

-- Function to calculate connection streak
CREATE OR REPLACE FUNCTION calculate_connection_streak(target_pair_id UUID)
RETURNS INTEGER AS $$
DECLARE
    streak_count INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    has_activity BOOLEAN;
BEGIN
    LOOP
        -- Check if both users had activity on this date
        SELECT EXISTS(
            SELECT 1 FROM connection_metrics cm
            WHERE cm.pair_id = target_pair_id
            AND cm.metric_date = check_date
            AND cm.user_a_ritual_completed = true
            AND cm.user_b_ritual_completed = true
        ) INTO has_activity;
        
        IF NOT has_activity THEN
            EXIT;
        END IF;
        
        streak_count := streak_count + 1;
        check_date := check_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN streak_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily connection metrics
CREATE OR REPLACE FUNCTION update_connection_metrics(
    target_pair_id UUID,
    target_user_id UUID,
    activity_type TEXT
)
RETURNS void AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    is_user_a BOOLEAN;
BEGIN
    -- Check if user is user_a or user_b in the pair
    SELECT (p.user_a = target_user_id) INTO is_user_a
    FROM pairs p
    WHERE p.id = target_pair_id;
    
    -- Insert or update metrics for today
    INSERT INTO connection_metrics (pair_id, metric_date, user_a_ritual_completed, user_b_ritual_completed)
    VALUES (
        target_pair_id,
        today_date,
        CASE WHEN is_user_a AND activity_type = 'ritual_completed' THEN true ELSE false END,
        CASE WHEN NOT is_user_a AND activity_type = 'ritual_completed' THEN true ELSE false END
    )
    ON CONFLICT (pair_id, metric_date)
    DO UPDATE SET
        user_a_ritual_completed = CASE 
            WHEN is_user_a AND activity_type = 'ritual_completed' THEN true 
            ELSE connection_metrics.user_a_ritual_completed 
        END,
        user_b_ritual_completed = CASE 
            WHEN NOT is_user_a AND activity_type = 'ritual_completed' THEN true 
            ELSE connection_metrics.user_b_ritual_completed 
        END,
        notes_exchanged_count = CASE 
            WHEN activity_type = 'note_added' THEN connection_metrics.notes_exchanged_count + 1 
            ELSE connection_metrics.notes_exchanged_count 
        END,
        updated_at = NOW();
    
    -- Update streak calculation
    UPDATE connection_metrics SET
        streak_days = calculate_connection_streak(target_pair_id)
    WHERE pair_id = target_pair_id AND metric_date = today_date;
END;
$$ LANGUAGE plpgsql;

-- Helpful views
CREATE VIEW partner_dashboard AS
WITH user_pairs AS (
    SELECT 
        p.id as pair_id,
        p.user_a as user_id,
        p.user_b as partner_id,
        prof_partner.email as partner_email,
        prof_partner.full_name as partner_name,
        p.status,
        p.paired_at
    FROM pairs p
    JOIN profiles prof_partner ON prof_partner.user_id = p.user_b
    WHERE p.status = 'active'
    
    UNION ALL
    
    SELECT 
        p.id as pair_id,
        p.user_b as user_id,
        p.user_a as partner_id,
        prof_partner.email as partner_email,
        prof_partner.full_name as partner_name,
        p.status,
        p.paired_at
    FROM pairs p
    JOIN profiles prof_partner ON prof_partner.user_id = p.user_a
    WHERE p.status = 'active'
),
today_metrics AS (
    SELECT 
        cm.pair_id,
        cm.user_a_ritual_completed,
        cm.user_b_ritual_completed,
        cm.shared_activities_count,
        cm.notes_exchanged_count,
        cm.streak_days
    FROM connection_metrics cm
    WHERE cm.metric_date = CURRENT_DATE
)
SELECT 
    up.pair_id,
    up.user_id,
    up.partner_id,
    up.partner_email,
    up.partner_name,
    up.paired_at,
    COALESCE(tm.user_a_ritual_completed, false) as user_a_completed_today,
    COALESCE(tm.user_b_ritual_completed, false) as user_b_completed_today,
    COALESCE(tm.shared_activities_count, 0) as activities_today,
    COALESCE(tm.notes_exchanged_count, 0) as notes_today,
    COALESCE(tm.streak_days, 0) as current_streak
FROM user_pairs up
LEFT JOIN today_metrics tm ON tm.pair_id = up.pair_id;

-- Apply updated_at triggers
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_metrics_updated_at BEFORE UPDATE ON connection_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_sharing_preferences_updated_at BEFORE UPDATE ON partner_sharing_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON partner_activity TO authenticated;
GRANT SELECT ON connection_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON partner_sharing_preferences TO authenticated;
GRANT SELECT, INSERT ON game_moves TO authenticated;
GRANT SELECT ON partner_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_connection_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_connection_metrics(UUID, UUID, TEXT) TO authenticated;