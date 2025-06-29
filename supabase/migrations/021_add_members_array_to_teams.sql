-- Migration: Add members array to teams table with automatic synchronization
-- This adds a JSONB array that contains all team members with their details

-- Add members JSONB column to teams table
ALTER TABLE teams 
ADD COLUMN members JSONB DEFAULT '[]'::jsonb;

-- Create index for members column for better performance
CREATE INDEX IF NOT EXISTS idx_teams_members ON teams USING GIN (members);

-- Function to update team members array
CREATE OR REPLACE FUNCTION update_team_members(team_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE teams 
  SET members = (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', u.id,
          'email', u.email,
          'name', u.name,
          'role', u.role,
          'phone', u.phone,
          'hourly_rate', u.hourly_rate,
          'tz', u.tz,
          'is_active', u.is_active,
          'created_at', u.created_at,
          'updated_at', u.updated_at
        ) ORDER BY 
          CASE WHEN u.role = 'admin' THEN 1 ELSE 2 END,
          u.name
      ),
      '[]'::jsonb
    )
    FROM users u 
    WHERE u.team_id = team_uuid
  ),
  updated_at = NOW()
  WHERE id = team_uuid;
END;
$$;

-- Function to refresh all team members
CREATE OR REPLACE FUNCTION refresh_all_team_members()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_record RECORD;
BEGIN
  FOR team_record IN SELECT id FROM teams LOOP
    PERFORM update_team_members(team_record.id);
  END LOOP;
END;
$$;

-- Trigger function for user changes
CREATE OR REPLACE FUNCTION trigger_update_team_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    PERFORM update_team_members(NEW.team_id);
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- If team_id changed, update both old and new teams
    IF OLD.team_id != NEW.team_id THEN
      PERFORM update_team_members(OLD.team_id);
      PERFORM update_team_members(NEW.team_id);
    ELSE
      -- Just update the current team
      PERFORM update_team_members(NEW.team_id);
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM update_team_members(OLD.team_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers to keep members array synchronized
DROP TRIGGER IF EXISTS trigger_users_team_members ON users;
CREATE TRIGGER trigger_users_team_members
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_team_members();

-- Helper function to get team with members (always fresh)
CREATE OR REPLACE FUNCTION get_team_with_members(team_uuid uuid)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  members jsonb,
  member_count integer,
  admin_count integer,
  worker_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure members array is up to date
  PERFORM update_team_members(team_uuid);
  
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.members,
    jsonb_array_length(t.members) as member_count,
    (
      SELECT COUNT(*)::integer 
      FROM jsonb_array_elements(t.members) AS member 
      WHERE member->>'role' = 'admin'
    ) as admin_count,
    (
      SELECT COUNT(*)::integer 
      FROM jsonb_array_elements(t.members) AS member 
      WHERE member->>'role' = 'worker'
    ) as worker_count,
    t.created_at,
    t.updated_at
  FROM teams t
  WHERE t.id = team_uuid;
END;
$$;

-- Helper function to get all teams with their members
CREATE OR REPLACE FUNCTION get_all_teams_with_members()
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  members jsonb,
  member_count integer,
  admin_count integer,
  worker_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh all team members first
  PERFORM refresh_all_team_members();
  
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.members,
    jsonb_array_length(t.members) as member_count,
    (
      SELECT COUNT(*)::integer 
      FROM jsonb_array_elements(t.members) AS member 
      WHERE member->>'role' = 'admin'
    ) as admin_count,
    (
      SELECT COUNT(*)::integer 
      FROM jsonb_array_elements(t.members) AS member 
      WHERE member->>'role' = 'worker'
    ) as worker_count,
    t.created_at,
    t.updated_at
  FROM teams t;
END;
$$;

-- Function to get team members by role
CREATE OR REPLACE FUNCTION get_team_members_by_role(team_uuid uuid, member_role text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Ensure members array is up to date
  PERFORM update_team_members(team_uuid);
  
  SELECT COALESCE(
    jsonb_agg(member),
    '[]'::jsonb
  ) INTO result
  FROM (
    SELECT member
    FROM teams t,
    jsonb_array_elements(t.members) AS member
    WHERE t.id = team_uuid
    AND member->>'role' = member_role
    ORDER BY member->>'name'
  ) filtered_members;
  
  RETURN result;
END;
$$;

-- Function to add member to team (alternative to direct user insert)
CREATE OR REPLACE FUNCTION add_member_to_team(
  team_uuid uuid,
  member_email text,
  member_name text,
  member_role text DEFAULT 'worker',
  member_phone text DEFAULT '',
  member_hourly_rate numeric DEFAULT 25.00
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- This would typically be handled by your existing user creation process
  -- But this function can be useful for batch operations
  
  INSERT INTO users (email, name, role, phone, hourly_rate, team_id)
  VALUES (member_email, member_name, member_role::user_role, member_phone, member_hourly_rate, team_uuid)
  RETURNING id INTO new_user_id;
  
  -- Return the updated team with members
  RETURN (
    SELECT row_to_json(team_data)
    FROM get_team_with_members(team_uuid) AS team_data
  );
END;
$$;

-- Initialize the members array for existing teams
SELECT refresh_all_team_members();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_team_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_with_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_teams_with_members() TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_members_by_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_member_to_team(uuid, text, text, text, text, numeric) TO authenticated; 