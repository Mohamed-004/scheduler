-- Remove worker_certifications table since certifications are now handled within job_roles
-- Job roles contain required_certifications array and worker_capabilities track which roles workers can perform

-- First, rename the table instead of dropping for safety
ALTER TABLE IF EXISTS worker_certifications RENAME TO worker_certifications_deprecated;

-- Add a comment to document why it was removed
COMMENT ON TABLE worker_certifications_deprecated IS 'DEPRECATED: This table was replaced by worker_capabilities system. Job roles now contain required_certifications and worker_capabilities track which roles workers can perform. Table kept temporarily for rollback safety.';

-- Remove any RLS policies on the deprecated table
DROP POLICY IF EXISTS "Users can view their own certifications" ON worker_certifications_deprecated;
DROP POLICY IF EXISTS "Admin and sales can view all team certifications" ON worker_certifications_deprecated;
DROP POLICY IF EXISTS "Users can create their own certifications" ON worker_certifications_deprecated;
DROP POLICY IF EXISTS "Admin and sales can create team certifications" ON worker_certifications_deprecated;
DROP POLICY IF EXISTS "Users can update their own certifications" ON worker_certifications_deprecated;
DROP POLICY IF EXISTS "Admin can update all team certifications" ON worker_certifications_deprecated;
DROP POLICY IF EXISTS "Users can delete their own certifications" ON worker_certifications_deprecated;
DROP POLICY IF EXISTS "Admin can delete all team certifications" ON worker_certifications_deprecated;