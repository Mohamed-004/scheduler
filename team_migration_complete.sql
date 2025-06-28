-- ============================================================================
-- COMPLETE TEAM-BASED ARCHITECTURE MIGRATION
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add team_id to users table and additional fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Step 3: Add team_id to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Step 4: Modify jobs table for team-based structure
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES users(id);

-- Check if column exists before renaming (avoid errors)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'job_type') THEN
        ALTER TABLE jobs RENAME COLUMN job_type TO title;
    END IF;
END $$;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ;

-- Step 5: Create simplified team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'sales', 'worker')) NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_clients_team_id ON clients(team_id);
CREATE INDEX IF NOT EXISTS idx_jobs_team_id ON jobs(team_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_worker ON jobs(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_team ON jobs(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);

-- Step 7: Create updated_at trigger for teams table
CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DATA MIGRATION: Migrate existing data to team-based structure
-- ============================================================================

-- Step 9: Create team for the first admin user (team owner)
DO $$
DECLARE
    first_admin_id UUID;
    first_admin_email TEXT;
    new_team_id UUID;
BEGIN
    -- Get the first admin user
    SELECT id, email INTO first_admin_id, first_admin_email
    FROM users 
    WHERE role = 'admin' 
    ORDER BY created_at 
    LIMIT 1;

    IF first_admin_id IS NOT NULL THEN
        -- Create team for the admin
        INSERT INTO teams (name, owner_id)
        VALUES (
            COALESCE(SPLIT_PART(first_admin_email, '@', 1) || ' Team', 'Default Team'),
            first_admin_id
        )
        RETURNING id INTO new_team_id;

        -- Update the admin user with team_id and additional fields
        UPDATE users 
        SET 
            team_id = new_team_id,
            name = COALESCE(email, 'Admin User'),
            is_active = true
        WHERE id = first_admin_id;

        -- Update all other users to belong to the same team
        UPDATE users 
        SET 
            team_id = new_team_id,
            name = COALESCE(
                (SELECT w.name FROM workers w WHERE w.user_id = users.id),
                SPLIT_PART(users.email, '@', 1)
            ),
            phone = COALESCE(
                (SELECT w.phone FROM workers w WHERE w.user_id = users.id),
                ''
            ),
            is_active = true
        WHERE team_id IS NULL;

        -- Update clients to belong to the team
        UPDATE clients 
        SET team_id = new_team_id
        WHERE team_id IS NULL;

        -- Update jobs to belong to the team and assign workers
        UPDATE jobs 
        SET 
            team_id = new_team_id,
            assigned_worker_id = CASE 
                WHEN crew_id IS NOT NULL THEN (
                    SELECT u.id FROM users u 
                    JOIN workers w ON w.user_id = u.id
                    JOIN crew_workers cw ON cw.worker_id = w.id
                    WHERE cw.crew_id = jobs.crew_id
                    LIMIT 1
                )
                ELSE NULL
            END,
            scheduled_start = jobs.start,
            scheduled_end = jobs.finish,
            actual_start = CASE WHEN status = 'IN_PROGRESS' OR status = 'COMPLETED' THEN jobs.start END,
            actual_end = CASE WHEN status = 'COMPLETED' THEN jobs.finish END
        WHERE team_id IS NULL;

        RAISE NOTICE 'Successfully created team "%" with ID: %', 
            COALESCE(SPLIT_PART(first_admin_email, '@', 1) || ' Team', 'Default Team'), 
            new_team_id;
    ELSE
        RAISE NOTICE 'No admin users found. Please create a user with admin role first.';
    END IF;
END $$;

-- Step 10: Make team_id required after migration (only if data exists)
DO $$
BEGIN
    -- Only add constraints if there are users with team_id set
    IF EXISTS (SELECT 1 FROM users WHERE team_id IS NOT NULL) THEN
        ALTER TABLE users ALTER COLUMN team_id SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM clients WHERE team_id IS NOT NULL) THEN
        ALTER TABLE clients ALTER COLUMN team_id SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- RLS POLICIES: Create simplified team-based security policies
-- ============================================================================

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
) IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workers');

-- Optional: Keep crews with team scope (for gradual migration)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crews') THEN
        EXECUTE 'CREATE POLICY "team_crews_access" ON crews FOR ALL USING (
            id IN (
                SELECT DISTINCT cw.crew_id 
                FROM crew_workers cw
                JOIN workers w ON w.id = cw.worker_id
                JOIN users u ON u.id = w.user_id
                WHERE u.team_id = (SELECT team_id FROM users WHERE id = auth.uid())
            )
        )';
    END IF;
END $$;

-- Timeline items: Team-scoped access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timeline_items') THEN
        EXECUTE 'CREATE POLICY "team_timeline_access" ON timeline_items FOR ALL USING (
            job_id IN (
                SELECT id FROM jobs 
                WHERE team_id = (SELECT team_id FROM users WHERE id = auth.uid())
            )
        )';
    END IF;
END $$;

-- Invitations: Keep existing for gradual migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
        EXECUTE 'CREATE POLICY "team_legacy_invitations_access" ON invitations FOR ALL USING (
            invited_by IN (
                SELECT id FROM users 
                WHERE team_id = (SELECT team_id FROM users WHERE id = auth.uid())
            ) OR
            email = (SELECT email FROM users WHERE id = auth.uid())
        )';
    END IF;
END $$;

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

-- ============================================================================
-- VERIFICATION: Check migration success
-- ============================================================================

-- Display migration results
DO $$
DECLARE
    team_count INTEGER;
    user_count INTEGER;
    job_count INTEGER;
    client_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO team_count FROM teams;
    SELECT COUNT(*) INTO user_count FROM users WHERE team_id IS NOT NULL;
    SELECT COUNT(*) INTO job_count FROM jobs WHERE team_id IS NOT NULL;
    SELECT COUNT(*) INTO client_count FROM clients WHERE team_id IS NOT NULL;
    
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Teams created: %', team_count;
    RAISE NOTICE 'Users migrated: %', user_count;
    RAISE NOTICE 'Jobs migrated: %', job_count;
    RAISE NOTICE 'Clients migrated: %', client_count;
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test the application at: http://localhost:3000';
    RAISE NOTICE '2. Sign up as a new business owner';
    RAISE NOTICE '3. Invite team members';
    RAISE NOTICE '4. Create jobs and test functionality';
    RAISE NOTICE '============================================================================';
END $$; 