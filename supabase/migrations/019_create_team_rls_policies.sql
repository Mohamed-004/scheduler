-- Migration 019: Create simplified RLS policies for team-based architecture
-- Based on FlightControl multi-tenant best practices

-- Drop existing complex RLS policies
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Admin and sales can view all users" ON users;
DROP POLICY IF EXISTS "Admin and sales can manage clients" ON clients;
DROP POLICY IF EXISTS "Workers can view own record" ON workers;
DROP POLICY IF EXISTS "Admin and sales can manage workers" ON workers;
DROP POLICY IF EXISTS "Admin and sales can manage crews" ON crews;
DROP POLICY IF EXISTS "Workers can view crews" ON crews;
DROP POLICY IF EXISTS "Admin and sales can manage crew workers" ON crew_workers;
DROP POLICY IF EXISTS "Workers can view their crew memberships" ON crew_workers;
DROP POLICY IF EXISTS "Admin and sales can manage jobs" ON jobs;
DROP POLICY IF EXISTS "Workers can view jobs for their crews" ON jobs;
DROP POLICY IF EXISTS "Admin and sales can manage timeline items" ON timeline_items;
DROP POLICY IF EXISTS "Workers can view and update their timeline items" ON timeline_items;

-- Create simple team-based RLS policies

-- Teams: Users can only access their own team
CREATE POLICY "team_access" ON teams FOR ALL USING (
    owner_id = auth.uid() OR 
    id = (SELECT team_id FROM users WHERE id = auth.uid())
);

-- Users: Team members can see other team members
CREATE POLICY "team_members_access" ON users FOR ALL USING (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid())
);

-- Clients: Team-scoped access
CREATE POLICY "team_clients_access" ON clients FOR ALL USING (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid())
);

-- Jobs: Team-scoped access
CREATE POLICY "team_jobs_access" ON jobs FOR ALL USING (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid())
);

-- Team invitations: Team admins can manage invitations
CREATE POLICY "team_invitations_access" ON team_invitations FOR ALL USING (
    team_id = (SELECT team_id FROM users WHERE id = auth.uid()) AND
    (
        -- Team owner/admin can manage all invitations
        (SELECT role FROM users WHERE id = auth.uid()) IN ('admin') OR
        -- Sales can also manage invitations
        (SELECT role FROM users WHERE id = auth.uid()) IN ('sales') OR
        -- Users can view invitations sent to them
        email = (SELECT email FROM users WHERE id = auth.uid())
    )
);

-- Optional: Keep existing workers table for backward compatibility but with team scope
CREATE POLICY "team_workers_access" ON workers FOR ALL USING (
    user_id IN (
        SELECT id FROM users 
        WHERE team_id = (SELECT team_id FROM users WHERE id = auth.uid())
    )
);

-- Optional: Keep crews with team scope (for gradual migration)
CREATE POLICY "team_crews_access" ON crews FOR ALL USING (
    id IN (
        SELECT DISTINCT cw.crew_id 
        FROM crew_workers cw
        JOIN workers w ON w.id = cw.worker_id
        JOIN users u ON u.id = w.user_id
        WHERE u.team_id = (SELECT team_id FROM users WHERE id = auth.uid())
    )
);

-- Timeline items: Team-scoped access
CREATE POLICY "team_timeline_access" ON timeline_items FOR ALL USING (
    job_id IN (
        SELECT id FROM jobs 
        WHERE team_id = (SELECT team_id FROM users WHERE id = auth.uid())
    )
);

-- Invitations: Keep existing for gradual migration
CREATE POLICY "team_legacy_invitations_access" ON invitations FOR ALL USING (
    invited_by IN (
        SELECT id FROM users 
        WHERE team_id = (SELECT team_id FROM users WHERE id = auth.uid())
    ) OR
    email = (SELECT email FROM users WHERE id = auth.uid())
);

-- Create helper function for team access
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT team_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON teams TO authenticated;
GRANT ALL ON team_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_team_id() TO authenticated; 