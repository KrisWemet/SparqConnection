-- OneSignal notifications and user preferences
-- Migration: 006_onesignal_notifications.sql

-- Add OneSignal player ID and notification preferences to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"ritual_reminders": true, "partner_activity": true, "play_invites": true, "milestone_celebrations": true}';

-- Create notification log table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'ritual_reminder',
    'partner_completed_ritual', 
    'partner_note_added',
    'play_invite',
    'play_turn',
    'connection_milestone',
    'streak_celebration'
  )),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered', 'clicked')),
  data JSONB DEFAULT '{}',
  onesignal_id TEXT, -- Store OneSignal notification ID for tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON notification_log(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sender ON notification_log(sender_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal ON profiles(onesignal_player_id);

-- RLS policies for notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users can only see notifications they sent or received
CREATE POLICY "Users can view their own notification logs" ON notification_log
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Only the system can insert notifications (via service role)
CREATE POLICY "System can insert notification logs" ON notification_log
  FOR INSERT WITH CHECK (true);

-- Users can update notification preferences on their own profile
CREATE POLICY "Users can update their notification preferences" ON profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update notification preferences
CREATE OR REPLACE FUNCTION update_notification_preferences(
  user_id UUID,
  preferences JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET 
    notification_preferences = preferences,
    updated_at = NOW()
  WHERE profiles.user_id = update_notification_preferences.user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to store OneSignal player ID
CREATE OR REPLACE FUNCTION store_onesignal_player_id(
  user_id UUID,
  player_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET 
    onesignal_player_id = player_id,
    updated_at = NOW()
  WHERE profiles.user_id = store_onesignal_player_id.user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to get notification recipients for a user (their partner)
CREATE OR REPLACE FUNCTION get_notification_recipients(sender_user_id UUID)
RETURNS TABLE (
  recipient_id UUID,
  onesignal_player_id TEXT,
  notification_preferences JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.onesignal_player_id,
    p.notification_preferences
  FROM profiles p
  INNER JOIN pairs pr ON (
    (pr.user_a = sender_user_id AND pr.user_b = p.user_id) OR
    (pr.user_b = sender_user_id AND pr.user_a = p.user_id)
  )
  WHERE 
    pr.status = 'active' AND
    p.onesignal_player_id IS NOT NULL;
END;
$$;

-- Add updated_at trigger for notification_log
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_notification_log ON notification_log;
CREATE TRIGGER set_timestamp_notification_log
  BEFORE UPDATE ON notification_log
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();