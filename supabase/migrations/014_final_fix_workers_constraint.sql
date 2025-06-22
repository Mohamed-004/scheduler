-- Final fix: Add missing unique constraint and fix invitation functions
-- The workers table needs a unique constraint on user_id for ON CONFLICT to work

-- Add unique constraint on user_id in workers table
ALTER TABLE public.workers ADD CONSTRAINT workers_user_id_unique UNIQUE (user_id);

-- Update the process_invitation_acceptance function to handle this correctly
CREATE OR REPLACE FUNCTION public.process_invitation_acceptance(
    invitation_token TEXT,
    accepting_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    target_user_id UUID;
    result_data JSONB;
BEGIN
    -- Get the invitation
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Invalid or expired invitation'
        );
    END IF;
    
    -- Determine target user ID based on invitation type
    IF invitation_record.invitation_type = 'role_change' THEN
        -- For role changes, find existing user
        SELECT id INTO target_user_id 
        FROM public.users 
        WHERE email = invitation_record.email;
        
        IF target_user_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'User not found for role change'
            );
        END IF;
    ELSE
        -- For new users, use provided user ID
        IF accepting_user_id IS NULL THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'User ID required for new user invitation'
            );
        END IF;
        target_user_id := accepting_user_id;
    END IF;
    
    -- Update user role
    IF invitation_record.invitation_type = 'role_change' THEN
        UPDATE public.users 
        SET role = invitation_record.role, updated_at = NOW()
        WHERE id = target_user_id;
    ELSE
        INSERT INTO public.users (id, email, role, tz)
        VALUES (target_user_id, invitation_record.email, invitation_record.role, 'America/Toronto')
        ON CONFLICT (id) DO UPDATE SET
            role = invitation_record.role,
            email = invitation_record.email,
            updated_at = NOW();
    END IF;
    
    -- Create worker record if needed (now with proper unique constraint)
    IF invitation_record.role = 'worker' THEN
        INSERT INTO public.workers (user_id, name, phone, tz)
        VALUES (target_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
        ON CONFLICT (user_id) DO UPDATE SET
            name = COALESCE(invitation_record.name, invitation_record.email),
            updated_at = NOW();
    END IF;
    
    -- Mark invitation as accepted
    UPDATE public.invitations 
    SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'role', invitation_record.role,
        'name', invitation_record.name,
        'email', invitation_record.email,
        'invitation_type', invitation_record.invitation_type,
        'user_id', target_user_id
    );
    
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Processing failed: ' || SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the old accept_invitation function for compatibility
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT, user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    existing_user_id UUID;
    target_user_id UUID;
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
        
        target_user_id := existing_user_id;
        
        -- Update existing user's role
        UPDATE public.users 
        SET role = invitation_record.role, updated_at = NOW()
        WHERE id = target_user_id;
        
        -- Mark invitation as accepted
        UPDATE public.invitations 
        SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
        WHERE id = invitation_record.id;
        
        -- Create worker record if new role is worker (now with proper constraint)
        IF invitation_record.role = 'worker' THEN
            INSERT INTO public.workers (user_id, name, phone, tz)
            VALUES (target_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
            ON CONFLICT (user_id) DO UPDATE SET
                name = COALESCE(invitation_record.name, invitation_record.email),
                updated_at = NOW();
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
        -- For new users, user_id must be provided
        IF user_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'User ID required for new user invitation');
        END IF;
        
        target_user_id := user_id;
        
        -- Create or update user profile with correct role
        INSERT INTO public.users (id, email, role, tz)
        VALUES (target_user_id, invitation_record.email, invitation_record.role, 'America/Toronto')
        ON CONFLICT (id) DO UPDATE SET
            role = invitation_record.role,
            email = invitation_record.email,
            updated_at = NOW();
        
        -- Mark invitation as accepted
        UPDATE public.invitations 
        SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
        WHERE id = invitation_record.id;
        
        -- Create worker record if role is worker (now with proper constraint)
        IF invitation_record.role = 'worker' THEN
            INSERT INTO public.workers (user_id, name, phone, tz)
            VALUES (target_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
            ON CONFLICT (user_id) DO UPDATE SET
                name = COALESCE(invitation_record.name, invitation_record.email),
                updated_at = NOW();
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
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Failed to accept invitation: ' || SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.process_invitation_acceptance(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated; 