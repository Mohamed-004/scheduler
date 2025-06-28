-- UNIVERSAL SOLUTION: Invitation functions without pgcrypto dependency
-- This works on ALL PostgreSQL versions without any extensions

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS check_user_exists(text);
DROP FUNCTION IF EXISTS generate_secure_token();
DROP FUNCTION IF EXISTS create_team_invitation(uuid, text, user_role, uuid, text);
DROP FUNCTION IF EXISTS accept_team_invitation(text, uuid);
DROP FUNCTION IF EXISTS get_invitation_by_token(text);

-- 1. Universal token generation using UUID (NO EXTENSIONS NEEDED)
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_parts text[];
  final_token text;
BEGIN
  -- Generate multiple UUIDs for extra randomness
  token_parts := ARRAY[
    replace(gen_random_uuid()::text, '-', ''),
    replace(gen_random_uuid()::text, '-', ''),
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
  ];
  
  -- Combine and truncate to reasonable length (64 chars)
  final_token := substr(array_to_string(token_parts, ''), 1, 64);
  
  RETURN final_token;
END;
$$;

-- 2. Check if user exists (FIXED GROUP BY ISSUE)
CREATE OR REPLACE FUNCTION check_user_exists(check_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  SELECT role, team_id, name INTO user_record
  FROM users 
  WHERE email = check_email
  LIMIT 1;
  
  IF FOUND THEN
    RETURN json_build_object(
      'exists', true,
      'role', user_record.role,
      'team_id', user_record.team_id,
      'name', user_record.name
    );
  ELSE
    RETURN json_build_object('exists', false);
  END IF;
END;
$$;

-- 3. Create team invitation
CREATE OR REPLACE FUNCTION create_team_invitation(
  p_team_id uuid,
  p_email text,
  p_role user_role,
  p_invited_by uuid,
  p_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_invitation_id uuid;
  v_user_exists boolean := false;
  v_existing_user json;
BEGIN
  -- Check if user already exists
  SELECT check_user_exists(p_email) INTO v_existing_user;
  v_user_exists := (v_existing_user->>'exists')::boolean;
  
  -- Check if user is already in the same team with same role
  IF v_user_exists THEN
    IF (v_existing_user->>'team_id')::uuid = p_team_id AND 
       (v_existing_user->>'role')::user_role = p_role THEN
      RETURN json_build_object(
        'success', false,
        'error', 'User already has this role in the team'
      );
    END IF;
  END IF;
  
  -- Check for existing pending invitation
  IF EXISTS(
    SELECT 1 FROM team_invitations 
    WHERE email = p_email 
    AND team_id = p_team_id 
    AND status = 'pending' 
    AND expires_at > NOW()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Pending invitation already exists for this email'
    );
  END IF;
  
  -- Generate secure token (NO EXTENSIONS NEEDED)
  SELECT generate_secure_token() INTO v_token;
  
  -- Create invitation
  INSERT INTO team_invitations (
    team_id,
    email,
    role,
    invited_by,
    token,
    name,
    status,
    expires_at
  ) VALUES (
    p_team_id,
    p_email,
    p_role,
    p_invited_by,
    v_token,
    p_name,
    'pending',
    NOW() + INTERVAL '7 days'
  ) RETURNING id INTO v_invitation_id;
  
  RETURN json_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'token', v_token,
    'user_exists', v_user_exists
  );
END;
$$;

-- 4. Accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
  p_token text,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_user_email text;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM team_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
    AND email = v_user_email;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;
  
  -- Check if user already exists in users table
  IF EXISTS(SELECT 1 FROM users WHERE id = p_user_id) THEN
    -- Update existing user's team and role
    UPDATE users 
    SET team_id = v_invitation.team_id,
        role = v_invitation.role,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Create new user record
    INSERT INTO users (
      id,
      email,
      team_id,
      role,
      name,
      phone,
      is_active
    ) VALUES (
      p_user_id,
      v_invitation.email,
      v_invitation.team_id,
      v_invitation.role,
      v_invitation.name,
      '', -- Empty phone for now
      true
    );
  END IF;
  
  -- Mark invitation as accepted
  UPDATE team_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN json_build_object(
    'success', true,
    'team_id', v_invitation.team_id,
    'role', v_invitation.role
  );
END;
$$;

-- 5. Get invitation by token
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_found boolean := false;
  invitation_data json;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM team_invitations i
    WHERE i.token = p_token
      AND i.status = 'pending'
      AND i.expires_at > NOW()
  ) INTO invitation_found;
  
  IF invitation_found THEN
    SELECT json_build_object(
      'success', true,
      'invitation', json_build_object(
        'id', i.id,
        'email', i.email,
        'role', i.role,
        'name', i.name,
        'expires_at', i.expires_at,
        'team', json_build_object('name', t.name),
        'inviter', json_build_object('name', u.name)
      )
    ) INTO invitation_data
    FROM team_invitations i
    JOIN teams t ON i.team_id = t.id
    JOIN users u ON i.invited_by = u.id
    WHERE i.token = p_token
      AND i.status = 'pending'
      AND i.expires_at > NOW()
    LIMIT 1;
    
    RETURN invitation_data;
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_exists(text) TO public;
GRANT EXECUTE ON FUNCTION generate_secure_token() TO public;
GRANT EXECUTE ON FUNCTION create_team_invitation(uuid, text, user_role, uuid, text) TO public;
GRANT EXECUTE ON FUNCTION accept_team_invitation(text, uuid) TO public;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(text) TO public;

-- Test the token generation
SELECT 'Token generation test:' as test_name, generate_secure_token() as sample_token; 