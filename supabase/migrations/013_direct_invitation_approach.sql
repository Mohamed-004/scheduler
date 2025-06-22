-- Direct invitation approach - bypass RPC functions
-- This migration creates a simpler approach using direct table operations

-- First, ensure the invitations table has the right structure
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS invitation_type TEXT DEFAULT 'new_user' CHECK (invitation_type IN ('new_user', 'role_change'));

-- Update any existing invitations that should be role_change
UPDATE public.invitations 
SET invitation_type = 'role_change'
WHERE invitation_type = 'new_user' 
AND email IN (SELECT email FROM public.users)
AND status = 'pending';

-- Drop all existing RLS policies on invitations
DROP POLICY IF EXISTS "Admin and sales can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can read invitations" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users can manage invitations" ON public.invitations;

-- Create simple, permissive RLS policies for invitations
CREATE POLICY "Allow all operations for authenticated users" ON public.invitations
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create a view for easy invitation management
CREATE OR REPLACE VIEW invitation_with_user_info AS
SELECT 
    i.*,
    u.id as existing_user_id,
    u.role as current_user_role,
    inviter.email as inviter_email
FROM public.invitations i
LEFT JOIN public.users u ON i.email = u.email
LEFT JOIN public.users inviter ON i.invited_by = inviter.id;

-- Grant access to the view
GRANT SELECT ON invitation_with_user_info TO authenticated;

-- Create a simple function to generate tokens (this should work)
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_secure_token() TO authenticated;

-- Create a simple function to check if email exists
CREATE OR REPLACE FUNCTION public.check_user_exists(check_email TEXT)
RETURNS JSONB AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT id, email, role INTO user_record
    FROM public.users 
    WHERE email = check_email;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'exists', true,
            'user_id', user_record.id,
            'email', user_record.email,
            'role', user_record.role
        );
    ELSE
        RETURN jsonb_build_object(
            'exists', false,
            'user_id', null,
            'email', check_email,
            'role', null
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO authenticated;

-- Create a function to validate invitation acceptance
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
    
    -- Create worker record if needed
    IF invitation_record.role = 'worker' THEN
        INSERT INTO public.workers (user_id, name, phone, tz)
        VALUES (target_user_id, COALESCE(invitation_record.name, invitation_record.email), '', 'America/Toronto')
        ON CONFLICT (user_id) DO NOTHING;
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

GRANT EXECUTE ON FUNCTION public.process_invitation_acceptance(TEXT, UUID) TO authenticated; 