-- Create missing database functions for business signup
-- Run this in your Supabase Dashboard -> SQL Editor

-- Function to auto-create team for business signup
CREATE OR REPLACE FUNCTION handle_business_signup(
    user_id UUID,
    user_email TEXT,
    business_name TEXT,
    owner_name TEXT,
    owner_phone TEXT
)
RETURNS UUID AS $$
DECLARE
    new_team_id UUID;
BEGIN
    -- Create the team
    INSERT INTO teams (name, description)
    VALUES (business_name, 'Business team for ' || business_name)
    RETURNING id INTO new_team_id;
    
    -- Create the admin user
    INSERT INTO users (id, email, team_id, role, name, phone)
    VALUES (user_id, user_email, new_team_id, 'admin', owner_name, owner_phone);
    
    RETURN new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
    invitation_token TEXT,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    user_phone TEXT
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get the invitation
    SELECT * INTO invitation_record
    FROM team_invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if email matches
    IF invitation_record.email != user_email THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email mismatch');
    END IF;
    
    -- Create the user
    INSERT INTO users (id, email, team_id, role, name, phone)
    VALUES (user_id, user_email, invitation_record.team_id, invitation_record.role, user_name, user_phone);
    
    -- Update invitation status
    UPDATE team_invitations 
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'team_id', invitation_record.team_id,
        'role', invitation_record.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the functions exist
SELECT 
    routine_name, 
    routine_type, 
    data_type,
    routine_definition IS NOT NULL as has_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_business_signup', 'accept_team_invitation')
ORDER BY routine_name; 