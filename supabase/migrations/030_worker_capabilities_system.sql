-- Migration 030: Worker Capabilities System
-- Creates worker_capabilities table for general role assignments (not job-specific)

-- Create worker_capabilities table
CREATE TABLE IF NOT EXISTS worker_capabilities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    job_role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_lead BOOLEAN DEFAULT FALSE,
    proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, job_role_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_capabilities_worker_id ON worker_capabilities(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_capabilities_role_id ON worker_capabilities(job_role_id);
CREATE INDEX IF NOT EXISTS idx_worker_capabilities_active ON worker_capabilities(worker_id, is_active);

-- Add updated_at trigger (only if the function exists and trigger doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') 
    AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_worker_capabilities_updated_at') THEN
        CREATE TRIGGER update_worker_capabilities_updated_at 
            BEFORE UPDATE ON worker_capabilities 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE worker_capabilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for worker_capabilities (with duplicate checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'worker_capabilities' AND policyname = 'Workers can view own capabilities') THEN
        CREATE POLICY "Workers can view own capabilities" ON worker_capabilities 
            FOR SELECT USING (
                worker_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM users u 
                    WHERE u.id = auth.uid() 
                    AND u.team_id IN (
                        SELECT team_id FROM users WHERE id = worker_capabilities.worker_id
                    )
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'worker_capabilities' AND policyname = 'Admin and sales can manage worker capabilities') THEN
        CREATE POLICY "Admin and sales can manage worker capabilities" ON worker_capabilities 
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM users u1, users u2
                    WHERE u1.id = auth.uid() 
                    AND u1.role IN ('admin', 'sales')
                    AND u2.id = worker_capabilities.worker_id
                    AND u1.team_id = u2.team_id
                )
            );
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE worker_capabilities IS 'Tracks general worker role capabilities and proficiency levels (not job-specific assignments)';

-- Verify the table was created
SELECT 'worker_capabilities migration completed successfully' as result;