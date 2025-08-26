-- Migration: AI-Powered Plans & Planner System with Predictive Scheduling
-- Revolutionary relationship planning with AI optimization and neuroscience timing

-- Relationship plans with AI-driven scheduling and optimization
CREATE TABLE IF NOT EXISTS relationship_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID REFERENCES pairs(id) ON DELETE CASCADE NOT NULL,
    
    -- Plan details
    title TEXT NOT NULL,
    description TEXT,
    plan_type VARCHAR(30) NOT NULL CHECK (plan_type IN ('date_night', 'deep_conversation', 'adventure', 'intimacy_building', 'conflict_resolution', 'growth_activity', 'celebration', 'surprise', 'custom')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('bonding', 'communication', 'adventure', 'intimacy', 'personal_growth', 'fun', 'conflict_healing', 'celebration')),
    
    -- AI scheduling optimization
    ai_confidence_score DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00 confidence in AI recommendations
    optimal_timing_prediction JSONB, -- AI-predicted best times based on patterns
    personalization_factors JSONB, -- factors used for personalization
    scheduling_constraints JSONB, -- user-defined constraints and preferences
    
    -- Predictive analytics
    predicted_success_rate DECIMAL(3,2) DEFAULT 0.50,
    predicted_satisfaction_score DECIMAL(3,2) DEFAULT 0.50,
    predicted_relationship_impact DECIMAL(3,2) DEFAULT 0.50,
    energy_level_requirement INTEGER CHECK (energy_level_requirement BETWEEN 1 AND 5),
    emotional_complexity INTEGER CHECK (emotional_complexity BETWEEN 1 AND 5),
    
    -- Scheduling details
    scheduled_date TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    location_type VARCHAR(20) CHECK (location_type IN ('home', 'outdoor', 'restaurant', 'activity_venue', 'virtual', 'anywhere')),
    location_details TEXT,
    preparation_time_minutes INTEGER DEFAULT 15,
    
    -- Execution tracking
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'scheduled', 'reminded', 'in_progress', 'completed', 'postponed', 'cancelled')),
    completion_rating INTEGER CHECK (completion_rating BETWEEN 1 AND 10),
    actual_satisfaction_score DECIMAL(3,2),
    execution_notes TEXT,
    lessons_learned JSONB,
    
    -- AI learning and optimization
    ai_prediction_accuracy DECIMAL(3,2), -- How accurate were the AI predictions
    plan_effectiveness_score DECIMAL(3,2), -- Overall effectiveness for learning
    adaptation_suggestions JSONB, -- AI suggestions for future improvements
    
    -- Neuroscience optimization
    circadian_optimization BOOLEAN DEFAULT false, -- scheduled at optimal circadian time
    dopamine_triggers JSONB, -- planned dopamine reward moments
    oxytocin_opportunities JSONB, -- planned bonding/touch moments
    cognitive_load_balance JSONB, -- balance of mental effort throughout plan
    
    -- Partner synchronization
    created_by_user UUID REFERENCES profiles(user_id) NOT NULL,
    partner_approval_status VARCHAR(15) DEFAULT 'pending' CHECK (partner_approval_status IN ('pending', 'approved', 'suggested_changes', 'declined')),
    partner_input_requested BOOLEAN DEFAULT false,
    partner_modifications JSONB,
    collaborative_score DECIMAL(3,2) DEFAULT 0.00, -- how collaborative the planning was
    
    -- Recurrence and patterns
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- daily, weekly, monthly patterns
    parent_template_id UUID REFERENCES relationship_plans(id),
    pattern_learning_data JSONB, -- AI learns from recurring plan success
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- AI plan templates with machine learning optimization
CREATE TABLE IF NOT EXISTS ai_plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template details
    template_name TEXT NOT NULL,
    template_description TEXT,
    plan_type VARCHAR(30) NOT NULL,
    category VARCHAR(20) NOT NULL,
    
    -- AI personalization rules
    personalization_algorithm JSONB NOT NULL, -- rules for customizing the template
    success_patterns JSONB, -- learned patterns from successful executions
    optimization_rules JSONB, -- AI rules for timing and execution optimization
    
    -- Template content with AI variables
    title_template TEXT NOT NULL, -- with {variables} for AI substitution
    description_template TEXT,
    activity_sequence JSONB NOT NULL, -- ordered list of activities with timing
    preparation_checklist JSONB,
    conversation_starters JSONB,
    
    -- Predictive modeling data
    base_success_rate DECIMAL(3,2) DEFAULT 0.50,
    personalization_impact_factors JSONB, -- how different factors affect success
    optimal_conditions JSONB, -- conditions that maximize success
    
    -- Learning and evolution
    usage_count INTEGER DEFAULT 0,
    success_feedback_scores JSONB, -- array of satisfaction scores from uses
    adaptation_history JSONB, -- how the template has evolved with AI learning
    last_optimized_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Targeting and filtering
    relationship_stage_fit JSONB, -- which relationship stages this works best for
    personality_type_fit JSONB, -- personality types that respond well
    love_language_optimization JSONB, -- optimization for different love languages
    attachment_style_considerations JSONB, -- attachment style modifications
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_by_ai BOOLEAN DEFAULT true,
    human_curated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Predictive scheduling with machine learning
