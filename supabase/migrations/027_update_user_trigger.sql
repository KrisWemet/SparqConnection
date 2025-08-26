-- Update handle_new_user function to create quest progress
-- This runs after user_quest_progress table is created in migration 010

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO profiles (user_id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    
    -- Create default quest progress for new users
    INSERT INTO user_quest_progress (user_id, current_quest_id, current_day)
    VALUES (new.id, 'default-quest', 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN new;
END;
$$;