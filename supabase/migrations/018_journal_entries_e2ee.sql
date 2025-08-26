-- Migration: Journal Entries with E2EE Support
-- Revolutionary encrypted journaling system for relationship insights

-- Journal entries table with E2EE support
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Encryption metadata
    encrypted_content TEXT NOT NULL, -- E2EE encrypted journal content
    encryption_method VARCHAR(50) DEFAULT 'AES-GCM-256' NOT NULL,
    iv TEXT NOT NULL, -- Initialization vector for encryption
    
    -- Entry metadata (unencrypted for querying)
    entry_date DATE DEFAULT CURRENT_DATE NOT NULL,
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    
    -- Privacy settings
    is_private BOOLEAN DEFAULT true NOT NULL,
    is_shared_with_partner BOOLEAN DEFAULT false NOT NULL,
    partner_can_view BOOLEAN DEFAULT false NOT NULL,
    
    -- AI insights (privacy-preserving)
    sentiment_score DECIMAL(3,2), -- -1.00 to 1.00 (computed on encrypted content)
    mood_tags TEXT[], -- extracted mood indicators
    relationship_themes TEXT[], -- detected themes (privacy-preserving)
    
    -- Journal prompts and context
    prompt_type VARCHAR(50), -- 'daily', 'custom', 'guided'
    prompt_text TEXT, -- The original prompt that inspired this entry
    
    -- Versioning and drafts
    is_draft BOOLEAN DEFAULT false NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    parent_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    published_at TIMESTAMPTZ, -- when shared with partner
    
    -- Constraints
    CONSTRAINT word_count_positive CHECK (word_count >= 0),
    CONSTRAINT character_count_positive CHECK (character_count >= 0),
    CONSTRAINT sentiment_range CHECK (sentiment_score IS NULL OR (sentiment_score >= -1.00 AND sentiment_score <= 1.00))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_created ON journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_drafts ON journal_entries(user_id, is_draft) WHERE is_draft = true;
CREATE INDEX IF NOT EXISTS idx_journal_entries_shared ON journal_entries(user_id, is_shared_with_partner) WHERE is_shared_with_partner = true;
CREATE INDEX IF NOT EXISTS idx_journal_entries_mood ON journal_entries(user_id, mood_tags) WHERE mood_tags IS NOT NULL;

-- RLS Policies
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view their own journal entries"
    ON journal_entries FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own entries
CREATE POLICY "Users can insert their own journal entries"
    ON journal_entries FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own entries
CREATE POLICY "Users can update their own journal entries"
    ON journal_entries FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own entries
CREATE POLICY "Users can delete their own journal entries"
    ON journal_entries FOR DELETE
    USING (user_id = auth.uid());

-- Partners can view shared entries (if in active pair)
CREATE POLICY "Partners can view shared journal entries"
    ON journal_entries FOR SELECT
    USING (
        is_shared_with_partner = true 
        AND partner_can_view = true
        AND EXISTS (
            SELECT 1 FROM pairs 
            WHERE status = 'active' 
            AND ((user_a = auth.uid() AND user_b = journal_entries.user_id) 
                 OR (user_b = auth.uid() AND user_a = journal_entries.user_id))
        )
    );

-- Journal entry reactions (for partner engagement)
CREATE TABLE IF NOT EXISTS journal_entry_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Reaction types
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('heart', 'hug', 'support', 'laugh', 'cry', 'think')),
    reaction_emoji VARCHAR(10), -- emoji representation
    
    -- Optional message (also encrypted if journal is private)
    encrypted_message TEXT,
    encryption_method VARCHAR(50),
    iv TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- One reaction per user per entry
    UNIQUE(journal_entry_id, user_id)
);

-- Indexes for reactions
CREATE INDEX IF NOT EXISTS idx_journal_reactions_entry ON journal_entry_reactions(journal_entry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_reactions_user ON journal_entry_reactions(user_id, created_at DESC);

-- RLS for reactions
ALTER TABLE journal_entry_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on entries they can see
CREATE POLICY "Users can view reactions on accessible journal entries"
    ON journal_entry_reactions FOR SELECT
    USING (
        -- Can see reactions on own entries
        EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE id = journal_entry_id AND user_id = auth.uid()
        )
        OR
        -- Can see reactions on shared entries from partner
        EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE id = journal_entry_id 
            AND is_shared_with_partner = true 
            AND partner_can_view = true
            AND EXISTS (
                SELECT 1 FROM pairs 
                WHERE status = 'active' 
                AND ((user_a = auth.uid() AND user_b = journal_entries.user_id) 
                     OR (user_b = auth.uid() AND user_a = journal_entries.user_id))
            )
        )
    );

