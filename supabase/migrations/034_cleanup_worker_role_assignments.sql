-- Cleanup script for worker_role_assignments table
-- This script helps transition from worker_role_assignments to worker_capabilities
-- for general worker abilities while keeping job-specific assignments

-- First, let's verify what we have in both tables
-- (Run these queries manually to verify before proceeding)

/*
-- Check current data in worker_role_assignments
SELECT 
  wra.id,
  wra.job_id,
  wra.worker_id,
  wra.job_role_id,
  wra.is_lead,
  jr.name as role_name,
  j.title as job_title,
  u.email as worker_email
FROM worker_role_assignments wra
LEFT JOIN job_roles jr ON wra.job_role_id = jr.id
LEFT JOIN jobs j ON wra.job_id = j.id
LEFT JOIN users u ON wra.worker_id = u.id
ORDER BY wra.job_id NULLS FIRST;

-- Check current data in worker_capabilities
SELECT 
  wc.id,
  wc.worker_id,
  wc.job_role_id,
  wc.is_lead,
  wc.is_active,
  jr.name as role_name,
  u.email as worker_email
FROM worker_capabilities wc
JOIN job_roles jr ON wc.job_role_id = jr.id
JOIN users u ON wc.worker_id = u.id
WHERE wc.is_active = true;
*/

-- IMPORTANT: Only execute the following if you're sure about the cleanup
-- This script will:
-- 1. Keep job-specific assignments (where job_id IS NOT NULL)
-- 2. Remove general capability assignments (where job_id IS NULL) since these should be in worker_capabilities

-- Remove general capability assignments from worker_role_assignments
-- (These should now be managed through worker_capabilities table)
-- DELETE FROM worker_role_assignments WHERE job_id IS NULL;

-- If you want to completely remove the table after verifying job assignments are handled elsewhere:
-- WARNING: Only run this after ensuring job-specific workflow is working properly
-- DROP TABLE IF EXISTS worker_role_assignments;

-- For now, we'll just add a comment to document the table usage
COMMENT ON TABLE worker_role_assignments IS 'Stores job-specific worker assignments. For general worker capabilities, use worker_capabilities table.';
COMMENT ON COLUMN worker_role_assignments.job_id IS 'Required field - this table is for job-specific assignments only. General capabilities should use worker_capabilities table.';