-- Migration: Emotion-Aware Notification Intelligence with OneSignal Integration
-- Revolutionary notification system that adapts to emotional states and relationship dynamics

-- Enhanced notification system with emotional intelligence
CREATE TABLE IF NOT EXISTS emotion_aware_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Notification details
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('ritual_reminder', 'appreciation_prompt', 'connection_nudge', 'milestone_celebration', 'crisis_intervention', 'growth_encouragement', 'partner_activity', 'custom')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Emotional intelligence
    target_emotional_state VARCHAR(20), -- the emotional state we want to guide user toward
    detected_user_mood VARCHAR(20), -- user's current detected mood
    emotional_context JSONB, -- rich emotional context data
    empathy_level INTEGER DEFAULT 3 CHECK (empathy_level BETWEEN 1 AND 5), -- how emotionally supportive the message is
    
    -- Psychological targeting
    psychological_trigger VARCHAR(30), -- curiosity, urgency, social_proof, reciprocity, etc.
    nlp_patterns JSONB, -- embedded NLP techniques in the message
    cognitive_load INTEGER DEFAULT 2 CHECK (cognitive_load BETWEEN 1 AND 5), -- mental effort required to process
    
    -- Relationship context
    relationship_stage VARCHAR(20), -- new, established, challenged, thriving
    couple_mood_sync JSONB, -- both partners' emotional states
    relationship_health_score DECIMAL(3,2), -- 0.00 to 1.00 relationship wellness
    
    -- Timing intelligence
    optimal_send_time TIMESTAMPTZ, -- AI-calculated best time to send
    circadian_optimization BOOLEAN DEFAULT false, -- aligned with user's natural rhythms
    relationship_timing_score DECIMAL(3,2), -- how good the timing is for the relationship
    
    -- Personalization
    personality_adaptation JSONB, -- adaptations for user's personality type
    love_language_focus VARCHAR(20), -- which love language the notification targets
    attachment_style_consideration JSONB, -- modifications for attachment style
    
    -- Delivery and engagement
    onesignal_notification_id TEXT, -- OneSignal's internal ID
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'dismissed', 'failed')),
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    
    -- Engagement analytics
    engagement_score DECIMAL(3,2), -- 0.00 to 1.00 how engaged user was
    emotional_response VARCHAR(20), -- user's emotional response if detected
    follow_through_action BOOLEAN DEFAULT false, -- did user complete the suggested action
    relationship_impact_rating DECIMAL(3,2), -- impact on relationship (user feedback)
    
    -- AI learning data
    effectiveness_score DECIMAL(3,2), -- overall effectiveness for learning
    optimization_feedback JSONB, -- data for improving future notifications
    a_b_test_variant VARCHAR(20), -- for testing different approaches
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Emotional state tracking for notification intelligence
CREATE TABLE IF NOT EXISTS user_emotional_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Emotional data
    primary_emotion VARCHAR(20) NOT NULL, -- joy, love, stress, sadness, etc.
    emotion_intensity INTEGER CHECK (emotion_intensity BETWEEN 1 AND 5),
    secondary_emotions VARCHAR(20)[], -- array of secondary emotions
    emotional_stability DECIMAL(3,2) DEFAULT 0.50, -- how stable the emotional state is
    
    -- Context
    emotion_trigger VARCHAR(30), -- what caused this emotional state
    relationship_related BOOLEAN DEFAULT false, -- is this emotion relationship-related
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    
    -- Detection method
    detection_method VARCHAR(20) NOT NULL CHECK (detection_method IN ('self_reported', 'ai_inferred', 'behavior_pattern', 'partner_reported', 'app_interaction')),
    confidence_score DECIMAL(3,2) DEFAULT 0.50, -- confidence in emotion detection
    
    -- Timing and duration
    emotional_state_start TIMESTAMPTZ DEFAULT NOW(),
    estimated_duration_minutes INTEGER,
    is_current_state BOOLEAN DEFAULT true,
    
    -- Partner impact
    affects_partner BOOLEAN DEFAULT false,
    partner_notification_sent BOOLEAN DEFAULT false,
    couple_emotional_sync JSONB, -- how both partners' emotions align
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notification templates with emotional intelligence
CREATE TABLE IF NOT EXISTS emotional_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template details
    template_name TEXT NOT NULL,
    notification_type VARCHAR(30) NOT NULL,
    base_title TEXT NOT NULL,
    base_message TEXT NOT NULL,
    
    -- Emotional targeting
    target_emotions VARCHAR(20)[], -- which emotions this template works best for
    avoid_emotions VARCHAR(20)[], -- emotions where this template should not be used
    emotional_tone VARCHAR(20) NOT NULL, -- supportive, encouraging, playful, urgent, etc.
    empathy_expressions JSONB, -- ways to express empathy in the message
    
    -- Psychological techniques
    primary_psychology_technique VARCHAR(30), -- scarcity, social_proof, curiosity, etc.
    nlp_elements JSONB, -- embedded NLP patterns and techniques
    persuasion_principles TEXT[], -- Cialdini's principles used
    
    -- Personalization rules
    personalization_variables JSONB, -- variables that can be substituted
    personality_adaptations JSONB, -- how to adapt for different personality types
    love_language_variants JSONB, -- variations for different love languages
    attachment_style_modifications JSONB, -- modifications for attachment styles
    
    -- Timing intelligence
    optimal_timing_rules JSONB, -- rules for when to send this notification
    circadian_preferences JSONB, -- best times of day for this message type
    relationship_context_timing JSONB, -- timing based on relationship events
    
    -- Effectiveness data
    historical_success_rate DECIMAL(3,2) DEFAULT 0.50,
    emotional_response_data JSONB, -- how users typically respond emotionally
    engagement_metrics JSONB, -- click rates, follow-through rates, etc.
    
    -- A/B testing
    variants JSONB, -- different versions for testing
    current_winner_variant TEXT,
    last_optimized_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_by_ai BOOLEAN DEFAULT true,
    requires_partner_context BOOLEAN DEFAULT false,
    crisis_intervention_capable BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Notification scheduling with emotional intelligence
