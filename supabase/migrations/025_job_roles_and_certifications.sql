-- Migration 025: Job Roles and Worker Certifications System
-- Adds role-based job assignment with worker skill tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Job Roles Table - Define available job roles (window cleaners, etc.)
CREATE TABLE job_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    hourly_rate_base DECIMAL(8,2), -- Base hourly rate for this role
    hourly_rate_multiplier DECIMAL(3,2) DEFAULT 1.0, -- Multiplier for worker's base rate
    required_certifications TEXT[], -- Array of required certification names
    physical_demands TEXT, -- Light, Medium, Heavy
    equipment_required TEXT[], -- Array of equipment needed
    color_code TEXT DEFAULT '#3B82F6', -- For UI display
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, name)
);

-- Worker Certifications Table - Track worker skills and certifications
CREATE TABLE worker_certifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    certification_name TEXT NOT NULL,
    proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5), -- 1=Beginner, 5=Expert
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

-- Job Role Requirements Table - Link jobs to required roles
CREATE TABLE job_role_requirements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE NOT NULL,
    quantity_required INTEGER DEFAULT 1 CHECK (quantity_required > 0), -- How many workers needed for this role
    min_proficiency_level INTEGER DEFAULT 1 CHECK (min_proficiency_level BETWEEN 1 AND 5),
    is_lead_role BOOLEAN DEFAULT FALSE, -- Is this the primary/lead role for the job
    hourly_rate_override DECIMAL(8,2), -- Override role's default rate for this job
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, job_role_id)
);

-- Worker Role Assignments Table - Track which workers are assigned to which roles on specific jobs
CREATE TABLE worker_role_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- References users table
    job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_lead BOOLEAN DEFAULT FALSE,
    hourly_rate DECIMAL(8,2), -- Actual rate for this assignment
    notes TEXT,
    UNIQUE(job_id, worker_id, job_role_id)
);

-- Crew Role Capabilities Table - Track what roles each crew can handle
CREATE TABLE crew_role_capabilities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE NOT NULL,
    job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE NOT NULL,
    capacity INTEGER DEFAULT 1 CHECK (capacity > 0), -- How many workers of this role the crew has
    proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5), -- Crew's average proficiency
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(crew_id, job_role_id)
);

-- Add indexes for performance
CREATE INDEX idx_job_roles_team_id ON job_roles(team_id);
CREATE INDEX idx_job_roles_active ON job_roles(team_id, is_active);
CREATE INDEX idx_worker_certifications_worker_id ON worker_certifications(worker_id);
CREATE INDEX idx_worker_certifications_name ON worker_certifications(certification_name);
CREATE INDEX idx_worker_certifications_active ON worker_certifications(worker_id, expiry_date);
CREATE INDEX idx_job_role_requirements_job_id ON job_role_requirements(job_id);
CREATE INDEX idx_job_role_requirements_role_id ON job_role_requirements(job_role_id);
CREATE INDEX idx_worker_role_assignments_job_id ON worker_role_assignments(job_id);
CREATE INDEX idx_worker_role_assignments_worker_id ON worker_role_assignments(worker_id);
CREATE INDEX idx_crew_role_capabilities_crew_id ON crew_role_capabilities(crew_id);

-- Add updated_at triggers
CREATE TRIGGER update_job_roles_updated_at 
    BEFORE UPDATE ON job_roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_certifications_updated_at 
    BEFORE UPDATE ON worker_certifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_role_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_role_capabilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_roles
CREATE POLICY "Team members can view job roles" ON job_roles 
    FOR SELECT USING (
        team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admin and sales can manage job roles" ON job_roles 
    FOR ALL USING (
        team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

-- RLS Policies for worker_certifications
CREATE POLICY "Workers can view own certifications" ON worker_certifications 
    FOR SELECT USING (
        worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM workers w JOIN users u ON w.user_id = u.id 
            WHERE w.id = worker_certifications.worker_id 
            AND u.team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales'))
        )
    );

CREATE POLICY "Admin and sales can manage all team certifications" ON worker_certifications 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workers w JOIN users u ON w.user_id = u.id 
            WHERE w.id = worker_certifications.worker_id 
            AND u.team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales'))
        )
    );

