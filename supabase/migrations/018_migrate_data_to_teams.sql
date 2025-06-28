-- Migration 018: Migrate existing data to team-based structure
-- This migration will create teams and migrate existing users/data

-- Step 1: Create team for the first admin user (team owner)
WITH first_admin AS (
    SELECT id, email FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1
),
new_team AS (
    INSERT INTO teams (name, owner_id)
    SELECT 
        COALESCE(SPLIT_PART(email, '@', 1) || ' Team', 'Default Team') as name,
        id as owner_id
    FROM first_admin
    RETURNING id as team_id, owner_id
)
-- Step 2: Update the admin user with team_id and additional fields
UPDATE users 
SET 
    team_id = (SELECT team_id FROM new_team),
    name = COALESCE(email, 'Admin User'),
    is_active = true
WHERE id = (SELECT owner_id FROM new_team);

-- Step 3: Update all other users to belong to the same team
WITH team_info AS (
    SELECT team_id FROM users WHERE team_id IS NOT NULL LIMIT 1
)
UPDATE users 
SET 
    team_id = (SELECT team_id FROM team_info),
    name = COALESCE(
        (SELECT w.name FROM workers w WHERE w.user_id = users.id),
        SPLIT_PART(users.email, '@', 1)
    ),
    phone = COALESCE(
        (SELECT w.phone FROM workers w WHERE w.user_id = users.id),
        ''
    ),
    is_active = true
WHERE team_id IS NULL;

-- Step 4: Update clients to belong to the team
WITH team_info AS (
    SELECT team_id FROM users WHERE team_id IS NOT NULL LIMIT 1
)
UPDATE clients 
SET team_id = (SELECT team_id FROM team_info)
WHERE team_id IS NULL;

-- Step 5: Update jobs to belong to the team and assign workers
WITH team_info AS (
    SELECT team_id FROM users WHERE team_id IS NOT NULL LIMIT 1
)
UPDATE jobs 
SET 
    team_id = (SELECT team_id FROM team_info),
    assigned_worker_id = CASE 
        WHEN crew_id IS NOT NULL THEN (
            SELECT u.id FROM users u 
            JOIN workers w ON w.user_id = u.id
            JOIN crew_workers cw ON cw.worker_id = w.id
            WHERE cw.crew_id = jobs.crew_id
            LIMIT 1
        )
        ELSE NULL
    END,
    scheduled_start = jobs.start,
    scheduled_end = jobs.finish,
    actual_start = CASE WHEN status = 'IN_PROGRESS' OR status = 'COMPLETED' THEN jobs.start END,
    actual_end = CASE WHEN status = 'COMPLETED' THEN jobs.finish END
WHERE team_id IS NULL;

-- Step 6: Make team_id required after migration
ALTER TABLE users ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE clients ALTER COLUMN team_id SET NOT NULL; 