CREATE TABLE IF NOT EXISTS intelligent_notification_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Scheduling details
    notification_template_id UUID REFERENCES emotional_notification_templates(id),
    scheduled_send_time TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 5 is highest priority
    
    -- Emotional context for scheduling
    required_emotional_state VARCHAR(20), -- only send if user is in this state
    avoid_if_emotional_state VARCHAR(20)[], -- don't send if user is in these states
    emotional_preparation_needed BOOLEAN DEFAULT false, -- needs mood priming first
    
    -- Relationship context
    requires_partner_availability BOOLEAN DEFAULT false,
    couple_sync_requirement VARCHAR(20), -- both_available, either_available, independent
    relationship_milestone_tied BOOLEAN DEFAULT false,
    
    -- Adaptive scheduling
    can_reschedule BOOLEAN DEFAULT true,
    max_reschedule_attempts INTEGER DEFAULT 3,
    reschedule_interval_minutes INTEGER DEFAULT 60,
    fallback_template_id UUID REFERENCES emotional_notification_templates(id),
    
    -- Delivery tracking
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'rescheduled', 'cancelled', 'failed')),
    actual_send_time TIMESTAMPTZ,
    reschedule_count INTEGER DEFAULT 0,
    cancellation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Crisis detection and intervention system
CREATE TABLE IF NOT EXISTS relationship_crisis_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID REFERENCES pairs(id) ON DELETE CASCADE NOT NULL,
    
    -- Crisis identification
    crisis_type VARCHAR(30) NOT NULL CHECK (crisis_type IN ('communication_breakdown', 'emotional_distance', 'conflict_escalation', 'intimacy_issues', 'external_stress', 'trust_concerns', 'life_transition', 'custom')),
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 5), -- 5 is most severe
    confidence_score DECIMAL(3,2) NOT NULL, -- AI confidence in crisis detection
    
    -- Detection signals
    detection_signals JSONB NOT NULL, -- what signals triggered the detection
    behavioral_patterns JSONB, -- concerning behavioral patterns observed
    emotional_indicators JSONB, -- emotional state indicators
    communication_analysis JSONB, -- analysis of couple's communication patterns
    
    -- Timeline and context
    crisis_onset_estimate TIMESTAMPTZ, -- estimated when crisis began
    duration_estimate_days INTEGER, -- estimated duration so far
    escalation_trajectory VARCHAR(20), -- improving, stable, worsening, critical
    
    -- Intervention tracking
    intervention_triggered BOOLEAN DEFAULT false,
    intervention_type VARCHAR(30), -- immediate_notification, gentle_guidance, professional_referral
    intervention_sent_at TIMESTAMPTZ,
    intervention_effectiveness DECIMAL(3,2), -- measured effectiveness
    
    -- Resolution tracking
    crisis_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolution_method VARCHAR(30), -- self_resolved, app_intervention, external_help
    lessons_learned JSONB, -- insights for improving future detection
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emotion_notifications_user_type ON emotion_aware_notifications(user_id, notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotion_notifications_delivery ON emotion_aware_notifications(delivery_status, sent_at);
CREATE INDEX IF NOT EXISTS idx_emotional_states_user_current ON user_emotional_states(user_id, is_current_state) WHERE is_current_state = true;
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON emotional_notification_templates(notification_type, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_schedule_time ON intelligent_notification_schedule(scheduled_send_time, status);
CREATE INDEX IF NOT EXISTS idx_crisis_detection_pair ON relationship_crisis_detection(pair_id, created_at DESC);

-- RLS Policies
ALTER TABLE emotion_aware_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_emotional_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligent_notification_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_crisis_detection ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Users can manage their own emotion-aware notifications"
    ON emotion_aware_notifications FOR ALL
    USING (user_id = auth.uid());

-- Emotional states policies
CREATE POLICY "Users can manage their own emotional states"
    ON user_emotional_states FOR ALL
    USING (user_id = auth.uid());

-- Template policies (read-only for users)
CREATE POLICY "Users can read active notification templates"
    ON emotional_notification_templates FOR SELECT
    USING (is_active = true);

-- Schedule policies
CREATE POLICY "Users can manage their own notification schedule"
    ON intelligent_notification_schedule FOR ALL
    USING (user_id = auth.uid());

-- Crisis detection policies
CREATE POLICY "Users can access crisis detection for their pair"
    ON relationship_crisis_detection FOR ALL
    USING (
        pair_id IN (
            SELECT id FROM pairs 
            WHERE (user_a = auth.uid() OR user_b = auth.uid()) 
            AND status = 'active'
        )
    );

-- Function to detect current emotional state
CREATE OR REPLACE FUNCTION detect_user_emotional_state(
    target_user_id UUID,
    detection_context JSONB DEFAULT '{}'::jsonb
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_emotion user_emotional_states;
    behavioral_indicators JSONB;
    ai_inference JSONB;
    result JSON;
BEGIN
    -- Only allow users to detect their own emotional state
    IF target_user_id != auth.uid() THEN
        RETURN json_build_object('error', 'Access denied');
    END IF;
    
    -- Get most recent emotional state
    SELECT * INTO current_emotion
    FROM user_emotional_states
    WHERE user_id = target_user_id
    AND is_current_state = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Simple AI inference based on recent activity (would be more sophisticated in production)
    behavioral_indicators := json_build_object(
        'recent_app_usage', 'active',
        'interaction_patterns', 'positive',
        'response_times', 'normal'
    );
    
    -- If no recent emotional state, infer from context
    IF current_emotion IS NULL THEN
        ai_inference := json_build_object(
            'primary_emotion', 'neutral',
            'intensity', 3,
            'confidence', 0.6,
            'detection_method', 'ai_inferred'
        );
    ELSE
        ai_inference := json_build_object(
            'primary_emotion', current_emotion.primary_emotion,
            'intensity', current_emotion.emotion_intensity,
            'confidence', current_emotion.confidence_score,
            'detection_method', current_emotion.detection_method
        );
    END IF;
    
    result := json_build_object(
        'success', true,
        'emotional_state', ai_inference,
        'behavioral_indicators', behavioral_indicators,
        'context', detection_context,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to generate emotionally intelligent notification
CREATE OR REPLACE FUNCTION generate_emotional_notification(
    target_user_id UUID,
    notification_type VARCHAR(30),
    emotional_context JSONB DEFAULT '{}'::jsonb
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_emotion VARCHAR(20);
    template_record emotional_notification_templates;
    personalized_message TEXT;
    personalized_title TEXT;
    result JSON;
    user_profile profiles;
BEGIN
    -- Only allow users to generate notifications for themselves
    IF target_user_id != auth.uid() THEN
        RETURN json_build_object('error', 'Access denied');
    END IF;
    
    -- Get user profile for personalization
    SELECT * INTO user_profile
    FROM profiles
    WHERE user_id = target_user_id;
    
    -- Detect current emotional state
    SELECT primary_emotion INTO user_emotion
    FROM user_emotional_states
    WHERE user_id = target_user_id
    AND is_current_state = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Default to neutral if no emotional state detected
    user_emotion := COALESCE(user_emotion, 'neutral');
    
    -- Find appropriate template based on notification type and emotional state
    SELECT * INTO template_record
    FROM emotional_notification_templates
    WHERE notification_type = generate_emotional_notification.notification_type
    AND is_active = true
    AND (target_emotions IS NULL OR user_emotion = ANY(target_emotions))
    AND (avoid_emotions IS NULL OR NOT (user_emotion = ANY(avoid_emotions)))
    ORDER BY historical_success_rate DESC
    LIMIT 1;
    
    -- If no template found, use default
    IF template_record IS NULL THEN
        RETURN json_build_object(
            'error', 'No suitable template found',
            'notification_type', notification_type,
            'user_emotion', user_emotion
        );
    END IF;
    
    -- Personalize the message
    personalized_title := replace(template_record.base_title, '{user_name}', COALESCE(user_profile.full_name, 'there'));
    personalized_title := replace(personalized_title, '{emotion}', user_emotion);
    
    personalized_message := replace(template_record.base_message, '{user_name}', COALESCE(user_profile.full_name, 'you'));
    personalized_message := replace(personalized_message, '{emotion}', user_emotion);
    
    -- Build result
    result := json_build_object(
        'success', true,
        'template_id', template_record.id,
        'title', personalized_title,
        'message', personalized_message,
        'emotional_tone', template_record.emotional_tone,
        'psychology_technique', template_record.primary_psychology_technique,
        'user_emotion', user_emotion,
        'empathy_level', COALESCE((emotional_context->>'empathy_level')::INTEGER, 3),
        'generated_at', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Insert sample emotional notification templates
INSERT INTO emotional_notification_templates (
    template_name,
    notification_type,
    base_title,
    base_message,
    target_emotions,
    emotional_tone,
    primary_psychology_technique,
    nlp_elements,
    historical_success_rate
) VALUES
(
    'Stress Relief Connection Prompt',
    'connection_nudge',
    'Your partner could use some love right now 💕',
    'Life can be overwhelming sometimes. A simple "I love you" or gentle touch can work wonders. Your partner is feeling stressed - this could be the perfect moment to be their safe harbor.',
    ARRAY['stress', 'overwhelmed', 'anxiety'],
    'supportive',
    'reciprocity',
    '{"presuppositions": ["Your love makes a difference", "You have the power to help"], "embedded_commands": ["be their safe harbor", "work wonders"], "empathy_anchors": ["overwhelming", "perfect moment"]}'::jsonb,
    0.78
),
(
    'Joy Amplification Ritual',
    'ritual_reminder',
    'Capture this beautiful moment together ✨',
    'You both seem to be in such a wonderful space right now! This is the perfect time for your daily ritual - when you\'re both feeling good, connection flows even more naturally.',
    ARRAY['joy', 'happiness', 'excitement', 'contentment'],
    'encouraging',
    'momentum',
    '{"amplification_language": ["beautiful moment", "wonderful space", "flows naturally"], "timing_emphasis": ["perfect time", "right now"], "positive_presuppositions": ["connection flows"]}'::jsonb,
    0.82
),
(
    'Gentle Reconnection After Distance',
    'appreciation_prompt',
    'Small gestures, big impact 🌱',
    'Sometimes we drift a little - it\'s completely normal. What if you shared one thing you appreciate about your partner right now? Even the smallest acknowledgment can rebuild bridges.',
    ARRAY['distance', 'disconnected', 'neutral'],
    'gentle',
    'curiosity',
    '{"normalization": ["completely normal", "sometimes we drift"], "possibility_language": ["what if", "can rebuild"], "minimization": ["smallest acknowledgment", "one thing"]}'::jsonb,
    0.71
),
(
    'Crisis Gentle Intervention',
    'crisis_intervention',
    'You\'re not alone in this 🤝',
    'Relationships go through seasons - some sunny, some stormy. Right now feels challenging, but you have tools and each other. One gentle conversation or kind gesture might be exactly what\'s needed.',
    ARRAY['anger', 'sadness', 'frustration', 'distance'],
    'compassionate',
    'hope',
    '{"metaphor_use": ["seasons", "sunny", "stormy"], "resource_reminder": ["you have tools", "each other"], "possibility_framing": ["might be exactly", "one gentle"]}'::jsonb,
    0.69
),
(
    'Growth Moment Recognition',
    'growth_encouragement',
    'Look how far you\'ve come together 🌟',
    'Every challenge you\'ve navigated, every laugh you\'ve shared, every moment you\'ve chosen love - it all matters. You\'re building something beautiful, one day at a time.',
    ARRAY['reflective', 'grateful', 'peaceful'],
    'affirming',
    'social_proof',
    '{"progress_acknowledgment": ["how far", "every challenge navigated"], "value_stacking": ["every laugh", "every moment", "it all matters"], "future_pacing": ["building something beautiful"]}'::jsonb,
    0.85
)
ON CONFLICT (template_name) DO NOTHING;

-- Update timestamp triggers
CREATE TRIGGER update_emotion_notifications_updated_at 
    BEFORE UPDATE ON emotion_aware_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emotional_states_updated_at 
    BEFORE UPDATE ON user_emotional_states 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON emotional_notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_schedule_updated_at 
    BEFORE UPDATE ON intelligent_notification_schedule 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crisis_detection_updated_at 
    BEFORE UPDATE ON relationship_crisis_detection 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON emotion_aware_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_emotional_states TO authenticated;
GRANT SELECT ON emotional_notification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON intelligent_notification_schedule TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON relationship_crisis_detection TO authenticated;
GRANT EXECUTE ON FUNCTION detect_user_emotional_state(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_emotional_notification(UUID, VARCHAR(30), JSONB) TO authenticated;