CREATE POLICY "Workers can update own certifications" ON worker_certifications 
    FOR UPDATE USING (
        worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
    );

-- RLS Policies for job_role_requirements
CREATE POLICY "Team members can view job role requirements" ON job_role_requirements 
    FOR SELECT USING (
        job_id IN (SELECT id FROM jobs WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid()))
    );

CREATE POLICY "Admin and sales can manage job role requirements" ON job_role_requirements 
    FOR ALL USING (
        job_id IN (SELECT id FROM jobs WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales')))
    );

-- RLS Policies for worker_role_assignments
CREATE POLICY "Team members can view worker role assignments" ON worker_role_assignments 
    FOR SELECT USING (
        job_id IN (SELECT id FROM jobs WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid()))
    );

CREATE POLICY "Admin and sales can manage worker role assignments" ON worker_role_assignments 
    FOR ALL USING (
        job_id IN (SELECT id FROM jobs WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales')))
    );

-- RLS Policies for crew_role_capabilities
CREATE POLICY "Team members can view crew role capabilities" ON crew_role_capabilities 
    FOR SELECT USING (
        crew_id IN (SELECT id FROM crews WHERE id IN (
            SELECT crew_id FROM crew_workers cw 
            JOIN workers w ON cw.worker_id = w.id 
            JOIN users u ON w.user_id = u.id 
            WHERE u.team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
        ))
    );

CREATE POLICY "Admin and sales can manage crew role capabilities" ON crew_role_capabilities 
    FOR ALL USING (
        crew_id IN (SELECT id FROM crews WHERE id IN (
            SELECT crew_id FROM crew_workers cw 
            JOIN workers w ON cw.worker_id = w.id 
            JOIN users u ON w.user_id = u.id 
            WHERE u.team_id IN (SELECT team_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'sales'))
        ))
    );

-- Add helpful functions for role-based operations

