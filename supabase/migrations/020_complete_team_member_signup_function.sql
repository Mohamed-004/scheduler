-- Create a new function that handles complete team member signup with phone and name
CREATE OR REPLACE FUNCTION complete_team_member_signup(
  p_token text,
  p_user_id uuid,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- Update existing user's team, role, name, and phone
    UPDATE users 
    SET team_id = v_invitation.team_id,
        role = v_invitation.role,
        name = COALESCE(p_name, v_invitation.name, name),
        phone = COALESCE(p_phone, phone),
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Create new user record with all provided data
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
      COALESCE(p_name, v_invitation.name, v_invitation.email),
      COALESCE(p_phone, ''),
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
    'role', v_invitation.role,
    'name', COALESCE(p_name, v_invitation.name),
    'phone', COALESCE(p_phone, '')
  );
END;
$$; 