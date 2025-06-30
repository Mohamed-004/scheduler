-- Migration 029: Enhanced Job Scheduling System
-- Adds separate date/time fields, payable hours, and mandatory worker pay rates

-- Step 1: Add new job scheduling fields
ALTER TABLE jobs 
ADD COLUMN scheduled_date DATE,
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN payable_hours DECIMAL(5,2),
ADD COLUMN actual_duration DECIMAL(5,2);

-- Step 2: Update jobs table with better field names
-- Keep existing scheduled_start and scheduled_end for backwards compatibility
ALTER TABLE jobs 
ADD COLUMN duration_hours DECIMAL(5,2) GENERATED ALWAYS AS (
  CASE 
    WHEN start_time IS NOT NULL AND end_time IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
    ELSE estimated_hours
  END
) STORED;

-- Step 3: Enhance users table for mandatory pay rates
ALTER TABLE users 
ADD COLUMN salary_type TEXT CHECK (salary_type IN ('hourly', 'salary')) DEFAULT 'hourly',
ADD COLUMN salary_amount DECIMAL(10,2),
ADD COLUMN pay_rate_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 4: Make hourly_rate NOT NULL with a default (can be updated by admin)
UPDATE users SET hourly_rate = 0.00 WHERE hourly_rate IS NULL;
ALTER TABLE users ALTER COLUMN hourly_rate SET NOT NULL;
ALTER TABLE users ALTER COLUMN hourly_rate SET DEFAULT 0.00;

-- Step 5: Add constraint to ensure pay rates are properly set
ALTER TABLE users ADD CONSTRAINT check_pay_rate_set 
CHECK (
  (salary_type = 'hourly' AND hourly_rate > 0) OR 
  (salary_type = 'salary' AND salary_amount > 0)
);

-- Step 6: Create pay rate history table for tracking changes
CREATE TABLE user_pay_rate_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    old_hourly_rate DECIMAL(8,2),
    new_hourly_rate DECIMAL(8,2),
    old_salary_type TEXT,
    new_salary_type TEXT,
    old_salary_amount DECIMAL(10,2),
    new_salary_amount DECIMAL(10,2),
    changed_by UUID REFERENCES users(id) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Create function to track pay rate changes
CREATE OR REPLACE FUNCTION track_pay_rate_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if pay-related fields changed
    IF (OLD.hourly_rate IS DISTINCT FROM NEW.hourly_rate) OR 
       (OLD.salary_type IS DISTINCT FROM NEW.salary_type) OR 
       (OLD.salary_amount IS DISTINCT FROM NEW.salary_amount) THEN
        
        INSERT INTO user_pay_rate_history (
            user_id, 
            team_id,
            old_hourly_rate, 
            new_hourly_rate,
            old_salary_type,
            new_salary_type,
            old_salary_amount,
            new_salary_amount,
            changed_by
        ) VALUES (
            NEW.id,
            NEW.team_id,
            OLD.hourly_rate,
            NEW.hourly_rate,
            OLD.salary_type,
            NEW.salary_type,
            OLD.salary_amount,
            NEW.salary_amount,
            NEW.id -- Will be updated by application with actual admin ID
        );
        
        -- Update the timestamp
        NEW.pay_rate_updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for pay rate tracking
CREATE TRIGGER track_user_pay_rate_changes
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION track_pay_rate_changes();

-- Step 9: Add indexes for performance
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX idx_jobs_date_time ON jobs(scheduled_date, start_time, end_time);
CREATE INDEX idx_jobs_team_date ON jobs(team_id, scheduled_date);
CREATE INDEX idx_users_pay_rate_updated ON users(pay_rate_updated_at);
CREATE INDEX idx_pay_rate_history_user ON user_pay_rate_history(user_id);
CREATE INDEX idx_pay_rate_history_team ON user_pay_rate_history(team_id);

