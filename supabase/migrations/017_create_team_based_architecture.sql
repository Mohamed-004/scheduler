-- Migration 017: Create team-based multi-tenant architecture
-- Based on FlightControl Linear model for optimal cost/performance

-- Step 1: Create teams table
CREATE TABLE teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add team_id to users table (preparing for migration)
ALTER TABLE users ADD COLUMN team_id UUID REFERENCES teams(id);
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN hourly_rate DECIMAL(8,2);
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Step 3: Add team_id to clients table
ALTER TABLE clients ADD COLUMN team_id UUID REFERENCES teams(id);

-- Step 4: Modify jobs table for team-based structure
ALTER TABLE jobs ADD COLUMN team_id UUID REFERENCES teams(id);
ALTER TABLE jobs ADD COLUMN assigned_worker_id UUID REFERENCES users(id);
ALTER TABLE jobs RENAME COLUMN job_type TO title;
ALTER TABLE jobs ADD COLUMN description TEXT;
ALTER TABLE jobs ADD COLUMN scheduled_start TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN scheduled_end TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN actual_start TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN actual_end TIMESTAMPTZ;

-- Step 5: Create simplified team invitations table
CREATE TABLE team_invitations (
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
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_clients_team_id ON clients(team_id);
CREATE INDEX idx_jobs_team_id ON jobs(team_id);
CREATE INDEX idx_jobs_assigned_worker ON jobs(assigned_worker_id);
CREATE INDEX idx_jobs_status_team ON jobs(team_id, status);
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);

-- Step 7: Create updated_at trigger for teams table
CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY; 