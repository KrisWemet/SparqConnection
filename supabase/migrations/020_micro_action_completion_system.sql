-- Migration: Gamified Micro-Action Completion with Neuroscience Integration
-- Uses hypnotic language patterns and NLP techniques for subconscious relationship upgrade

-- Micro-action completions with psychological programming
CREATE TABLE IF NOT EXISTS micro_action_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Action details
    action_text TEXT NOT NULL,
    action_category VARCHAR(50) NOT NULL CHECK (action_category IN ('touch', 'words', 'acts', 'time', 'gifts', 'physical', 'emotional', 'spiritual')),
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    
    -- Completion tracking
    completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completion_method VARCHAR(20) DEFAULT 'manual' CHECK (completion_method IN ('manual', 'photo_proof', 'location_proof', 'partner_confirm', 'ai_detect')),
    
    -- Proof and validation
    proof_data JSONB, -- photos, location, partner confirmation, etc.
    validation_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00 to 1.00 confidence in completion
    
    -- Neuroscience-based metrics
    emotional_state_before VARCHAR(20), -- captured mood before action
    emotional_state_after VARCHAR(20), -- captured mood after action
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 10),
    relationship_impact_rating INTEGER CHECK (relationship_impact_rating BETWEEN 1 AND 10),
    
    -- Hypnotic reinforcement data
    hypnotic_affirmation TEXT, -- personalized affirmation generated post-completion
    nlp_pattern_used VARCHAR(50), -- anchoring, reframing, future_pacing, etc.
    subconscious_trigger TEXT, -- embedded suggestion for future behavior
    
    -- Gamification elements
    experience_points INTEGER DEFAULT 0,
    streak_contribution BOOLEAN DEFAULT true,
    celebration_type VARCHAR(20) DEFAULT 'standard', -- standard, milestone, breakthrough, legendary
    
    -- Neural pathway strengthening
    repetition_count INTEGER DEFAULT 1, -- how many times this specific action type completed
    neural_strength DECIMAL(4,2) DEFAULT 1.00, -- calculated strength of this behavioral pattern
    habit_formation_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 to 1.00 progress toward automatic behavior
    
    -- Partner synchronization
    partner_aware BOOLEAN DEFAULT false,
    partner_responded BOOLEAN DEFAULT false,
    couple_synergy_bonus INTEGER DEFAULT 0,
    
    -- Timing and context
    completion_context JSONB, -- time of day, location, circumstances
    optimal_timing_hit BOOLEAN DEFAULT false, -- whether completed at neurologically optimal time
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance and analytics
CREATE INDEX IF NOT EXISTS idx_micro_completions_user_date ON micro_action_completions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_completions_category ON micro_action_completions(action_category, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_completions_streak ON micro_action_completions(user_id, streak_contribution) WHERE streak_contribution = true;
CREATE INDEX IF NOT EXISTS idx_micro_completions_neural_strength ON micro_action_completions(user_id, neural_strength DESC);
CREATE INDEX IF NOT EXISTS idx_micro_completions_habit_formation ON micro_action_completions(user_id, habit_formation_score DESC);

-- Neuroscience-based action library with embedded NLP patterns
CREATE TABLE IF NOT EXISTS neuroscience_action_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action core
    base_action TEXT NOT NULL,
    hypnotic_variation TEXT NOT NULL, -- version with embedded hypnotic language patterns
    nlp_embedded_version TEXT NOT NULL, -- version with NLP techniques
    
    -- Psychological targeting
    primary_love_language VARCHAR(20) NOT NULL CHECK (primary_love_language IN ('words', 'acts', 'time', 'touch', 'gifts')),
    attachment_style_focus VARCHAR(20) CHECK (attachment_style_focus IN ('secure', 'anxious', 'avoidant', 'disorganized', 'all')),
    neuroscience_principle VARCHAR(50) NOT NULL, -- neuroplasticity, dopamine_reward, oxytocin_bonding, etc.
    
    -- Hypnotic elements
    embedded_suggestions TEXT[], -- array of subconscious suggestions
    presuppositions TEXT[], -- NLP presuppositions embedded in the action
    anchoring_elements JSONB, -- visual, auditory, kinesthetic anchors
    
    -- Subconscious programming
    identity_shift_target TEXT, -- "I am someone who...", "I naturally...", etc.
    future_pacing_element TEXT, -- "When you find yourself...", "As you continue to..."
    positive_assumption TEXT, -- built-in assumption of success and love
    
    -- Neurological optimization
    optimal_brain_state VARCHAR(20), -- alpha, beta, theta targeting
    neurochemical_target VARCHAR(30), -- dopamine, oxytocin, serotonin, endorphins
    neural_pathway VARCHAR(50), -- which neural pathway this strengthens
    
    -- Timing and context
    circadian_optimization VARCHAR(20), -- morning, afternoon, evening, night
    duration_minutes INTEGER DEFAULT 2,
    cognitive_load INTEGER DEFAULT 1 CHECK (cognitive_load BETWEEN 1 AND 5),
    
    -- Effectiveness metrics
    completion_rate DECIMAL(3,2) DEFAULT 0.00,
    relationship_impact_score DECIMAL(3,2) DEFAULT 0.00,
    habit_formation_speed INTEGER DEFAULT 21, -- days to form habit
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sample neuroscience-based actions with embedded hypnotic patterns
INSERT INTO neuroscience_action_library (
    base_action,
    hypnotic_variation,
    nlp_embedded_version,
    primary_love_language,
    neuroscience_principle,
    embedded_suggestions,
    presuppositions,
    identity_shift_target,
    future_pacing_element,
    positive_assumption,
    neurochemical_target,
    neural_pathway
) VALUES
-- Touch-based oxytocin bonding
(
    'Give your partner a 20-second hug',
    'Allow yourself to melt into a warm, loving 20-second embrace that naturally deepens your connection',
    'As you wrap your arms around your partner for 20 seconds, notice how your body already knows how to create this perfect moment of connection',
    'touch',
    'oxytocin_bonding',
    ARRAY['Physical touch creates automatic emotional bonding', 'Your relationship grows stronger with each embrace', 'Love flows naturally through physical connection'],
    ARRAY['You naturally seek physical connection', 'Your body knows how to love', 'Connection happens automatically'],
    'I am someone who naturally expresses love through meaningful touch',
    'When you find yourself wanting to connect, you will naturally reach for your partner',
    'Your relationship is built on a foundation of natural, loving touch',
    'oxytocin',
    'attachment_bonding'
),

-- Words of affirmation with neuroplasticity
(
    'Tell your partner one specific thing you appreciate about them',
    'Discover and share one beautiful quality about your partner that your heart already knows',
    'As you naturally notice something wonderful about your partner, you find yourself easily expressing this appreciation',
    'words',
    'neuroplasticity_positive_focus',
    ARRAY['Appreciation creates positive neural pathways', 'Your mind automatically finds good in your partner', 'Positive focus rewires your relationship'],
    ARRAY['You naturally see the best in your partner', 'Appreciation flows easily from you', 'Your words create love'],
    'I am someone who naturally sees and expresses the beauty in my partner',
    'Each time you appreciate your partner, you will find even more reasons to appreciate them',
    'Your relationship thrives on the appreciation you naturally share',
    'dopamine',
    'positive_reinforcement_loop'
),

-- Acts of service with dopamine reward
(
    'Complete one small task your partner mentioned they needed to do',
    'Effortlessly complete a small task that will create a moment of relief and joy for your partner',
    'As you naturally notice what would help your partner, you find yourself taking caring action without effort',
    'acts',
    'dopamine_reward_system',
    ARRAY['Helping your partner feels automatically rewarding', 'Service creates mutual joy', 'Your actions build love'],
    ARRAY['You naturally want to help your partner', 'Service brings you joy', 'You easily notice what helps'],
    'I am someone who naturally looks for ways to serve my partner with love',
    'When you see something that would help your partner, you will automatically want to do it',
    'Your caring actions create a cycle of mutual love and support',
    'dopamine',
    'reward_prediction_system'
),

-- Quality time with attention bonding
(
    'Put away all devices and give your partner 10 minutes of complete attention',
    'Create a sacred space of pure attention where only you and your partner exist for 10 beautiful minutes',
    'As you naturally set aside distractions, you discover the gift of being completely present with your partner',
    'time',
    'attention_bonding',
    ARRAY['Presence creates deep intimacy', 'Your attention is a gift of love', 'Being present strengthens connection'],
    ARRAY['You value quality time naturally', 'Presence comes easily to you', 'Your attention creates love'],
    'I am someone who naturally gives the gift of my full presence',
    'When you are with your partner, you will naturally want to be completely present',
    'Your presence is one of the greatest gifts you can offer',
    'oxytocin',
    'mindful_attention_circuit'
);

-- Hypnotic affirmation templates with NLP patterns
CREATE TABLE IF NOT EXISTS hypnotic_affirmation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    template_name VARCHAR(100) NOT NULL,
    hypnotic_structure TEXT NOT NULL, -- template with placeholders
    nlp_techniques TEXT[], -- techniques used: anchoring, presupposition, embedded_command, etc.
    
    -- Neuroscience targeting
    brain_state_target VARCHAR(20), -- alpha, theta for maximum receptivity
    repetition_pattern VARCHAR(50), -- spaced_repetition, immediate_reinforcement, etc.
    
    -- Personalization variables
    variables JSONB, -- {partner_name: string, action_type: string, etc.}
    
    -- Effectiveness
    adoption_rate DECIMAL(3,2) DEFAULT 0.00,
    behavioral_change_correlation DECIMAL(3,2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sample hypnotic affirmation templates
INSERT INTO hypnotic_affirmation_templates (template_name, hypnotic_structure, nlp_techniques, brain_state_target, variables) VALUES
(
    'Action Integration Affirmation',
    'As you continue to {action_verb} with {partner_name}, you naturally find yourself becoming even more {positive_quality}, and each time you {action_verb}, your relationship automatically grows stronger and more loving.',
    ARRAY['embedded_command', 'presupposition', 'cause_effect'],
    'alpha',
    '{"action_verb": "string", "partner_name": "string", "positive_quality": "string"}'::jsonb
),
(
    'Identity Shift Affirmation',
    'You are naturally someone who {identity_statement}, and as this truth becomes more obvious to you, you find it easier and easier to {behavior_pattern}, knowing that {partner_name} feels more loved each time you do.',
    ARRAY['identity_presupposition', 'progressive_acceptance', 'future_pacing'],
    'theta',
    '{"identity_statement": "string", "behavior_pattern": "string", "partner_name": "string"}'::jsonb
),
(
    'Neuroplasticity Reinforcement',
    'Each loving action you take is literally rewiring your brain for deeper connection, and as these neural pathways grow stronger, {positive_behavior} becomes as natural as breathing, creating a beautiful cycle of love with {partner_name}.',
    ARRAY['scientific_presupposition', 'metaphorical_embedding', 'automaticity_suggestion'],
    'alpha',
    '{"positive_behavior": "string", "partner_name": "string"}'::jsonb
);

-- Subconscious programming sessions
CREATE TABLE IF NOT EXISTS subconscious_programming_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Session details
    session_type VARCHAR(30) NOT NULL CHECK (session_type IN ('post_action', 'daily_reinforcement', 'breakthrough_moment', 'habit_installation')),
    programming_content TEXT NOT NULL,
    
    -- NLP techniques used
    primary_technique VARCHAR(30), -- anchoring, reframing, parts_integration, etc.
    hypnotic_elements TEXT[], -- embedded suggestions, presuppositions, etc.
    
    -- Neurological targeting
    brain_state_induced VARCHAR(20), -- alpha, theta, gamma
    session_duration_seconds INTEGER DEFAULT 180, -- 3 minutes default
    
    -- Effectiveness tracking
    user_receptivity_score INTEGER CHECK (user_receptivity_score BETWEEN 1 AND 10),
    implementation_success BOOLEAN,
    behavioral_change_observed BOOLEAN DEFAULT false,
    
    -- Timing and context
    triggered_by_action_id UUID REFERENCES micro_action_completions(id),
    optimal_timing_achieved BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Policies
ALTER TABLE micro_action_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neuroscience_action_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE hypnotic_affirmation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subconscious_programming_sessions ENABLE ROW LEVEL SECURITY;

-- Micro-action completions policies
CREATE POLICY "Users can manage their own micro-action completions"
    ON micro_action_completions FOR ALL
    USING (user_id = auth.uid());

-- Neuroscience action library policies (read-only for users)
CREATE POLICY "Users can read action library"
    ON neuroscience_action_library FOR SELECT
    USING (is_active = true);

-- Hypnotic templates policies (read-only for users)
CREATE POLICY "Users can read affirmation templates"
    ON hypnotic_affirmation_templates FOR SELECT
    USING (true);

-- Programming sessions policies
CREATE POLICY "Users can manage their own programming sessions"
    ON subconscious_programming_sessions FOR ALL
    USING (user_id = auth.uid());

-- Function to generate personalized hypnotic affirmation
CREATE OR REPLACE FUNCTION generate_hypnotic_affirmation(
    target_user_id UUID,
    action_completed TEXT,
    partner_name TEXT DEFAULT 'your partner'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    template_record hypnotic_affirmation_templates;
    affirmation TEXT;
    user_profile profiles;
BEGIN
    -- Only allow users to generate affirmations for themselves
    IF target_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: can only generate affirmations for yourself';
    END IF;
    
    -- Get user profile for personalization
    SELECT * INTO user_profile
    FROM profiles 
    WHERE user_id = target_user_id;
    
    -- Select appropriate template based on action type
    SELECT * INTO template_record
    FROM hypnotic_affirmation_templates
    ORDER BY adoption_rate DESC, behavioral_change_correlation DESC
    LIMIT 1;
    
    -- Generate personalized affirmation
    affirmation := template_record.hypnotic_structure;
    affirmation := replace(affirmation, '{partner_name}', partner_name);
    affirmation := replace(affirmation, '{action_verb}', split_part(action_completed, ' ', 1));
    affirmation := replace(affirmation, '{positive_quality}', 'loving and connected');
    
    RETURN affirmation;
END;
$$;

-- Function to calculate neural pathway strength
CREATE OR REPLACE FUNCTION calculate_neural_strength(
    target_user_id UUID,
    action_category VARCHAR(50)
) RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    completion_count INTEGER;
    recency_factor DECIMAL(3,2);
    consistency_factor DECIMAL(3,2);
    neural_strength DECIMAL(4,2);
BEGIN
    -- Count completions in this category
    SELECT COUNT(*) INTO completion_count
    FROM micro_action_completions
    WHERE user_id = target_user_id
    AND action_category = calculate_neural_strength.action_category
    AND completed_at > NOW() - INTERVAL '30 days';
    
    -- Calculate recency factor (more recent = stronger)
    SELECT COALESCE(
        1.0 - (EXTRACT(days FROM NOW() - MAX(completed_at)) / 30.0),
        0.0
    ) INTO recency_factor
    FROM micro_action_completions
    WHERE user_id = target_user_id
    AND action_category = calculate_neural_strength.action_category;
    
    -- Calculate consistency factor
    consistency_factor := LEAST(completion_count / 10.0, 1.0);
    
    -- Combine factors using neuroscience-based formula
    neural_strength := (completion_count * 0.4) + (recency_factor * 0.3) + (consistency_factor * 0.3);
    
    RETURN LEAST(neural_strength, 10.00);
END;
$$;

-- Update timestamp triggers
CREATE TRIGGER update_micro_completions_updated_at 
    BEFORE UPDATE ON micro_action_completions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_neuroscience_library_updated_at 
    BEFORE UPDATE ON neuroscience_action_library 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON micro_action_completions TO authenticated;
GRANT SELECT ON neuroscience_action_library TO authenticated;
GRANT SELECT ON hypnotic_affirmation_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subconscious_programming_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION generate_hypnotic_affirmation(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_neural_strength(UUID, VARCHAR(50)) TO authenticated;