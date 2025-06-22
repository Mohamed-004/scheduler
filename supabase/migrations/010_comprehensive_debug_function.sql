-- Comprehensive debug function to trace invitation acceptance issues
CREATE OR REPLACE FUNCTION debug_accept_invitation_step_by_step(invitation_token TEXT, test_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
    existing_user_id UUID;
    target_user_id UUID;
    debug_steps JSONB[] := '{}';
    step_counter INTEGER := 1;
    result JSONB;
BEGIN
    -- Step 1: Log function call
    debug_steps := array_append(debug_steps, jsonb_build_object(
        'step', step_counter,
        'action', 'Function called',
        'details', jsonb_build_object(
            'invitation_token', invitation_token,
            'test_user_id', test_user_id
        )
    ));
    step_counter := step_counter + 1;
    
    -- Step 2: Get the invitation
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = invitation_token;
    
    IF NOT FOUND THEN
        debug_steps := array_append(debug_steps, jsonb_build_object(
            'step', step_counter,
            'action', 'Invitation lookup',
            'result', 'NOT FOUND',
            'error', 'No invitation found with this token'
        ));
        RETURN jsonb_build_object('debug_steps', debug_steps, 'final_result', 'FAILED - Invitation not found');
    END IF;
    
    debug_steps := array_append(debug_steps, jsonb_build_object(
        'step', step_counter,
        'action', 'Invitation lookup',
        'result', 'FOUND',
        'details', jsonb_build_object(
            'id', invitation_record.id,
            'email', invitation_record.email,
            'role', invitation_record.role,
            'status', invitation_record.status,
            'invitation_type', invitation_record.invitation_type,
            'expires_at', invitation_record.expires_at,
            'is_expired', invitation_record.expires_at <= NOW(),
            'is_pending', invitation_record.status = 'pending'
        )
    ));
    step_counter := step_counter + 1;
    
    -- Step 3: Check if invitation is valid (pending and not expired)
    IF invitation_record.status != 'pending' OR invitation_record.expires_at <= NOW() THEN
        debug_steps := array_append(debug_steps, jsonb_build_object(
            'step', step_counter,
            'action', 'Invitation validation',
            'result', 'INVALID',
            'details', jsonb_build_object(
                'status', invitation_record.status,
                'expires_at', invitation_record.expires_at,
                'current_time', NOW(),
                'is_expired', invitation_record.expires_at <= NOW()
            )
        ));
        RETURN jsonb_build_object('debug_steps', debug_steps, 'final_result', 'FAILED - Invalid or expired invitation');
    END IF;
    
    debug_steps := array_append(debug_steps, jsonb_build_object(
        'step', step_counter,
        'action', 'Invitation validation',
        'result', 'VALID'
    ));
    step_counter := step_counter + 1;
    
    -- Step 4: Check existing user
    SELECT id INTO existing_user_id 
    FROM public.users 
    WHERE email = invitation_record.email;
    
    debug_steps := array_append(debug_steps, jsonb_build_object(
        'step', step_counter,
        'action', 'Check existing user',
        'result', CASE WHEN existing_user_id IS NOT NULL THEN 'USER EXISTS' ELSE 'USER NOT FOUND' END,
        'details', jsonb_build_object(
            'existing_user_id', existing_user_id,
            'invitation_email', invitation_record.email
        )
    ));
    step_counter := step_counter + 1;
    
    -- Step 5: Determine invitation path
    IF invitation_record.invitation_type = 'role_change' THEN
        debug_steps := array_append(debug_steps, jsonb_build_object(
            'step', step_counter,
            'action', 'Invitation path determination',
            'result', 'ROLE CHANGE PATH',
            'details', jsonb_build_object(
                'invitation_type', invitation_record.invitation_type,
                'existing_user_found', existing_user_id IS NOT NULL
            )
        ));
        step_counter := step_counter + 1;
        
        IF existing_user_id IS NULL THEN
            debug_steps := array_append(debug_steps, jsonb_build_object(
                'step', step_counter,
                'action', 'Role change validation',
                'result', 'FAILED',
                'error', 'User not found for role change invitation'
            ));
            RETURN jsonb_build_object('debug_steps', debug_steps, 'final_result', 'FAILED - User not found for role change');
        END IF;
        
        target_user_id := existing_user_id;
        
    ELSE
        debug_steps := array_append(debug_steps, jsonb_build_object(
            'step', step_counter,
            'action', 'Invitation path determination',
            'result', 'NEW USER PATH',
            'details', jsonb_build_object(
                'invitation_type', invitation_record.invitation_type,
                'provided_user_id', test_user_id,
                'user_id_provided', test_user_id IS NOT NULL
            )
        ));
        step_counter := step_counter + 1;
        
        IF test_user_id IS NULL THEN
            debug_steps := array_append(debug_steps, jsonb_build_object(
                'step', step_counter,
                'action', 'New user validation',
                'result', 'FAILED',
                'error', 'User ID required for new user invitation'
            ));
            RETURN jsonb_build_object('debug_steps', debug_steps, 'final_result', 'FAILED - User ID required');
        END IF;
        
        target_user_id := test_user_id;
    END IF;
    
    -- Step 6: Test worker record creation (this is where the error likely occurs)
    debug_steps := array_append(debug_steps, jsonb_build_object(
        'step', step_counter,
        'action', 'Target user ID assignment',
        'result', 'SUCCESS',
        'details', jsonb_build_object(
            'target_user_id', target_user_id,
            'invitation_role', invitation_record.role
        )
    ));
    step_counter := step_counter + 1;
    
    -- Step 7: Test the problematic INSERT statement
    IF invitation_record.role = 'worker' THEN
        debug_steps := array_append(debug_steps, jsonb_build_object(
            'step', step_counter,
            'action', 'Worker record creation test',
            'details', jsonb_build_object(
                'target_user_id', target_user_id,
                'name_value', COALESCE(invitation_record.name, invitation_record.email),
                'phone_value', '',
                'tz_value', 'America/Toronto'
            )
        ));
        step_counter := step_counter + 1;
        
        -- This is the problematic line - let's test it in a controlled way
        BEGIN
            -- Test the INSERT statement that's causing the ambiguity error
            PERFORM 1 FROM public.workers WHERE user_id = target_user_id;
            
            debug_steps := array_append(debug_steps, jsonb_build_object(
                'step', step_counter,
                'action', 'Worker record check',
                'result', 'SUCCESS',
                'details', 'Worker record check completed without error'
            ));
            step_counter := step_counter + 1;
            
        EXCEPTION
            WHEN others THEN
                debug_steps := array_append(debug_steps, jsonb_build_object(
                    'step', step_counter,
                    'action', 'Worker record check',
                    'result', 'ERROR',
                    'error_details', jsonb_build_object(
                        'sqlstate', SQLSTATE,
                        'sqlerrm', SQLERRM,
                        'error_message', 'Error during worker record operations'
                    )
                ));
                step_counter := step_counter + 1;
        END;
    END IF;
    
    RETURN jsonb_build_object(
        'debug_steps', debug_steps,
        'final_result', 'DEBUG COMPLETED',
        'summary', jsonb_build_object(
            'invitation_valid', true,
            'user_exists', existing_user_id IS NOT NULL,
            'invitation_type', invitation_record.invitation_type,
            'target_user_id', target_user_id,
            'should_create_worker', invitation_record.role = 'worker'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION debug_accept_invitation_step_by_step(TEXT, UUID) TO authenticated; 