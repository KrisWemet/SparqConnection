-- Migration: Add secure token support to connection invites
-- This adds secure token fields while maintaining backward compatibility with 6-digit codes

-- Add secure token columns to connection_invites
ALTER TABLE connection_invites 
ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Add index for efficient token hash lookups
CREATE INDEX IF NOT EXISTS idx_connection_invites_token_hash 
ON connection_invites(token_hash) 
WHERE token_hash IS NOT NULL;

-- Add index for email tracking queries
CREATE INDEX IF NOT EXISTS idx_connection_invites_email_sent 
ON connection_invites(email_sent_at) 
WHERE email_sent_at IS NOT NULL;

-- Update the invite code constraint to allow NULL for token-based invites
-- First, let's drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'connection_invites_invite_code_check' 
             AND table_name = 'connection_invites') THEN
    ALTER TABLE connection_invites DROP CONSTRAINT connection_invites_invite_code_check;
  END IF;
END $$;

-- Add a new constraint that allows either invite_code OR token_hash to be present
ALTER TABLE connection_invites 
ADD CONSTRAINT connection_invites_invite_method_check 
CHECK (
  (invite_code IS NOT NULL AND LENGTH(invite_code) = 6) 
  OR 
  (token_hash IS NOT NULL AND LENGTH(token_hash) = 64)
);

-- Create a function to accept invites by token
CREATE OR REPLACE FUNCTION accept_invite_by_token(
  token_input TEXT,
  accepter_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_hash_input TEXT;
  invite_record RECORD;
  pair_id UUID;
  result JSON;
BEGIN
  -- Hash the input token for lookup
  token_hash_input := encode(digest(token_input, 'sha256'), 'hex');
  
  -- Find the invite by token hash
  SELECT *
  INTO invite_record
  FROM connection_invites 
  WHERE token_hash = token_hash_input
    AND status = 'pending'
    AND expires_at > NOW()
    AND invitee_email = (
      SELECT email FROM profiles 
      WHERE user_id = accepter_user_id
    );
  
  -- Check if invite exists and is valid
  IF invite_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation token'
    );
  END IF;
  
  -- Check if users are already connected
  IF EXISTS (
    SELECT 1 FROM pairs 
    WHERE ((user_a = invite_record.inviter_id AND user_b = accepter_user_id) 
           OR (user_a = accepter_user_id AND user_b = invite_record.inviter_id))
      AND status = 'active'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Users are already connected'
    );
  END IF;
  
  -- Create the pair connection
  INSERT INTO pairs (user_a, user_b, status, created_at)
  VALUES (invite_record.inviter_id, accepter_user_id, 'active', NOW())
  RETURNING id INTO pair_id;
  
  -- Update invite status
  UPDATE connection_invites
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = invite_record.id;
  
  -- Return success with pair details
  RETURN json_build_object(
    'success', true,
    'pair_id', pair_id,
    'inviter_id', invite_record.inviter_id,
    'message', 'Invitation accepted successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to accept invitation: ' || SQLERRM
    );
END;
$$;

-- Create a function to track email events
CREATE OR REPLACE FUNCTION track_email_event(
  invite_id_input UUID,
  event_type TEXT -- 'opened', 'clicked'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE event_type
    WHEN 'opened' THEN
      UPDATE connection_invites 
      SET email_opened_at = NOW(),
          updated_at = NOW()
      WHERE id = invite_id_input 
        AND email_opened_at IS NULL;
        
    WHEN 'clicked' THEN
      UPDATE connection_invites 
      SET email_clicked_at = NOW(),
          updated_at = NOW()
      WHERE id = invite_id_input 
        AND email_clicked_at IS NULL;
        
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create a view for invite analytics
CREATE OR REPLACE VIEW invite_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as invite_date,
  COUNT(*) as total_invites,
  COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END) as emails_sent,
  COUNT(CASE WHEN email_opened_at IS NOT NULL THEN 1 END) as emails_opened,
  COUNT(CASE WHEN email_clicked_at IS NOT NULL THEN 1 END) as emails_clicked,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invites,
  ROUND(
    COUNT(CASE WHEN email_opened_at IS NOT NULL THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END), 0) * 100, 
    2
  ) as open_rate,
  ROUND(
    COUNT(CASE WHEN email_clicked_at IS NOT NULL THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(CASE WHEN email_sent_at IS NOT NULL THEN 1 END), 0) * 100, 
    2
  ) as click_rate,
  ROUND(
    COUNT(CASE WHEN status = 'accepted' THEN 1 END)::DECIMAL / 
    COUNT(*)::DECIMAL * 100, 
    2
  ) as acceptance_rate
FROM connection_invites
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY invite_date DESC;

-- Grant appropriate permissions
GRANT SELECT ON invite_analytics TO authenticated;

-- Update RLS policies to include token_hash
CREATE POLICY "Users can accept invites by token" 
ON connection_invites FOR SELECT
TO authenticated
USING (
  invitee_email = (
    SELECT email FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
  AND status = 'pending' 
  AND expires_at > NOW()
  AND (invite_code IS NOT NULL OR token_hash IS NOT NULL)
);

-- Add comment explaining the migration
COMMENT ON COLUMN connection_invites.token_hash IS 'SHA-256 hash of secure invite token for URL-based invitations';
COMMENT ON COLUMN connection_invites.email_sent_at IS 'Timestamp when invitation email was sent';
COMMENT ON COLUMN connection_invites.email_opened_at IS 'Timestamp when invitation email was first opened';
COMMENT ON COLUMN connection_invites.email_clicked_at IS 'Timestamp when invitation email link was first clicked';
COMMENT ON FUNCTION accept_invite_by_token IS 'Accept a connection invite using a secure token instead of 6-digit code';
COMMENT ON FUNCTION track_email_event IS 'Track email engagement events for invitation analytics';