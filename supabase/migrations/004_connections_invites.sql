-- 004_connections_invites.sql: Connection invites system for Sparq Connection MVP

-- Connection invites table for partner invitation flow
CREATE TABLE connection_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    invitee_email TEXT NOT NULL,
    invite_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(invite_code),
    UNIQUE(inviter_id, invitee_email) -- One invite per email per inviter
);

-- Indexes for performance
CREATE INDEX idx_connection_invites_inviter ON connection_invites(inviter_id);
CREATE INDEX idx_connection_invites_code ON connection_invites(invite_code);
CREATE INDEX idx_connection_invites_email ON connection_invites(invitee_email);
CREATE INDEX idx_connection_invites_status ON connection_invites(status);
CREATE INDEX idx_connection_invites_expires ON connection_invites(expires_at);

-- Enable RLS
ALTER TABLE connection_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connection_invites
CREATE POLICY "Users can view invites they sent"
    ON connection_invites FOR SELECT
    USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view invites sent to their email"
    ON connection_invites FOR SELECT
    USING (
        invitee_email = (
            SELECT email FROM profiles p 
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create connection invites"
    ON connection_invites FOR INSERT
    WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update invites they sent"
    ON connection_invites FOR UPDATE
    USING (auth.uid() = inviter_id);

CREATE POLICY "Invited users can update invites sent to them"
    ON connection_invites FOR UPDATE
    USING (
        invitee_email = (
            SELECT email FROM profiles p 
            WHERE p.user_id = auth.uid()
        )
    );

-- Function to generate 6-digit invite codes
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate 6-digit code
        code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- Check if code already exists in active invites
        SELECT COUNT(*) INTO exists_count 
        FROM connection_invites 
        WHERE invite_code = code 
        AND status = 'pending' 
        AND expires_at > NOW();
        
        -- Exit loop if code is unique
        EXIT WHEN exists_count = 0;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites() RETURNS void AS $$
BEGIN
    UPDATE connection_invites 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Helpful view for user connections (combines pairs and invites)
CREATE VIEW user_connections AS
WITH user_pairs AS (
    SELECT 
        p.id,
        p.user_a as user_id,
        p.user_b as partner_id,
        prof.email as partner_email,
        prof.full_name as partner_name,
        p.status,
        p.paired_at as connected_at,
        'active_connection' as connection_type
    FROM pairs p
    JOIN profiles prof ON prof.user_id = p.user_b
    WHERE p.status = 'active'
    
    UNION ALL
    
    SELECT 
        p.id,
        p.user_b as user_id,
        p.user_a as partner_id,
        prof.email as partner_email,
        prof.full_name as partner_name,
        p.status,
        p.paired_at as connected_at,
        'active_connection' as connection_type
    FROM pairs p
    JOIN profiles prof ON prof.user_id = p.user_a
    WHERE p.status = 'active'
),
pending_invites AS (
    SELECT 
        ci.id,
        ci.inviter_id as user_id,
        NULL::UUID as partner_id,
        ci.invitee_email as partner_email,
        NULL::TEXT as partner_name,
        ci.status,
        ci.created_at as connected_at,
        'pending_invite' as connection_type
    FROM connection_invites ci
    WHERE ci.status = 'pending' AND ci.expires_at > NOW()
)
SELECT * FROM user_pairs
UNION ALL
SELECT * FROM pending_invites;

-- Apply updated_at trigger to connection_invites
CREATE TRIGGER update_connection_invites_updated_at 
    BEFORE UPDATE ON connection_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON connection_invites TO authenticated;
GRANT SELECT ON user_connections TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_invites() TO authenticated;