-- Users can add reactions to entries they can view
CREATE POLICY "Users can react to accessible journal entries"
    ON journal_entry_reactions FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (
            -- Can react to partner's shared entries
            EXISTS (
                SELECT 1 FROM journal_entries 
                WHERE id = journal_entry_id 
                AND is_shared_with_partner = true 
                AND partner_can_view = true
                AND user_id != auth.uid()
                AND EXISTS (
                    SELECT 1 FROM pairs 
                    WHERE status = 'active' 
                    AND ((user_a = auth.uid() AND user_b = journal_entries.user_id) 
                         OR (user_b = auth.uid() AND user_a = journal_entries.user_id))
                )
            )
        )
    );

-- Users can update their own reactions
CREATE POLICY "Users can update their own reactions"
    ON journal_entry_reactions FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
    ON journal_entry_reactions FOR DELETE
    USING (user_id = auth.uid());

-- Journal insights table (privacy-preserving analytics)
CREATE TABLE IF NOT EXISTS journal_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Time period for insights
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('week', 'month', 'quarter')),
    
    -- Aggregated insights (computed from encrypted entries)
    total_entries INTEGER DEFAULT 0 NOT NULL,
    avg_word_count DECIMAL(10,2) DEFAULT 0,
    avg_sentiment_score DECIMAL(3,2),
    
    -- Mood and theme analysis
    dominant_moods TEXT[],
    emerging_themes TEXT[],
    relationship_growth_indicators TEXT[],
    
    -- Privacy-preserving patterns
    writing_frequency_pattern JSONB, -- time-based writing patterns
    emotional_journey JSONB, -- sentiment trends over time
    
    -- Insights metadata
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_start <= period_end),
    UNIQUE(user_id, period_start, period_end, period_type)
);

-- Indexes for insights
CREATE INDEX IF NOT EXISTS idx_journal_insights_user_period ON journal_insights(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_journal_insights_generated ON journal_insights(generated_at DESC);

-- RLS for insights
ALTER TABLE journal_insights ENABLE ROW LEVEL SECURITY;

-- Users can only see their own insights
CREATE POLICY "Users can view their own journal insights"
    ON journal_insights FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own journal insights"
    ON journal_insights FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own journal insights"
    ON journal_insights FOR UPDATE
    USING (user_id = auth.uid());

-- Function to compute privacy-preserving insights
CREATE OR REPLACE FUNCTION generate_journal_insights(
    target_user_id UUID,
    start_date DATE,
    end_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    insight_data JSONB;
    entry_count INTEGER;
    avg_words DECIMAL(10,2);
    avg_sentiment DECIMAL(3,2);
    mood_array TEXT[];
BEGIN
    -- Only allow users to generate insights for themselves
    IF target_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: can only generate insights for yourself';
    END IF;
    
    -- Calculate basic metrics
    SELECT 
        COUNT(*),
        AVG(word_count),
        AVG(sentiment_score)
    INTO entry_count, avg_words, avg_sentiment
    FROM journal_entries
    WHERE user_id = target_user_id
    AND entry_date BETWEEN start_date AND end_date
    AND is_draft = false;
    
    -- Get dominant moods
    SELECT array_agg(DISTINCT mood)
    INTO mood_array
    FROM (
        SELECT unnest(mood_tags) as mood
        FROM journal_entries
        WHERE user_id = target_user_id
        AND entry_date BETWEEN start_date AND end_date
        AND mood_tags IS NOT NULL
        AND is_draft = false
    ) moods
    LIMIT 5;
    
    -- Build insight object
    insight_data := jsonb_build_object(
        'total_entries', COALESCE(entry_count, 0),
        'avg_word_count', COALESCE(avg_words, 0),
        'avg_sentiment', avg_sentiment,
        'dominant_moods', COALESCE(mood_array, '{}'),
        'period_start', start_date,
        'period_end', end_date
    );
    
    RETURN insight_data;
END;
$$;

-- Update timestamp trigger
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_insights_updated_at BEFORE UPDATE ON journal_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entry_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON journal_insights TO authenticated;
GRANT EXECUTE ON FUNCTION generate_journal_insights(UUID, DATE, DATE) TO authenticated;