CREATE TABLE IF NOT EXISTS scheduling_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID REFERENCES pairs(id) ON DELETE CASCADE NOT NULL,
    
    -- Prediction details
    prediction_type VARCHAR(30) NOT NULL CHECK (prediction_type IN ('optimal_timing', 'activity_preference', 'energy_levels', 'mood_forecast', 'availability_prediction', 'success_likelihood')),
    prediction_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    
    -- Time context
    prediction_for_date DATE NOT NULL,
    prediction_for_time_range TSTZRANGE, -- specific time range if applicable
    factors_considered JSONB, -- what data points influenced this prediction
    
    -- Learning and validation
    actual_outcome JSONB, -- what actually happened (for learning)
    prediction_accuracy DECIMAL(3,2), -- how accurate the prediction was
    model_version TEXT DEFAULT 'v1.0',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User scheduling preferences and constraints
CREATE TABLE IF NOT EXISTS user_scheduling_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Time preferences
    preferred_days_of_week INTEGER[], -- array of 0-6 (Sunday-Saturday)
    preferred_time_ranges JSONB, -- array of time ranges by day
    blackout_periods JSONB, -- times user is never available
    energy_patterns JSONB, -- when user has high/low energy
    
    -- Activity preferences
    activity_preferences JSONB, -- ratings for different activity types
    location_preferences JSONB, -- indoor/outdoor/venue preferences
    spontaneity_score DECIMAL(3,2) DEFAULT 0.50, -- how much user likes spontaneous plans
    planning_horizon_preference INTEGER DEFAULT 7, -- how many days ahead to plan
    
    -- AI personalization settings
    ai_optimization_level VARCHAR(15) DEFAULT 'balanced' CHECK (ai_optimization_level IN ('minimal', 'balanced', 'aggressive', 'experimental')),
    allow_ai_surprises BOOLEAN DEFAULT true,
    require_partner_approval BOOLEAN DEFAULT true,
    notification_preferences JSONB,
    
    -- Learning data
    historical_satisfaction_scores JSONB, -- past satisfaction with different plan types
    behavioral_patterns JSONB, -- learned patterns about user behavior
    last_preference_update TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id)
);

