-- Migration: Next-Generation Appreciation Delivery System
-- Multi-modal appreciation delivery with emotional intelligence

-- Appreciation deliveries table
CREATE TABLE IF NOT EXISTS appreciation_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Content and encryption
    message_content TEXT NOT NULL,
    encrypted_content TEXT, -- Optional E2EE for sensitive messages
    encryption_method VARCHAR(50),
    iv TEXT,
    
    -- Delivery channels and preferences
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('in_app', 'sms', 'email', 'whatsapp', 'calendar_event', 'push_notification')),
    preferred_method VARCHAR(20), -- User's original choice
    fallback_methods TEXT[], -- Ordered array of fallback delivery methods
    
    -- Emotional intelligence
    emotional_tone VARCHAR(20) CHECK (emotional_tone IN ('loving', 'grateful', 'playful', 'supportive', 'proud', 'apologetic', 'encouraging')),
    sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
    message_category VARCHAR(50), -- e.g., 'daily_appreciation', 'milestone', 'spontaneous'
    
    -- Timing and scheduling
    scheduled_for TIMESTAMPTZ,
    optimal_delivery_window JSONB, -- {start: "09:00", end: "18:00", timezone: "America/New_York"}
    send_immediately BOOLEAN DEFAULT true,
    
    -- Delivery status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sending', 'delivered', 'failed', 'cancelled')),
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Channel-specific delivery data
    delivery_metadata JSONB, -- Stores channel-specific info (message IDs, etc.)
    external_message_id VARCHAR(255), -- ID from external services (Twilio, SendGrid, etc.)
    
    -- Recipient interaction tracking
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    response_content TEXT,
    response_reaction VARCHAR(20), -- emoji reaction
    emotional_impact_score INTEGER CHECK (emotional_impact_score BETWEEN 1 AND 5),
    
    -- Context and triggers
    triggered_by VARCHAR(50), -- 'daily_ritual', 'milestone', 'manual', 'ai_suggestion'
    context_data JSONB, -- Additional context about what triggered this appreciation
    
    -- Personalization
    template_used VARCHAR(100),
    personalization_data JSONB, -- Data used to personalize the message
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT sender_not_recipient CHECK (sender_id != recipient_id),
    CONSTRAINT valid_sentiment_score CHECK (sentiment_score IS NULL OR (sentiment_score >= -1.00 AND sentiment_score <= 1.00))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appreciation_deliveries_sender ON appreciation_deliveries(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appreciation_deliveries_recipient ON appreciation_deliveries(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appreciation_deliveries_status ON appreciation_deliveries(status, scheduled_for) WHERE status IN ('pending', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_appreciation_deliveries_delivery_method ON appreciation_deliveries(delivery_method, status);
CREATE INDEX IF NOT EXISTS idx_appreciation_deliveries_scheduled ON appreciation_deliveries(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Delivery channels configuration
CREATE TABLE IF NOT EXISTS delivery_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Channel configuration
    channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('sms', 'email', 'whatsapp', 'calendar', 'push')),
    is_enabled BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Channel-specific settings
    contact_info VARCHAR(255), -- phone number, email address, etc.
    settings JSONB, -- Channel-specific preferences
    
    -- Verification
    verification_code VARCHAR(10),
    verification_expires_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    
    -- Usage tracking
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- One configuration per channel per user
    UNIQUE(user_id, channel_type)
);

-- Indexes for delivery channels
CREATE INDEX IF NOT EXISTS idx_delivery_channels_user ON delivery_channels(user_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_delivery_channels_enabled ON delivery_channels(channel_type, is_enabled) WHERE is_enabled = true;

-- AI-powered delivery optimization data
CREATE TABLE IF NOT EXISTS delivery_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    
    -- Timing patterns
    optimal_delivery_hours INTEGER[], -- Array of preferred hours (0-23)
    timezone_preference VARCHAR(50),
    
    -- Response patterns
    avg_response_time_minutes INTEGER,
    preferred_message_length INTEGER, -- words
    most_effective_emotional_tone VARCHAR(20),
    
    -- Channel effectiveness
    channel_effectiveness JSONB, -- {"sms": 0.95, "email": 0.78, ...}
    channel_preference_order TEXT[], -- ["in_app", "sms", "email"]
    
    -- Engagement metrics
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_viewed INTEGER DEFAULT 0,
    total_messages_responded INTEGER DEFAULT 0,
    avg_emotional_impact DECIMAL(3,2),
    
    -- Learning data
    last_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    data_points_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- One insights record per user
    UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE appreciation_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_insights ENABLE ROW LEVEL SECURITY;

-- Appreciation deliveries policies
CREATE POLICY "Users can view their sent and received appreciations"
    ON appreciation_deliveries FOR SELECT
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send appreciations"
    ON appreciation_deliveries FOR INSERT
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update appreciations they sent"
    ON appreciation_deliveries FOR UPDATE
    USING (sender_id = auth.uid());

CREATE POLICY "Recipients can update viewed/response status"
    ON appreciation_deliveries FOR UPDATE
    USING (
        recipient_id = auth.uid() 
        AND (viewed_at IS NOT NULL OR responded_at IS NOT NULL OR response_content IS NOT NULL OR emotional_impact_score IS NOT NULL)
    );

-- Delivery channels policies
CREATE POLICY "Users can manage their own delivery channels"
    ON delivery_channels FOR ALL
    USING (user_id = auth.uid());

-- Delivery insights policies  
CREATE POLICY "Users can view their own delivery insights"
    ON delivery_insights FOR ALL
    USING (user_id = auth.uid());

-- Function to get optimal delivery time for a user
CREATE OR REPLACE FUNCTION get_optimal_delivery_time(
    target_user_id UUID,
    base_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    insights_record delivery_insights;
    optimal_hour INTEGER;
    target_time TIMESTAMPTZ;
BEGIN
    -- Get user's delivery insights
    SELECT * INTO insights_record
    FROM delivery_insights
    WHERE user_id = target_user_id;
    
    -- If no insights available, return immediate delivery
    IF insights_record IS NULL THEN
        RETURN base_time;
    END IF;
    
    -- Get the optimal hour from insights
    IF insights_record.optimal_delivery_hours IS NOT NULL 
       AND array_length(insights_record.optimal_delivery_hours, 1) > 0 THEN
        -- Pick the first optimal hour (could be randomized)
        optimal_hour := insights_record.optimal_delivery_hours[1];
        
        -- Calculate target time for today at optimal hour
        target_time := date_trunc('day', base_time) + (optimal_hour || ' hours')::interval;
        
        -- If optimal time has passed today, schedule for tomorrow
        IF target_time <= base_time THEN
            target_time := target_time + interval '1 day';
        END IF;
        
        RETURN target_time;
    END IF;
    
    -- Fallback to immediate delivery
    RETURN base_time;
END;
$$;

-- Function to update delivery insights based on interaction
CREATE OR REPLACE FUNCTION update_delivery_insights(
    target_user_id UUID,
    delivery_method VARCHAR(20),
    was_viewed BOOLEAN,
    response_time_minutes INTEGER DEFAULT NULL,
    emotional_impact INTEGER DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_insights delivery_insights;
BEGIN
    -- Get or create insights record
    SELECT * INTO current_insights
    FROM delivery_insights
    WHERE user_id = target_user_id;
    
    IF current_insights IS NULL THEN
        INSERT INTO delivery_insights (user_id, total_messages_sent)
        VALUES (target_user_id, 1);
    ELSE
        -- Update metrics
        UPDATE delivery_insights 
        SET 
            total_messages_sent = total_messages_sent + 1,
            total_messages_viewed = total_messages_viewed + CASE WHEN was_viewed THEN 1 ELSE 0 END,
            total_messages_responded = total_messages_responded + CASE WHEN response_time_minutes IS NOT NULL THEN 1 ELSE 0 END,
            avg_response_time_minutes = CASE 
                WHEN response_time_minutes IS NOT NULL THEN 
                    COALESCE(avg_response_time_minutes * total_messages_responded + response_time_minutes, response_time_minutes) / (total_messages_responded + 1)
                ELSE avg_response_time_minutes
            END,
            avg_emotional_impact = CASE
                WHEN emotional_impact IS NOT NULL THEN
                    COALESCE(avg_emotional_impact * data_points_count + emotional_impact, emotional_impact) / (data_points_count + 1)
                ELSE avg_emotional_impact
            END,
            data_points_count = data_points_count + 1,
            last_updated_at = NOW()
        WHERE user_id = target_user_id;
    END IF;
END;
$$;

-- Function to schedule appreciation delivery
CREATE OR REPLACE FUNCTION schedule_appreciation_delivery(
    sender_user_id UUID,
    recipient_user_id UUID,
    message_content TEXT,
    delivery_method VARCHAR(20) DEFAULT 'in_app',
    emotional_tone VARCHAR(20) DEFAULT 'loving',
    send_immediately BOOLEAN DEFAULT true
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    delivery_id UUID;
    scheduled_time TIMESTAMPTZ;
    recipient_insights delivery_insights;
BEGIN
    -- Validate that sender is authenticated user
    IF sender_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: can only send appreciations as yourself';
    END IF;
    
    -- Determine delivery time
    IF send_immediately THEN
        scheduled_time := NOW();
    ELSE
        scheduled_time := get_optimal_delivery_time(recipient_user_id);
    END IF;
    
    -- Create the delivery record
    INSERT INTO appreciation_deliveries (
        sender_id,
        recipient_id,
        message_content,
        delivery_method,
        preferred_method,
        emotional_tone,
        scheduled_for,
        send_immediately,
        status,
        triggered_by
    ) VALUES (
        sender_user_id,
        recipient_user_id,
        message_content,
        delivery_method,
        delivery_method,
        emotional_tone,
        scheduled_time,
        send_immediately,
        CASE WHEN send_immediately THEN 'pending' ELSE 'scheduled' END,
        'manual'
    ) RETURNING id INTO delivery_id;
    
    RETURN delivery_id;
END;
$$;

-- Update timestamp triggers
CREATE TRIGGER update_appreciation_deliveries_updated_at 
    BEFORE UPDATE ON appreciation_deliveries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_channels_updated_at 
    BEFORE UPDATE ON delivery_channels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON appreciation_deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_channels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON delivery_insights TO authenticated;
GRANT EXECUTE ON FUNCTION get_optimal_delivery_time(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION update_delivery_insights(UUID, VARCHAR(20), BOOLEAN, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_appreciation_delivery(UUID, UUID, TEXT, VARCHAR(20), VARCHAR(20), BOOLEAN) TO authenticated;