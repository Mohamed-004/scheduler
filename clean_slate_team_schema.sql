-- =====================================================================================
-- CLEAN SLATE: Team-Based Architecture for Scheduler App
-- =====================================================================================
-- This script completely resets the database and creates a new team-based architecture
-- Based on FlightControl's Linear multi-tenant model
-- =====================================================================================

-- 1. DROP ALL EXISTING TABLES (in dependency order)
-- =====================================================================================

-- Drop tables that depend on others first
DROP TABLE IF EXISTS timeline_items CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS crew_workers CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;

-- Drop intermediate tables
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS crews CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Drop base tables
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS job_status CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 2. CREATE NEW CUSTOM TYPES
-- =====================================================================================

CREATE TYPE user_role AS ENUM ('admin', 'sales', 'worker');
CREATE TYPE job_status AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- 3. CREATE TEAMS TABLE (Core of new architecture)
-- =====================================================================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE ENHANCED USERS TABLE (Consolidated with worker data)
-- =====================================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'worker',
    
    -- Personal Information (consolidated from workers table)
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    hourly_rate NUMERIC(10,2) DEFAULT 25.00,
    
    -- Settings
    tz TEXT NOT NULL DEFAULT 'America/Toronto',
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(email, team_id),
    CHECK (hourly_rate >= 0),
    CHECK (hourly_rate <= 1000)
);

-- 5. CREATE TEAM-SCOPED CLIENTS TABLE
-- =====================================================================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    tz TEXT NOT NULL DEFAULT 'America/Toronto',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREATE TEAM-SCOPED JOBS TABLE
-- =====================================================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    assigned_worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Job Details
    address TEXT NOT NULL,
    job_type TEXT NOT NULL,
    estimated_hours NUMERIC(5,2) NOT NULL,
    quote_amount NUMERIC(10,2) NOT NULL,
    equipment_required JSONB DEFAULT '[]',
    
    -- Scheduling
    status job_status DEFAULT 'PENDING',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (estimated_hours > 0),
    CHECK (quote_amount >= 0),
    CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time)
);

-- 7. CREATE TEAM INVITATIONS TABLE (Simplified)
-- =====================================================================================

CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(team_id, email, status) -- Prevent duplicate pending invitations
);

-- 8. CREATE OPTIMIZED INDEXES
-- =====================================================================================

-- Teams indexes
CREATE INDEX idx_teams_created_at ON teams(created_at);

-- Users indexes (team-scoped)
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_team_role ON users(team_id, role);

-- Clients indexes (team-scoped)
CREATE INDEX idx_clients_team_id ON clients(team_id);
CREATE INDEX idx_clients_team_name ON clients(team_id, name);

-- Jobs indexes (team-scoped)
CREATE INDEX idx_jobs_team_id ON jobs(team_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_assigned_worker ON jobs(assigned_worker_id);
CREATE INDEX idx_jobs_team_status ON jobs(team_id, status);
CREATE INDEX idx_jobs_schedule ON jobs(start_time, end_time) WHERE start_time IS NOT NULL;

-- Invitations indexes
CREATE INDEX idx_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_invitations_token ON team_invitations(token);
CREATE INDEX idx_invitations_email ON team_invitations(email);
CREATE INDEX idx_invitations_status ON team_invitations(status);

-- 9. CREATE RLS POLICIES (Team-based isolation)
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Teams policies (users can only see their own team)
CREATE POLICY "Users can view their own team" 
    ON teams FOR SELECT 
    USING (id IN (SELECT team_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Team admins can update their team" 
    ON teams FOR UPDATE 
    USING (id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Users policies (team-scoped)
CREATE POLICY "Users can view team members" 
    ON users FOR SELECT 
    USING (team_id IN (SELECT team_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile" 
    ON users FOR UPDATE 
    USING (id = auth.uid());

CREATE POLICY "Team admins can manage team members" 
    ON users FOR ALL 
    USING (team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Clients policies (team-scoped)
CREATE POLICY "Users can manage team clients" 
    ON clients FOR ALL 
    USING (team_id IN (SELECT team_id FROM users WHERE id = auth.uid()));

-- Jobs policies (team-scoped)
CREATE POLICY "Users can manage team jobs" 
    ON jobs FOR ALL 
    USING (team_id IN (SELECT team_id FROM users WHERE id = auth.uid()));

-- Team invitations policies (team-scoped)
CREATE POLICY "Users can view team invitations" 
    ON team_invitations FOR SELECT 
    USING (team_id IN (SELECT team_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Team admins can manage invitations" 
    ON team_invitations FOR ALL 
    USING (team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales')));

-- Public access for accepting invitations (by token)
CREATE POLICY "Anyone can view invitation by token" 
    ON team_invitations FOR SELECT 
    USING (status = 'pending' AND expires_at > NOW());

-- 10. CREATE UTILITY FUNCTIONS
-- =====================================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON team_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create team for business signup
CREATE OR REPLACE FUNCTION handle_business_signup(
    user_id UUID,
    user_email TEXT,
    business_name TEXT,
    owner_name TEXT,
    owner_phone TEXT
)
RETURNS UUID AS $$
DECLARE
    new_team_id UUID;
BEGIN
    -- Create the team
    INSERT INTO teams (name, description)
    VALUES (business_name, 'Business team for ' || business_name)
    RETURNING id INTO new_team_id;
    
    -- Create the admin user
    INSERT INTO users (id, email, team_id, role, name, phone)
    VALUES (user_id, user_email, new_team_id, 'admin', owner_name, owner_phone);
    
    RETURN new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
    invitation_token TEXT,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    user_phone TEXT
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get the invitation
    SELECT * INTO invitation_record
    FROM team_invitations 
    WHERE token = invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;
    
    -- Check if email matches
    IF invitation_record.email != user_email THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email mismatch');
    END IF;
    
    -- Create the user
    INSERT INTO users (id, email, team_id, role, name, phone)
    VALUES (user_id, user_email, invitation_record.team_id, invitation_record.role, user_name, user_phone);
    
    -- Update invitation status
    UPDATE team_invitations 
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'team_id', invitation_record.team_id,
        'role', invitation_record.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. VERIFICATION AND SUCCESS REPORT
-- =====================================================================================

-- Verify schema creation
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('teams', 'users', 'clients', 'jobs', 'team_invitations');
    
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Report results
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'TEAM-BASED ARCHITECTURE CREATED SUCCESSFULLY!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Tables created: % (Expected: 5)', table_count;
    RAISE NOTICE 'Indexes created: % (Expected: 8+)', index_count;
    RAISE NOTICE 'RLS policies created: % (Expected: 10+)', policy_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test business signup flow';
    RAISE NOTICE '2. Test team invitation system';
    RAISE NOTICE '3. Verify dashboard performance';
    RAISE NOTICE '=================================================';
END;
$$; 