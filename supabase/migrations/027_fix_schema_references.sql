-- Migration 027: Fix schema references for missing tables
-- Addresses issues with references to non-existent workers and crews tables

-- Since we're using a simplified team-based architecture without separate workers and crews tables,
-- we need to either drop these tables or fix their references

-- Option 1: Drop tables that reference non-existent entities
DROP TABLE IF EXISTS worker_certifications CASCADE;
DROP TABLE IF EXISTS crew_role_capabilities CASCADE;

-- Option 2: Recreate simplified versions that work with our current schema

-- Workers table (simplified) - points to users table
CREATE TABLE workers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    rating DECIMAL(2,1) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
    is_active BOOLEAN DEFAULT TRUE,
    default_schedule JSONB DEFAULT '{}',
    schedule_exceptions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Crews table (simplified)
CREATE TABLE crews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, name)
);

-- Crew workers junction table
CREATE TABLE crew_workers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crew_id, worker_id)
);

-- Recreate the certification tables with correct references
CREATE TABLE worker_certifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    certification_name TEXT NOT NULL,
    proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
    certified_date DATE,
    expiry_date DATE,
    certifying_body TEXT,
    certificate_number TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, certification_name)
);

-- Recreate crew role capabilities
CREATE TABLE crew_role_capabilities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE NOT NULL,
    job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE NOT NULL,
    capacity INTEGER DEFAULT 1 CHECK (capacity > 0),
    proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crew_id, job_role_id)
);

-- Add indexes
CREATE INDEX idx_workers_user_id ON workers(user_id);
CREATE INDEX idx_workers_active ON workers(is_active);
CREATE INDEX idx_crews_team_id ON crews(team_id);
CREATE INDEX idx_crew_workers_crew_id ON crew_workers(crew_id);
CREATE INDEX idx_crew_workers_worker_id ON crew_workers(worker_id);
CREATE INDEX idx_worker_certifications_worker_id ON worker_certifications(worker_id);
CREATE INDEX idx_crew_role_capabilities_crew_id ON crew_role_capabilities(crew_id);

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_workers ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Team members can view workers" ON workers 
    FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid()))
    );

CREATE POLICY "Admin and sales can manage workers" ON workers 
    FOR ALL USING (
        user_id IN (SELECT id FROM users WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales')))
    );

CREATE POLICY "Team members can view crews" ON crews 
    FOR SELECT USING (
        team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admin and sales can manage crews" ON crews 
    FOR ALL USING (
        team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "Team members can view crew workers" ON crew_workers 
    FOR SELECT USING (
        crew_id IN (SELECT id FROM crews WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid()))
    );

CREATE POLICY "Admin and sales can manage crew workers" ON crew_workers 
    FOR ALL USING (
        crew_id IN (SELECT id FROM crews WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales')))
    );

-- Add triggers
CREATE TRIGGER update_workers_updated_at 
    BEFORE UPDATE ON workers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crews_updated_at 
    BEFORE UPDATE ON crews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Populate workers table from users table for existing users with worker role
INSERT INTO workers (user_id, name, phone, is_active)
SELECT id, name, phone, is_active
FROM users 
WHERE role = 'worker'
ON CONFLICT (user_id) DO NOTHING;