-- Function to get worker qualifications for a specific role
CREATE OR REPLACE FUNCTION get_worker_qualifications(
    p_worker_id UUID,
    p_job_role_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{}';
    v_role RECORD;
    v_certifications JSONB := '[]';
    v_qualification_score INTEGER := 0;
BEGIN
    -- Get role details
    SELECT * INTO v_role FROM job_roles WHERE id = p_job_role_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Role not found');
    END IF;
    
    -- Get worker certifications
    SELECT jsonb_agg(
        jsonb_build_object(
            'name', certification_name,
            'proficiency_level', proficiency_level,
            'is_verified', is_verified,
            'is_expired', CASE WHEN expiry_date < CURRENT_DATE THEN true ELSE false END
        )
    ) INTO v_certifications
    FROM worker_certifications 
    WHERE worker_id = p_worker_id;
    
    -- Calculate qualification score (0-100)
    -- This is a simple algorithm - can be enhanced
    IF v_role.required_certifications IS NOT NULL THEN
        -- Check if worker has required certifications
        SELECT COUNT(*) * 20 INTO v_qualification_score
        FROM unnest(v_role.required_certifications) AS req_cert
        WHERE EXISTS (
            SELECT 1 FROM worker_certifications wc 
            WHERE wc.worker_id = p_worker_id 
            AND wc.certification_name = req_cert
            AND (wc.expiry_date IS NULL OR wc.expiry_date >= CURRENT_DATE)
            AND wc.is_verified = true
        );
    ELSE
        v_qualification_score := 80; -- Default score if no specific requirements
    END IF;
    
    RETURN jsonb_build_object(
        'worker_id', p_worker_id,
        'role_id', p_job_role_id,
        'qualification_score', LEAST(v_qualification_score, 100),
        'certifications', COALESCE(v_certifications, '[]'::jsonb),
        'role_requirements', COALESCE(v_role.required_certifications, ARRAY[]::TEXT[])
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find available workers for a job role
CREATE OR REPLACE FUNCTION find_available_workers_for_role(
    p_job_role_id UUID,
    p_team_id UUID,
    p_start_date DATE,
    p_end_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_workers JSONB := '[]';
    v_worker RECORD;
    v_qualifications JSONB;
BEGIN
    -- Set default end date if not provided
    IF p_end_date IS NULL THEN
        p_end_date := p_start_date;
    END IF;
    
    -- Get all workers in the team
    FOR v_worker IN 
        SELECT w.id, w.user_id, w.name, u.hourly_rate
        FROM workers w
        JOIN users u ON w.user_id = u.id
        WHERE u.team_id = p_team_id 
        AND w.is_active = true
        AND u.is_active = true
    LOOP
        -- Get qualifications for this worker
        SELECT get_worker_qualifications(v_worker.id, p_job_role_id) INTO v_qualifications;
        
        -- Add worker to results with qualification info
        v_workers := v_workers || jsonb_build_array(
            jsonb_build_object(
                'worker_id', v_worker.id,
                'user_id', v_worker.user_id,
                'name', v_worker.name,
                'hourly_rate', v_worker.hourly_rate,
                'qualifications', v_qualifications
            )
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'role_id', p_job_role_id,
        'date_range', jsonb_build_object('start', p_start_date, 'end', p_end_date),
        'available_workers', v_workers
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on new functions
GRANT EXECUTE ON FUNCTION get_worker_qualifications(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_available_workers_for_role(UUID, UUID, DATE, DATE) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE job_roles IS 'Defines available job roles (window cleaners, etc.) for each team';
COMMENT ON TABLE worker_certifications IS 'Tracks worker skills, certifications, and proficiency levels';
COMMENT ON TABLE job_role_requirements IS 'Links jobs to required roles with quantity and proficiency requirements';
COMMENT ON TABLE worker_role_assignments IS 'Tracks actual worker assignments to roles on specific jobs';
COMMENT ON TABLE crew_role_capabilities IS 'Defines what roles each crew can handle and their capacity';

-- Insert some default job roles for teams to get started
-- Teams can customize these as needed
INSERT INTO job_roles (team_id, name, description, required_certifications, physical_demands, equipment_required, color_code)
SELECT 
    t.id,
    role_name,
    role_description,
    role_certs,
    role_demands,
    role_equipment,
    role_color
FROM teams t
CROSS JOIN (
    VALUES 
    ('General Labor', 'Basic labor tasks requiring no special skills', ARRAY[]::TEXT[], 'Medium', ARRAY['Basic Tools'], '#8B5CF6'),
    ('Window Cleaning', 'Professional window cleaning services', ARRAY['Window Cleaning Certification'], 'Light', ARRAY['Squeegees', 'Cleaning Solutions', 'Ladder'], '#10B981'),
    ('Pressure Washing', 'High-pressure cleaning services', ARRAY['Pressure Washing Certification'], 'Medium', ARRAY['Pressure Washer', 'Safety Equipment'], '#F59E0B'),
    ('Landscaping', 'Garden and landscape maintenance', ARRAY['Landscaping License'], 'Heavy', ARRAY['Landscaping Tools', 'Mower'], '#84CC16'),
    ('Electrical Work', 'Licensed electrical services', ARRAY['Electrical License', 'Safety Certification'], 'Medium', ARRAY['Electrical Tools', 'Safety Equipment'], '#EF4444'),
    ('Plumbing', 'Professional plumbing services', ARRAY['Plumbing License'], 'Medium', ARRAY['Plumbing Tools', 'Pipe Equipment'], '#3B82F6')
) AS default_roles(role_name, role_description, role_certs, role_demands, role_equipment, role_color);