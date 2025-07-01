-- Add foreign key constraints to worker_capabilities table
-- This will enable Supabase client to use automatic joins

-- Add foreign key constraint for worker_id -> users.id
ALTER TABLE worker_capabilities 
ADD CONSTRAINT fk_worker_capabilities_worker_id 
FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key constraint for job_role_id -> job_roles.id  
ALTER TABLE worker_capabilities 
ADD CONSTRAINT fk_worker_capabilities_job_role_id 
FOREIGN KEY (job_role_id) REFERENCES job_roles(id) ON DELETE CASCADE;

-- Add foreign key constraint for assigned_by -> users.id
ALTER TABLE worker_capabilities 
ADD CONSTRAINT fk_worker_capabilities_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;