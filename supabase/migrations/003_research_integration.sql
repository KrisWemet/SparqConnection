-- 003_research_integration.sql: Additional tables and features for MVP

-- Default identities for new users
INSERT INTO quest_days (quest_id, day, version, base_content, tags) VALUES
-- These will be populated by the seed script, but add a sample for testing
('sample_quest', 1, 1, '{
    "story": "A moment of connection begins with presence.",
    "dq": "What helps you feel most present with your partner?",
    "micro_action": "Take three deep breaths together before starting a conversation.",
    "journal": "Notice one moment today when presence made a difference.",
    "reflection": "How did being present change the quality of our interaction?"
}', ARRAY['light', 'mindfulness'])
ON CONFLICT (quest_id, day, version) DO NOTHING;

-- Default identity options (available to all users)
CREATE TABLE default_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL UNIQUE,
    description TEXT,
    is_premium BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);

INSERT INTO default_identities (label, description, sort_order) VALUES
('Patient Listener', 'I focus on truly hearing my partner', 1),
('Gentle Encourager', 'I offer support and positive motivation', 2),
('Playful Partner', 'I bring lightness and joy to our connection', 3),
('Thoughtful Planner', 'I create space for meaningful experiences', 4),
('Caring Supporter', 'I prioritize my partner''s well-being and comfort', 5),
('Honest Communicator', 'I share openly while being respectful', 6),
('Growth Mindset', 'I approach challenges as opportunities to learn', 7);

-- Notification preferences
CREATE TABLE notification_preferences (
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE PRIMARY KEY,
    ritual_reminder BOOLEAN DEFAULT true,
    ritual_reminder_time TIME DEFAULT '09:00:00',
    identity_spot BOOLEAN DEFAULT true,
    play_invites BOOLEAN DEFAULT true,
    partner_activity BOOLEAN DEFAULT true,
    marketing_updates BOOLEAN DEFAULT false,
    snooze_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE default_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "Default identities are publicly readable"
    ON default_identities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view their own notification preferences"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for notification preferences updated_at
CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize user defaults after profile creation
CREATE OR REPLACE FUNCTION initialize_user_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create default notification preferences
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create default identities for user (first 3 are free)
    INSERT INTO identities (user_id, label, is_custom)
    SELECT NEW.user_id, label, false
    FROM default_identities
    WHERE sort_order <= 3
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Trigger to initialize defaults when profile is created
CREATE TRIGGER after_profile_insert
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION initialize_user_defaults();

-- View for user's available identities (includes both default and custom)
CREATE OR REPLACE VIEW user_identities AS
SELECT 
    i.id,
    i.user_id,
    i.label,
    i.is_custom,
    i.visible_today,
    CASE WHEN i.is_custom THEN true ELSE di.is_premium END as requires_premium
FROM identities i
LEFT JOIN default_identities di ON di.label = i.label
WHERE i.is_custom = true OR di.id IS NOT NULL;

-- Rate limiting helper function
CREATE OR REPLACE FUNCTION check_rate_limit(
    user_uuid UUID,
    action_type TEXT,
    limit_count INTEGER,
    window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO current_count
    FROM event_log
    WHERE user_id = user_uuid
      AND name = action_type
      AND timestamp > NOW() - (window_minutes || ' minutes')::INTERVAL;
    
    RETURN current_count < limit_count;
END;
$$;

-- Add indexes for performance
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX idx_default_identities_premium ON default_identities(is_premium, sort_order);
CREATE INDEX idx_identities_user_visible ON identities(user_id, visible_today);

