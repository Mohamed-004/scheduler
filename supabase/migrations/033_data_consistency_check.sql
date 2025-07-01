-- Data consistency check and cleanup for worker capabilities system

-- Check for any orphaned records
-- 1. worker_capabilities with invalid worker_id (should reference users.id)
SELECT 'Orphaned worker_capabilities (invalid worker_id)' as issue, count(*) as count
FROM worker_capabilities wc
LEFT JOIN users u ON wc.worker_id = u.id
WHERE u.id IS NULL;

-- 2. worker_capabilities with invalid job_role_id
SELECT 'Orphaned worker_capabilities (invalid job_role_id)' as issue, count(*) as count
FROM worker_capabilities wc
LEFT JOIN job_roles jr ON wc.job_role_id = jr.id
WHERE jr.id IS NULL;

-- 3. worker_role_assignments with invalid worker_id (should reference users.id)
SELECT 'Orphaned worker_role_assignments (invalid worker_id)' as issue, count(*) as count
FROM worker_role_assignments wra
LEFT JOIN users u ON wra.worker_id = u.id
WHERE u.id IS NULL;

-- Show current data distribution
SELECT 'worker_capabilities total' as table_name, count(*) as count FROM worker_capabilities;
SELECT 'worker_role_assignments total' as table_name, count(*) as count FROM worker_role_assignments;
SELECT 'worker_certifications total' as table_name, count(*) as count FROM worker_certifications_deprecated;

-- Show a sample of current worker_capabilities
SELECT 
  'Sample worker_capabilities' as info,
  wc.id,
  wc.worker_id,
  u.email as worker_email,
  jr.name as role_name,
  wc.is_active,
  wc.proficiency_level
FROM worker_capabilities wc
JOIN users u ON wc.worker_id = u.id
JOIN job_roles jr ON wc.job_role_id = jr.id
ORDER BY wc.created_at DESC
LIMIT 5;