-- Plan execution analytics for AI learning
CREATE TABLE IF NOT EXISTS plan_execution_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES relationship_plans(id) ON DELETE CASCADE NOT NULL,
    
    -- Execution metrics
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    actual_duration_minutes INTEGER,
    completion_percentage DECIMAL(3,2) DEFAULT 1.00,
    
    -- Satisfaction and feedback
    user_a_satisfaction INTEGER CHECK (user_a_satisfaction BETWEEN 1 AND 10),
    user_b_satisfaction INTEGER CHECK (user_b_satisfaction BETWEEN 1 AND 10),
    user_a_energy_level INTEGER CHECK (user_a_energy_level BETWEEN 1 AND 5),
    user_b_energy_level INTEGER CHECK (user_b_energy_level BETWEEN 1 AND 5),
    user_a_mood_before VARCHAR(20),
    user_a_mood_after VARCHAR(20),
    user_b_mood_before VARCHAR(20),
    user_b_mood_after VARCHAR(20),
    
    -- Detailed feedback
    what_worked_well TEXT[],
    what_could_improve TEXT[],
    unexpected_outcomes TEXT[],
    would_do_again_rating INTEGER CHECK (would_do_again_rating BETWEEN 1 AND 10),
    
    -- Context data
    weather_conditions JSONB,
    external_disruptions JSONB,
    preparation_quality INTEGER CHECK (preparation_quality BETWEEN 1 AND 5),
    
    -- AI learning insights
    ai_prediction_validation JSONB, -- how accurate were the AI predictions
    learning_points_extracted JSONB, -- insights for future AI optimization
    pattern_contributions JSONB, -- how this execution contributes to pattern learning
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_relationship_plans_pair_date ON relationship_plans(pair_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_plans_status ON relationship_plans(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ai_plan_templates_type ON ai_plan_templates(plan_type, category, is_active);
CREATE INDEX IF NOT EXISTS idx_scheduling_predictions_pair_date ON scheduling_predictions(pair_id, prediction_for_date);
CREATE INDEX IF NOT EXISTS idx_plan_execution_analytics_plan ON plan_execution_analytics(plan_id, start_time);
CREATE INDEX IF NOT EXISTS idx_user_scheduling_preferences_user ON user_scheduling_preferences(user_id);

-- RLS Policies
ALTER TABLE relationship_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scheduling_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_execution_analytics ENABLE ROW LEVEL SECURITY;

-- Relationship plans policies
CREATE POLICY "Users can manage plans for their pair"
    ON relationship_plans FOR ALL
    USING (
        pair_id IN (
            SELECT id FROM pairs 
            WHERE (user_a = auth.uid() OR user_b = auth.uid()) 
            AND status = 'active'
        )
    );

-- AI plan templates policies (read-only for users)
CREATE POLICY "Users can read active plan templates"
    ON ai_plan_templates FOR SELECT
    USING (is_active = true);

-- Scheduling predictions policies
CREATE POLICY "Users can access predictions for their pair"
    ON scheduling_predictions FOR ALL
    USING (
        pair_id IN (
            SELECT id FROM pairs 
            WHERE (user_a = auth.uid() OR user_b = auth.uid()) 
            AND status = 'active'
        )
    );

-- User preferences policies
CREATE POLICY "Users can manage their own scheduling preferences"
    ON user_scheduling_preferences FOR ALL
    USING (user_id = auth.uid());

-- Plan execution analytics policies
CREATE POLICY "Users can access analytics for their plans"
    ON plan_execution_analytics FOR ALL
    USING (
        plan_id IN (
            SELECT rp.id FROM relationship_plans rp
            JOIN pairs p ON p.id = rp.pair_id
            WHERE (p.user_a = auth.uid() OR p.user_b = auth.uid())
            AND p.status = 'active'
        )
    );

-- Function to generate AI-optimized plan suggestions
CREATE OR REPLACE FUNCTION generate_ai_plan_suggestions(
    target_pair_id UUID,
    plan_category VARCHAR(20) DEFAULT NULL,
    target_date DATE DEFAULT NULL,
    duration_preference INTEGER DEFAULT 60
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pair_record pairs;
    user_a_prefs user_scheduling_preferences;
    user_b_prefs user_scheduling_preferences;
    suggestions JSON;
    template_record ai_plan_templates;
BEGIN
    -- Get pair information
    SELECT * INTO pair_record
    FROM pairs 
    WHERE id = target_pair_id 
    AND status = 'active'
    AND (user_a = auth.uid() OR user_b = auth.uid());
    
    IF pair_record IS NULL THEN
        RETURN json_build_object('error', 'Pair not found or access denied');
    END IF;
    
    -- Get user preferences
    SELECT * INTO user_a_prefs
    FROM user_scheduling_preferences
    WHERE user_id = pair_record.user_a;
    
    SELECT * INTO user_b_prefs
    FROM user_scheduling_preferences
    WHERE user_id = pair_record.user_b;
    
    -- Generate suggestions based on AI templates and preferences
    -- This is a simplified version - in production, this would use ML models
    
    WITH scored_templates AS (
        SELECT 
            t.*,
            CASE 
                WHEN plan_category IS NOT NULL AND t.category = plan_category THEN 1.0
                ELSE 0.7
            END * 
            COALESCE(t.base_success_rate, 0.5) as suggestion_score
        FROM ai_plan_templates t
        WHERE t.is_active = true
        ORDER BY suggestion_score DESC
        LIMIT 5
    )
    SELECT json_agg(
        json_build_object(
            'template_id', id,
            'title', template_name,
            'description', template_description,
            'category', category,
            'plan_type', plan_type,
            'predicted_success_rate', suggestion_score,
            'estimated_duration', COALESCE(
                (activity_sequence->0->>'duration')::INTEGER, 
                duration_preference
            ),
            'personalized_title', replace(
                replace(title_template, '{partner_name}', 'your partner'),
                '{activity}', COALESCE(category, 'special activity')
            )
        )
        ORDER BY suggestion_score DESC
    ) INTO suggestions
    FROM scored_templates;
    
    RETURN COALESCE(suggestions, '[]'::json);
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', 'Failed to generate suggestions: ' || SQLERRM);
END;
$$;

-- Function to calculate optimal scheduling time
CREATE OR REPLACE FUNCTION calculate_optimal_schedule_time(
    target_pair_id UUID,
    plan_duration_minutes INTEGER DEFAULT 60,
    target_date_range DATERANGE DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pair_record pairs;
    optimal_times JSON;
    date_to_check DATE;
    current_date_iter DATE;
    end_date DATE;
BEGIN
    -- Get pair information and validate access
    SELECT * INTO pair_record
    FROM pairs 
    WHERE id = target_pair_id 
    AND status = 'active'
    AND (user_a = auth.uid() OR user_b = auth.uid());
    
    IF pair_record IS NULL THEN
        RETURN json_build_object('error', 'Pair not found or access denied');
    END IF;
    
    -- Set date range (default to next 14 days)
    current_date_iter := COALESCE(lower(target_date_range), CURRENT_DATE);
    end_date := COALESCE(upper(target_date_range), CURRENT_DATE + INTERVAL '14 days');
    
    -- Calculate optimal times (simplified version)
    -- In production, this would use ML models trained on historical data
    WITH date_series AS (
        SELECT generate_series(current_date_iter, end_date, '1 day'::interval)::DATE as check_date
    ),
    optimal_calculations AS (
        SELECT 
            ds.check_date,
            json_build_object(
                'date', ds.check_date,
                'optimal_start_times', json_build_array(
                    json_build_object('time', '19:00', 'confidence', 0.85, 'reason', 'Evening relaxation time'),
                    json_build_object('time', '10:00', 'confidence', 0.75, 'reason', 'Weekend morning energy'),
                    json_build_object('time', '15:00', 'confidence', 0.65, 'reason', 'Afternoon connection time')
                ),
                'energy_prediction', json_build_object(
                    'user_a_energy', CASE WHEN EXTRACT(dow FROM ds.check_date) IN (0, 6) THEN 4 ELSE 3 END,
                    'user_b_energy', CASE WHEN EXTRACT(dow FROM ds.check_date) IN (0, 6) THEN 4 ELSE 3 END
                ),
                'availability_confidence', 0.80
            ) as time_data
        FROM date_series ds
        LIMIT 14
    )
    SELECT json_agg(time_data ORDER BY check_date) INTO optimal_times
    FROM optimal_calculations;
    
    RETURN COALESCE(optimal_times, '[]'::json);
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', 'Failed to calculate optimal times: ' || SQLERRM);
END;
$$;

-- Insert sample AI plan templates
INSERT INTO ai_plan_templates (
    template_name,
    template_description,
    plan_type,
    category,
    title_template,
    description_template,
    activity_sequence,
    preparation_checklist,
    conversation_starters,
    base_success_rate,
    personalization_algorithm,
    success_patterns,
    optimization_rules
) VALUES
(
    'Intimate Evening Connection',
    'A carefully designed evening to deepen emotional intimacy through meaningful conversation and shared presence',
    'deep_conversation',
    'intimacy',
    'Heart-to-Heart Evening with {partner_name}',
    'Create a sacred space for deep connection and vulnerability with your partner',
    '[
        {"activity": "prepare_space", "duration": 15, "description": "Create comfortable, distraction-free environment"},
        {"activity": "gratitude_sharing", "duration": 10, "description": "Share 3 things you appreciate about each other"},
        {"activity": "deep_questions", "duration": 30, "description": "Explore meaningful conversation starters"},
        {"activity": "physical_connection", "duration": 15, "description": "Non-sexual physical intimacy and presence"},
        {"activity": "future_visioning", "duration": 20, "description": "Dream together about shared future"}
    ]',
    '["Comfortable seating/cushions", "Soft lighting or candles", "Turn off all devices", "Prepare warm drinks", "Set intention together"]',
    '["What has been the most meaningful part of our relationship this month?", "What dream of yours would you like me to support more?", "How do you feel most loved and appreciated by me?"]',
    0.78,
    '{"personalization_factors": ["attachment_style", "communication_preference", "intimacy_comfort_level"], "timing_optimization": "evening_preference", "duration_flexibility": true}',
    '{"high_satisfaction_indicators": ["slow_start", "vulnerability_sharing", "physical_touch"], "optimal_conditions": ["quiet_environment", "no_time_pressure"]}',
    '{"optimal_timing": "evening_after_dinner", "energy_requirement": "medium", "emotional_preparation": "5_minutes_centering"}'
),
(
    'Adventure Discovery Date',
    'An energizing shared adventure designed to create new memories and strengthen the bond through novel experiences',
    'adventure',
    'bonding',
    '{activity_type} Adventure with {partner_name}',
    'Embark on a new experience together to strengthen your bond and create lasting memories',
    '[
        {"activity": "preparation", "duration": 20, "description": "Gather supplies and set adventure mindset"},
        {"activity": "journey_start", "duration": 15, "description": "Begin journey with intention and excitement"},
        {"activity": "main_activity", "duration": 90, "description": "Engage in chosen adventure activity together"},
        {"activity": "reflection_time", "duration": 15, "description": "Share immediate thoughts and feelings"},
        {"activity": "celebration", "duration": 20, "description": "Celebrate the experience together"}
    ]',
    '["Check weather and dress appropriately", "Bring water and snacks", "Charge devices for photos", "Inform someone of plans", "Set positive intentions"]',
    '["What part of this adventure are you most excited about?", "How does trying new things together make you feel?", "What would make this experience even more special?"]',
    0.82,
    '{"personalization_factors": ["adventure_preference", "fitness_level", "novelty_seeking"], "location_optimization": true, "weather_considerations": true}',
    '{"high_satisfaction_indicators": ["shared_challenge", "mutual_encouragement", "photo_taking"], "optimal_conditions": ["good_weather", "adequate_time", "positive_energy"]}',
    '{"optimal_timing": "morning_or_afternoon", "energy_requirement": "high", "preparation_time": "30_minutes"}'
),
(
    'Cozy Home Date Night',
    'A nurturing at-home experience focused on comfort, connection, and simple pleasures together',
    'date_night',
    'bonding',
    'Cozy {theme} Night at Home',
    'Transform your home into a special retreat for connection and relaxation together',
    '[
        {"activity": "space_transformation", "duration": 25, "description": "Transform living space into cozy retreat"},
        {"activity": "cooking_together", "duration": 45, "description": "Prepare special meal or treats together"},
        {"activity": "mindful_eating", "duration": 30, "description": "Enjoy meal with full presence and appreciation"},
        {"activity": "connection_activity", "duration": 40, "description": "Engage in chosen bonding activity"},
        {"activity": "relaxation_time", "duration": 30, "description": "Wind down together in comfort"}
    ]',
    '["Plan simple but special menu", "Gather candles or soft lighting", "Choose playlist", "Prepare cozy blankets", "Turn off work notifications"]',
    '["What makes you feel most relaxed and comfortable?", "What are you most grateful for in our relationship right now?", "How can we make more time for moments like this?"]',
    0.75,
    '{"personalization_factors": ["home_comfort_level", "cooking_enjoyment", "relaxation_preference"], "theme_customization": true, "dietary_considerations": true}',
    '{"high_satisfaction_indicators": ["collaborative_preparation", "relaxed_atmosphere", "quality_conversation"], "optimal_conditions": ["no_external_pressures", "prepared_ingredients", "comfortable_temperature"]}',
    '{"optimal_timing": "evening_weekend", "energy_requirement": "low_medium", "preparation_time": "45_minutes"}'
)
ON CONFLICT (template_name) DO NOTHING;

-- Update timestamp triggers
CREATE TRIGGER update_relationship_plans_updated_at 
    BEFORE UPDATE ON relationship_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_plan_templates_updated_at 
    BEFORE UPDATE ON ai_plan_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_scheduling_preferences_updated_at 
    BEFORE UPDATE ON user_scheduling_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON relationship_plans TO authenticated;
GRANT SELECT ON ai_plan_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduling_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_scheduling_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON plan_execution_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION generate_ai_plan_suggestions(UUID, VARCHAR(20), DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_optimal_schedule_time(UUID, INTEGER, DATERANGE) TO authenticated;