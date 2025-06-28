-- Fix circular dependency in users table RLS policies
-- The problem: policies check team_id by querying users table, causing infinite recursion

-- Drop all existing RLS policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view team members" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Team admins can manage team members" ON users;

-- Create simplified, non-recursive RLS policies

-- 1. Users can always view their own profile (no team_id check needed)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  TO public
  USING (id = auth.uid());

-- 2. Users can update their own profile (no team_id check needed)  
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  TO public
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. For viewing team members, we'll use a function-based approach to avoid recursion
-- Create a function that safely gets user's team_id without triggering RLS
CREATE OR REPLACE FUNCTION get_user_team_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM users WHERE id = user_id;
$$;

-- 4. Now create team member viewing policy using the function
CREATE POLICY "Users can view team members" ON users
  FOR SELECT
  TO public
  USING (
    team_id = get_user_team_id(auth.uid()) 
    AND id != auth.uid()
  );

-- 5. Team admin management policy using the function
CREATE POLICY "Team admins can manage members" ON users
  FOR ALL
  TO public
  USING (
    team_id = get_user_team_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND team_id = get_user_team_id(auth.uid())
    )
  );

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_team_id(uuid) TO public; 