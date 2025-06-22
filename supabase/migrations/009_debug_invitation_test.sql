-- Debug function to test invitation acceptance
CREATE OR REPLACE FUNCTION debug_invitation_info(invitation_token TEXT)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    user_record RECORD;
    result JSONB;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = invitation_token;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'found', false,
            'error', 'Invitation not found'
        );
    END IF;
    
    -- Get user details if exists
    SELECT * INTO user_record
    FROM public.users
    WHERE email = invitation_record.email;
    
    RETURN jsonb_build_object(
        'found', true,
        'invitation', jsonb_build_object(
            'id', invitation_record.id,
            'email', invitation_record.email,
            'role', invitation_record.role,
            'status', invitation_record.status,
            'invitation_type', invitation_record.invitation_type,
            'expires_at', invitation_record.expires_at,
            'created_at', invitation_record.created_at,
            'name', invitation_record.name
        ),
        'user_exists', user_record IS NOT NULL,
        'user_info', CASE 
            WHEN user_record IS NOT NULL THEN jsonb_build_object(
                'id', user_record.id,
                'email', user_record.email,
                'role', user_record.role
            )
            ELSE null
        END,
        'current_time', NOW(),
        'is_expired', invitation_record.expires_at <= NOW(),
        'is_pending', invitation_record.status = 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION debug_invitation_info(TEXT) TO authenticated; 