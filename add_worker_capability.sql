-- Add Ahmed Abdelaal's capability for Electrical Work role
-- This fixes the "Role coverage incomplete" issue in job creation

INSERT INTO worker_capabilities (
  worker_id,
  job_role_id,
  is_active,
  proficiency_level,
  assigned_by,
  notes
) VALUES (
  'f3dda3d4-c9ac-48cd-b7a0-13b57a65b58d',  -- Ahmed's user_id
  '1d4ac71d-e60c-4331-b45d-6f27dd92919f',  -- Electrical Work role_id
  true,
  3,  -- Good proficiency level
  '81e9e5bc-d4be-41db-883a-5c6cb6c1647c',  -- Admin user as assigner
  'Added for testing job creation flow'
);