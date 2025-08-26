-- 002_functions.sql: Database functions and triggers

-- Function to get user's active pair
CREATE OR REPLACE FUNCTION get_user_pair(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id
    FROM pairs
    WHERE (user_a = user_uuid OR user_b = user_uuid)
      AND status = 'active'
    LIMIT 1;
$$;

-- Function to get partner's user_id
CREATE OR REPLACE FUNCTION get_partner_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT CASE
        WHEN user_a = user_uuid THEN user_b
        ELSE user_a
    END
    FROM pairs
    WHERE (user_a = user_uuid OR user_b = user_uuid)
      AND status = 'active'
    LIMIT 1;
$$;

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (user_id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get today's plan for user
CREATE OR REPLACE FUNCTION get_today_plan(user_uuid UUID, plan_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    plan_content JSONB;
BEGIN
    -- Try to get existing daily plan
    SELECT content INTO plan_content
    FROM daily_plans
    WHERE user_id = user_uuid AND date = plan_date;
    
    IF plan_content IS NOT NULL THEN
        RETURN plan_content;
    END IF;
    
    -- Return null if no plan exists (will trigger AI generation or fallback)
    RETURN NULL;
END;
$$;

-- Function to soft delete user data (GDPR compliance)
CREATE OR REPLACE FUNCTION soft_delete_user(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Mark pairs as ended
    UPDATE pairs
    SET status = 'ended', updated_at = NOW()
    WHERE (user_a = user_uuid OR user_b = user_uuid)
      AND status = 'active';
    
    -- Clear sensitive profile data but keep user_id for referential integrity
    UPDATE profiles
    SET
        email = 'deleted@sparq.example',
        full_name = 'Deleted User',
        avatar_url = NULL,
        attachment_style = NULL,
        love_languages = '{}',
        cultural_notes = NULL,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Mark subscription as cancelled
    UPDATE subscriptions
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = user_uuid;
    
    RETURN TRUE;
END;
$$;

-- Function to log events (analytics)
CREATE OR REPLACE FUNCTION log_event(
    user_uuid UUID,
    event_name TEXT,
    event_props JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO event_log (user_id, name, props)
    VALUES (user_uuid, event_name, event_props);
END;
$$;

-- Function to get user's subscription tier
CREATE OR REPLACE FUNCTION get_user_tier(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COALESCE(s.tier, 'free')
    FROM profiles p
    LEFT JOIN subscriptions s ON s.user_id = p.user_id AND s.status = 'active'
    WHERE p.user_id = user_uuid;
$$;

-- Function to check if user has premium features
CREATE OR REPLACE FUNCTION has_premium_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM subscriptions
        WHERE user_id = user_uuid
          AND tier IN ('premium', 'ultimate')
          AND status = 'active'
          AND (renews_at IS NULL OR renews_at > NOW())
    );
$$;