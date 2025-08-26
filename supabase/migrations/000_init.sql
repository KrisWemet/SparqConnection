-- 000_init.sql: Core tables for Sparq Connection

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    
    -- Onboarding data
    attachment_style TEXT CHECK (attachment_style IN ('avoidant', 'anxious', 'secure', 'mixed')),
    love_languages TEXT[] DEFAULT '{}',
    boundaries_comfort INTEGER CHECK (boundaries_comfort BETWEEN 1 AND 5),
    time_preference TEXT CHECK (time_preference IN ('morning', 'evening')),
    timezone TEXT DEFAULT 'UTC',
    
    -- Context
    life_stage TEXT,
    long_distance BOOLEAN DEFAULT false,
    cohabiting BOOLEAN DEFAULT true,
    children_count INTEGER DEFAULT 0,
    shift_worker BOOLEAN DEFAULT false,
    cultural_notes TEXT,
    
    -- Preferences
    sexuality_opt_in BOOLEAN DEFAULT false,
    analytics_opt_out BOOLEAN DEFAULT false,
    marketing_opt_in BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Couples/pairs table
CREATE TABLE pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    user_b UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'ended')),
    paired_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_a, user_b),
    CONSTRAINT different_users CHECK (user_a != user_b)
);

-- Identity options for users
CREATE TABLE identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    label TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    visible_today BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quest content (canonical base content)
CREATE TABLE quest_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    version INTEGER NOT NULL,
    base_content JSONB NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(quest_id, day, version)
);

-- Daily personalized plans (AI-generated or fallback)
CREATE TABLE daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    source TEXT NOT NULL CHECK (source IN ('ai', 'fallback')),
    content JSONB NOT NULL,
    model_meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Partner Notes (scoped to specific items)
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('dq', 'micro_action', 'appreciation', 'reflection')),
    item_id TEXT NOT NULL, -- date or other identifier
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved items (bookmarks)
CREATE TABLE saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('dq', 'story', 'micro_action', 'journal', 'reflection')),
    item_id TEXT NOT NULL,
    content JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, item_type, item_id)
);

-- Future plans/dates
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    when_at TIMESTAMPTZ,
    context TEXT,
    created_by TEXT, -- 'user' or 'ai'
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Play sessions (games between partners)
CREATE TABLE play_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id UUID REFERENCES pairs(id) ON DELETE CASCADE NOT NULL,
    deck TEXT NOT NULL, -- game type
    state JSONB NOT NULL DEFAULT '{}',
    turn_by UUID REFERENCES profiles(user_id),
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE UNIQUE NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'ultimate')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'incomplete')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    renews_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event logging for analytics
CREATE TABLE event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    props JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_pairs_users ON pairs(user_a, user_b);
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, date);
CREATE INDEX idx_quest_days_quest_day ON quest_days(quest_id, day);
CREATE INDEX idx_notes_user_item ON notes(user_id, item_type, item_id);
CREATE INDEX idx_saves_user_type ON saves(user_id, item_type);
CREATE INDEX idx_event_log_user_name ON event_log(user_id, name);
CREATE INDEX idx_event_log_timestamp ON event_log(timestamp);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_play_sessions_updated_at BEFORE UPDATE ON play_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();