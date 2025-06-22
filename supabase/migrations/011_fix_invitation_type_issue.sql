-- Fix invitation type issue where existing users have 'new_user' invitations
-- This should be 'role_change' invitations

-- Update existing invitations where user exists but invitation_type is 'new_user'
UPDATE public.invitations 
SET invitation_type = 'role_change'
WHERE invitation_type = 'new_user' 
AND email IN (
    SELECT email FROM public.users
)
AND status = 'pending';

-- Create a function to diagnose invitation issues
CREATE OR REPLACE FUNCTION diagnose_invitation_issues()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    wrong_type_count INTEGER;
    pending_invitations JSONB[];
    inv_record RECORD;
BEGIN
    -- Count invitations with wrong type
    SELECT COUNT(*) INTO wrong_type_count
    FROM public.invitations i
    JOIN public.users u ON i.email = u.email
    WHERE i.invitation_type = 'new_user' AND i.status = 'pending';
    
    -- Get details of all pending invitations
    pending_invitations := '{}';
    FOR inv_record IN 
        SELECT 
            i.id,
            i.email,
            i.role,
            i.invitation_type,
            i.status,
            CASE WHEN u.id IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END as user_status,
            u.role as current_role,
            CASE 
                WHEN u.id IS NOT NULL AND i.invitation_type = 'new_user' THEN 'SHOULD_BE_ROLE_CHANGE'
                WHEN u.id IS NULL AND i.invitation_type = 'role_change' THEN 'SHOULD_BE_NEW_USER'
                ELSE 'CORRECT'
            END as type_correctness
        FROM public.invitations i
        LEFT JOIN public.users u ON i.email = u.email
        WHERE i.status = 'pending'
        ORDER BY i.created_at DESC
    LOOP
        pending_invitations := array_append(pending_invitations, jsonb_build_object(
            'id', inv_record.id,
            'email', inv_record.email,
            'invited_role', inv_record.role,
            'current_role', inv_record.current_role,
            'invitation_type', inv_record.invitation_type,
            'user_status', inv_record.user_status,
            'type_correctness', inv_record.type_correctness
        ));
    END LOOP;
    
    RETURN jsonb_build_object(
        'wrong_type_count', wrong_type_count,
        'pending_invitations', pending_invitations,
        'total_pending', array_length(pending_invitations, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION diagnose_invitation_issues() TO authenticated; 