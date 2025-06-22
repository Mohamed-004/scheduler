-- Migration to recreate missing invitation functions
-- The enum is already correct, we just need to recreate the functions

-- Recreate the functions with the correct enum type
CREATE OR REPLACE FUNCTION create_invitation(
    p_email TEXT,
    p_role user_role,
    p_invited_by UUID,
    p_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    invitation_id UUID;
    invitation_token TEXT;
    existing_user_id UUID;
    current_role user_role;
    invitation_type_val TEXT;
BEGIN
    -- Check if user already exists
    SELECT id, role INTO existing_user_id, current_role 
    FROM public.users 
    WHERE email = p_email;
    
    IF existing_user_id IS NOT NULL THEN
        -- User exists - this will be a role change invitation
        IF current_role = p_role THEN
            RETURN jsonb_build_object('success', false, 'error', 'User already has the requested role');
        END IF;
        invitation_type_val := 'role_change';
    ELSE
        -- New user
        invitation_type_val := 'new_user';
    END IF;
    
    -- Check if there's already a pending invitation
    IF EXISTS (SELECT 1 FROM public.invitations WHERE email = p_email AND status = 'pending') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pending invitation already exists for this email');
    END IF;
    
    -- Generate secure token
    invitation_token := generate_invitation_token();
    
    -- Create invitation
    INSERT INTO public.invitations (email, role, invited_by, token, name, invitation_type)
    VALUES (p_email, p_role, p_invited_by, invitation_token, p_name, invitation_type_val)
    RETURNING id INTO invitation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'invitation_id', invitation_id,
        'token', invitation_token,
        'email', p_email,
        'role', p_role,
        'invitation_type', invitation_type_val,
        'existing_user', existing_user_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT, user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    existing_user_id UUID;
    result JSONB;
BEGIN
    -- Get the invitation
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if this is a role change invitation
    IF invitation_record.invitation_type = 'role_change' THEN
        -- For role changes, find the existing user by email
        SELECT id INTO existing_user_id 
        FROM public.users 
        WHERE email = invitation_record.email;
        
        IF existing_user_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'User not found for role change invitation');
        END IF;
        
        -- Update existing user's role
        UPDATE public.users 
        SET role = invitation_record.role, updated_at = NOW()
        WHERE id = existing_user_id;
        
        -- Mark invitation as accepted
        UPDATE public.invitations 
        SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
        WHERE id = invitation_record.id;
        
        -- Create worker record if new role is worker
        IF invitation_record.role = 'worker' THEN
            INSERT INTO public.workers (user_id, name, phone, tz)
            VALUES (existing_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
        
        RETURN jsonb_build_object(
            'success', true, 
            'role', invitation_record.role,
            'name', invitation_record.name,
            'email', invitation_record.email,
            'invitation_type', 'role_change',
            'user_id', existing_user_id
        );
    ELSE
        -- For new users, user_id must be provided
        IF user_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'User ID required for new user invitation');
        END IF;
        
        -- Create or update user profile with correct role
        INSERT INTO public.users (id, email, role, tz)
        VALUES (user_id, invitation_record.email, invitation_record.role, 'America/Toronto')
        ON CONFLICT (id) DO UPDATE SET
            role = invitation_record.role,
            email = invitation_record.email,
            updated_at = NOW();
        
        -- Mark invitation as accepted
        UPDATE public.invitations 
        SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
        WHERE id = invitation_record.id;
        
        -- Create worker record if role is worker
        IF invitation_record.role = 'worker' THEN
            INSERT INTO public.workers (user_id, name, phone, tz)
            VALUES (user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
        
        RETURN jsonb_build_object(
            'success', true, 
            'role', invitation_record.role,
            'name', invitation_record.name,
            'email', invitation_record.email,
            'invitation_type', 'new_user',
            'user_id', user_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the recreated functions
GRANT EXECUTE ON FUNCTION create_invitation(TEXT, user_role, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated; 