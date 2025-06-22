-- Comprehensive fix for invitation system
-- This migration addresses all identified issues:
-- 1. Column ambiguity in accept_invitation function
-- 2. Permission issues with RPC functions
-- 3. Invitation type detection problems
-- 4. Complete debugging system

-- First, fix the invitation type for existing invitations
UPDATE public.invitations 
SET invitation_type = 'role_change'
WHERE invitation_type = 'new_user' 
AND email IN (
    SELECT email FROM public.users
)
AND status = 'pending';

-- Drop and recreate the accept_invitation function with proper variable naming
DROP FUNCTION IF EXISTS accept_invitation(TEXT, UUID);

CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT, user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    existing_user_id UUID;
    target_user_id UUID; -- Use different variable name to avoid column ambiguity
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
        
        -- Create worker record if new role is worker (using explicit variable)
        IF invitation_record.role = 'worker' THEN
            INSERT INTO public.workers (user_id, name, phone, tz)
            VALUES (target_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
            ON CONFLICT (user_id) DO NOTHING;
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
        
        -- Create worker record if role is worker (using explicit variable)
        IF invitation_record.role = 'worker' THEN
            INSERT INTO public.workers (user_id, name, phone, tz)
            VALUES (target_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
            ON CONFLICT (user_id) DO NOTHING;
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

-- Recreate the create_invitation function to ensure it's working properly
DROP FUNCTION IF EXISTS create_invitation(TEXT, user_role, UUID, TEXT);

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
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to create invitation: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple test function to verify the fix
CREATE OR REPLACE FUNCTION test_invitation_acceptance(invitation_token TEXT, test_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Test the accept_invitation function
    SELECT accept_invitation(invitation_token, test_user_id) INTO result;
    
    RETURN jsonb_build_object(
        'test_result', result,
        'test_timestamp', NOW(),
        'test_user_id', test_user_id,
        'invitation_token', invitation_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant all necessary permissions
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invitation(TEXT, user_role, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION test_invitation_acceptance(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_token() TO authenticated;

-- Grant table permissions
GRANT ALL ON public.invitations TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.workers TO authenticated;

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Authenticated users can read invitations" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can manage invitations" ON public.invitations;

CREATE POLICY "Authenticated users can manage invitations" ON public.invitations 
FOR ALL TO authenticated USING (true);

-- Create a function to reset and test the invitation system
CREATE OR REPLACE FUNCTION reset_invitation_for_testing(email_to_reset TEXT)
RETURNS JSONB AS $$
BEGIN
    -- Cancel any existing invitations for this email
    UPDATE public.invitations 
    SET status = 'cancelled', updated_at = NOW()
    WHERE email = email_to_reset AND status = 'pending';
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Invitations reset for email: ' || email_to_reset,
        'reset_count', (SELECT COUNT(*) FROM public.invitations WHERE email = email_to_reset AND status = 'cancelled')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_invitation_for_testing(TEXT) TO authenticated; 