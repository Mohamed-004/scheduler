-- Migration to fix the column ambiguity issue in accept_invitation function
-- The problem is that PostgreSQL can't distinguish between the function parameter 'user_id' 
-- and the table column 'user_id' in INSERT statements

CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT, user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    existing_user_id UUID;
    target_user_id UUID; -- Use a different variable name to avoid ambiguity
    result JSONB;
    debug_info JSONB;
BEGIN
    -- Debug: Log function call
    RAISE LOG 'accept_invitation called with token: %, user_id: %', invitation_token, user_id;
    
    -- Get the invitation
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE LOG 'Invitation not found or expired for token: %', invitation_token;
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Debug: Log invitation found
    RAISE LOG 'Invitation found: email=%, role=%, type=%', 
        invitation_record.email, invitation_record.role, invitation_record.invitation_type;
    
    -- Check if this is a role change invitation
    IF invitation_record.invitation_type = 'role_change' THEN
        RAISE LOG 'Processing role change invitation';
        
        -- For role changes, find the existing user by email
        SELECT id INTO existing_user_id 
        FROM public.users 
        WHERE email = invitation_record.email;
        
        IF existing_user_id IS NULL THEN
            RAISE LOG 'User not found for role change invitation: %', invitation_record.email;
            RETURN jsonb_build_object('success', false, 'error', 'User not found for role change invitation');
        END IF;
        
        target_user_id := existing_user_id;
        RAISE LOG 'Found existing user for role change: %', target_user_id;
        
        -- Update existing user's role
        UPDATE public.users 
        SET role = invitation_record.role, updated_at = NOW()
        WHERE id = target_user_id;
        
        RAISE LOG 'Updated user role to: %', invitation_record.role;
        
        -- Mark invitation as accepted
        UPDATE public.invitations 
        SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
        WHERE id = invitation_record.id;
        
        RAISE LOG 'Marked invitation as accepted';
        
        -- Create worker record if new role is worker
        IF invitation_record.role = 'worker' THEN
            RAISE LOG 'Creating worker record for user: %', target_user_id;
            INSERT INTO public.workers (user_id, name, phone, tz)
            VALUES (target_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
            ON CONFLICT (user_id) DO NOTHING;
            RAISE LOG 'Worker record created/updated';
        END IF;
        
        RETURN jsonb_build_object(
            'success', true, 
            'role', invitation_record.role,
            'name', invitation_record.name,
            'email', invitation_record.email,
            'invitation_type', 'role_change',
            'user_id', target_user_id
        );
    ELSE
        RAISE LOG 'Processing new user invitation';
        
        -- For new users, user_id must be provided
        IF user_id IS NULL THEN
            RAISE LOG 'User ID required for new user invitation but not provided';
            RETURN jsonb_build_object('success', false, 'error', 'User ID required for new user invitation');
        END IF;
        
        target_user_id := user_id;
        RAISE LOG 'Processing new user with ID: %', target_user_id;
        
        -- Create or update user profile with correct role
        INSERT INTO public.users (id, email, role, tz)
        VALUES (target_user_id, invitation_record.email, invitation_record.role, 'America/Toronto')
        ON CONFLICT (id) DO UPDATE SET
            role = invitation_record.role,
            email = invitation_record.email,
            updated_at = NOW();
        
        RAISE LOG 'Created/updated user profile';
        
        -- Mark invitation as accepted
        UPDATE public.invitations 
        SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
        WHERE id = invitation_record.id;
        
        RAISE LOG 'Marked invitation as accepted';
        
        -- Create worker record if role is worker
        IF invitation_record.role = 'worker' THEN
            RAISE LOG 'Creating worker record for new user: %', target_user_id;
            INSERT INTO public.workers (user_id, name, phone, tz)
            VALUES (target_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
            ON CONFLICT (user_id) DO NOTHING;
            RAISE LOG 'Worker record created for new user';
        END IF;
        
        RETURN jsonb_build_object(
            'success', true, 
            'role', invitation_record.role,
            'name', invitation_record.name,
            'email', invitation_record.email,
            'invitation_type', 'new_user',
            'user_id', target_user_id
        );
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error in accept_invitation: % - %', SQLSTATE, SQLERRM;
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Failed to accept invitation: ' || SQLERRM,
            'sqlstate', SQLSTATE,
            'debug_info', jsonb_build_object(
                'invitation_token', invitation_token,
                'provided_user_id', user_id,
                'invitation_found', invitation_record IS NOT NULL
            )
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated; 