-- Step 10: Enable RLS on new table
ALTER TABLE user_pay_rate_history ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies for pay rate history
CREATE POLICY "Team members can view their team's pay rate history" ON user_pay_rate_history
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Only admins can insert pay rate history" ON user_pay_rate_history
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 12: Create helper function to validate job scheduling
CREATE OR REPLACE FUNCTION validate_job_scheduling(
    p_scheduled_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_team_id UUID,
    p_required_workers INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    worker_count INTEGER;
    available_workers INTEGER;
    conflicts INTEGER;
BEGIN
    -- Check if we have enough workers in the team
    SELECT COUNT(*) INTO worker_count
    FROM users 
    WHERE team_id = p_team_id 
    AND role = 'worker' 
    AND is_active = true;
    
    -- Check for scheduling conflicts
    SELECT COUNT(*) INTO conflicts
    FROM jobs 
    WHERE team_id = p_team_id
    AND scheduled_date = p_scheduled_date
    AND status NOT IN ('COMPLETED', 'CANCELLED')
    AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
    );
    
    available_workers := worker_count - conflicts;
    
    result := json_build_object(
        'valid', available_workers >= p_required_workers,
        'total_workers', worker_count,
        'available_workers', available_workers,
        'required_workers', p_required_workers,
        'conflicts', conflicts,
        'suggestions', CASE 
            WHEN available_workers < p_required_workers THEN 
                json_build_array(
                    'Need ' || (p_required_workers - available_workers) || ' more workers',
                    'Consider hiring additional staff',
                    'Try scheduling at a different time'
                )
            ELSE json_build_array()
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create function to get scheduling suggestions
CREATE OR REPLACE FUNCTION get_scheduling_suggestions(
    p_team_id UUID,
    p_date DATE,
    p_required_workers INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    suggested_times TEXT[];
    current_hour INTEGER;
    available_slots INTEGER;
BEGIN
    suggested_times := ARRAY[]::TEXT[];
    
    -- Check availability for each hour from 6 AM to 6 PM
    FOR current_hour IN 6..18 LOOP
        SELECT COUNT(*) INTO available_slots
        FROM users u
        WHERE u.team_id = p_team_id 
        AND u.role = 'worker' 
        AND u.is_active = true
        AND u.id NOT IN (
            SELECT j.assigned_worker_id
            FROM jobs j
            WHERE j.team_id = p_team_id
            AND j.scheduled_date = p_date
            AND j.status NOT IN ('COMPLETED', 'CANCELLED')
            AND j.start_time <= (current_hour || ':00')::TIME
            AND j.end_time > (current_hour || ':00')::TIME
        );
        
        IF available_slots >= p_required_workers THEN
            suggested_times := array_append(suggested_times, 
                current_hour || ':00 - ' || (current_hour + 1) || ':00'
            );
        END IF;
    END LOOP;
    
    result := json_build_object(
        'available_slots', suggested_times,
        'best_times', 
            CASE 
                WHEN array_length(suggested_times, 1) > 0 THEN suggested_times[1:3]
                ELSE ARRAY['No available slots found']::TEXT[]
            END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Update existing jobs to have proper scheduling fields (optional migration of existing data)
UPDATE jobs SET 
    scheduled_date = scheduled_start::DATE,
    start_time = scheduled_start::TIME,
    end_time = scheduled_end::TIME,
    payable_hours = estimated_hours
WHERE scheduled_start IS NOT NULL;

COMMENT ON TABLE user_pay_rate_history IS 'Tracks changes to user pay rates for audit purposes';
COMMENT ON COLUMN jobs.scheduled_date IS 'The date when the job is scheduled to occur';
COMMENT ON COLUMN jobs.start_time IS 'The time of day when the job starts';
COMMENT ON COLUMN jobs.end_time IS 'The time of day when the job ends';
COMMENT ON COLUMN jobs.payable_hours IS 'Hours that workers will be paid for (may differ from actual duration)';
COMMENT ON COLUMN jobs.actual_duration IS 'Actual time spent on the job (calculated from actual_start/actual_end)';
COMMENT ON COLUMN users.salary_type IS 'Whether the user is paid hourly or has a fixed salary';
COMMENT ON COLUMN users.salary_amount IS 'Fixed salary amount for salaried employees';