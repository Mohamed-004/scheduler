-- Migration 026: Fix clients table RLS policy for team-based creation
-- Issue: Client creation fails because team_id is not set and RLS policy blocks NULL team_id

-- Drop the existing restrictive policy that combines all operations
DROP POLICY IF EXISTS "team_clients_access" ON clients;

-- Create separate policies for each operation to handle client creation properly

-- 1. Allow INSERT if user sets team_id to their own team_id and has admin/sales role
CREATE POLICY "team_clients_insert" ON clients FOR INSERT WITH CHECK (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'sales')
);

-- 2. Allow SELECT for all team members (workers can view clients for job assignments)
CREATE POLICY "team_clients_select" ON clients FOR SELECT USING (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid())
);

-- 3. Allow UPDATE for admin and sales only
CREATE POLICY "team_clients_update" ON clients FOR UPDATE USING (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'sales')
) WITH CHECK (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'sales')
);

-- 4. Allow DELETE for admin and sales only
CREATE POLICY "team_clients_delete" ON clients FOR DELETE USING (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'sales')
);

-- Create helper function to get user's team_id (for frontend use)
CREATE OR REPLACE FUNCTION get_current_user_team_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT team_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_team_id() TO authenticated;

-- Create an index on clients.team_id for better performance
CREATE INDEX IF NOT EXISTS idx_clients_team_id ON clients(team_id);