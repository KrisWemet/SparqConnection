-- 001_rls_policies.sql: Row Level Security policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Pairs: Users can read pairs they're part of
CREATE POLICY "Users can view their pairs"
    ON pairs FOR SELECT
    USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create pairs they're part of"
    ON pairs FOR INSERT
    WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can update pairs they're part of"
    ON pairs FOR UPDATE
    USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Identities: Users can manage their own identities
CREATE POLICY "Users can view their own identities"
    ON identities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own identities"
    ON identities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own identities"
    ON identities FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own identities"
    ON identities FOR DELETE
    USING (auth.uid() = user_id);

-- Quest days: Public read access (base content)
CREATE POLICY "Quest days are publicly readable"
    ON quest_days FOR SELECT
    TO authenticated
    USING (true);

-- Daily plans: Users can read their own plans
CREATE POLICY "Users can view their own daily plans"
    ON daily_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily plans"
    ON daily_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily plans"
    ON daily_plans FOR UPDATE
    USING (auth.uid() = user_id);

-- Notes: Users can manage their own notes + read partner notes on shared items
CREATE POLICY "Users can view their own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner notes on shared items"
    ON notes FOR SELECT
    USING (
        auth.uid() != user_id AND
        EXISTS (
            SELECT 1 FROM pairs p
            WHERE (p.user_a = auth.uid() AND p.user_b = notes.user_id)
               OR (p.user_b = auth.uid() AND p.user_a = notes.user_id)
               AND p.status = 'active'
        )
    );

CREATE POLICY "Users can insert their own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- Saves: Users manage their own bookmarks
CREATE POLICY "Users can view their own saves"
    ON saves FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saves"
    ON saves FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saves"
    ON saves FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saves"
    ON saves FOR DELETE
    USING (auth.uid() = user_id);

-- Plans: Users manage their own plans
CREATE POLICY "Users can view their own plans"
    ON plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans"
    ON plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
    ON plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
    ON plans FOR DELETE
    USING (auth.uid() = user_id);

-- Play sessions: Pair members only
CREATE POLICY "Pair members can view their play sessions"
    ON play_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pairs p
            WHERE p.id = play_sessions.pair_id
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
            AND p.status = 'active'
        )
    );

CREATE POLICY "Pair members can insert play sessions"
    ON play_sessions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM pairs p
            WHERE p.id = pair_id
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
            AND p.status = 'active'
        )
    );

CREATE POLICY "Pair members can update their play sessions"
    ON play_sessions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM pairs p
            WHERE p.id = play_sessions.pair_id
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
            AND p.status = 'active'
        )
    );

-- Subscriptions: Users can view/update their own subscription
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
    ON subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Event log: Users can insert their own events, view their own events
CREATE POLICY "Users can view their own events"
    ON event_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events"
    ON event_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);