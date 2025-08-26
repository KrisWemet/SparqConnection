-- Temporary script to apply micro-action completion system migration manually
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
    future_pacing_element TEXT, -- "When you find yourself...", "As you continue to...", etc.
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

-- Enable RLS
ALTER TABLE micro_action_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE neuroscience_action_library ENABLE ROW LEVEL SECURITY;

-- Micro-action completions policies
CREATE POLICY "Users can manage their own micro-action completions"
    ON micro_action_completions FOR ALL
    USING (user_id = auth.uid());

-- Neuroscience action library policies (read-only for users)
CREATE POLICY "Users can read action library"
    ON neuroscience_action_library FOR SELECT
    USING (is_active = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON micro_action_completions TO authenticated;
GRANT SELECT ON neuroscience_action_library TO authenticated;