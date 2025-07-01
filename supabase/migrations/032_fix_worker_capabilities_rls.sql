-- Fix worker_capabilities RLS policies to ensure update and delete operations work correctly

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and sales can manage worker capabilities" ON worker_capabilities;
DROP POLICY IF EXISTS "Workers can view own capabilities" ON worker_capabilities;

-- Create new comprehensive policies for worker_capabilities

-- Policy 1: Workers can view their own capabilities and team members' capabilities
CREATE POLICY "Workers can view capabilities" ON worker_capabilities
  FOR SELECT
  USING (
    -- Workers can see their own capabilities
    worker_id = auth.uid()
    OR
    -- Or if user is in the same team as the worker
    EXISTS (
      SELECT 1 FROM users u1, users u2
      WHERE u1.id = auth.uid()
        AND u2.id = worker_capabilities.worker_id
        AND u1.team_id = u2.team_id
    )
  );

-- Policy 2: Admin and sales can manage all worker capabilities in their team
CREATE POLICY "Admin and sales can manage capabilities" ON worker_capabilities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u1, users u2
      WHERE u1.id = auth.uid()
        AND u1.role IN ('admin', 'sales')
        AND u2.id = worker_capabilities.worker_id
        AND u1.team_id = u2.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u1, users u2
      WHERE u1.id = auth.uid()
        AND u1.role IN ('admin', 'sales')
        AND u2.id = worker_capabilities.worker_id
        AND u1.team_id = u2.team_id
    )
  );

-- Policy 3: Workers can only insert capabilities for themselves
CREATE POLICY "Workers can create own capabilities" ON worker_capabilities
  FOR INSERT
  WITH CHECK (
    worker_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'sales')
    )
  );

-- Ensure RLS is enabled
ALTER TABLE worker_capabilities ENABLE ROW LEVEL SECURITY;