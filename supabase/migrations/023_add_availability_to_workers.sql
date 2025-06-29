-- Add availability fields to workers table
-- This replaces the complex worker_availability table approach with simple JSON fields

-- Add availability columns to workers table
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS default_schedule JSONB DEFAULT '{
  "monday": {"start": "09:00", "end": "17:00", "available": true},
  "tuesday": {"start": "09:00", "end": "17:00", "available": true},
  "wednesday": {"start": "09:00", "end": "17:00", "available": true},
  "thursday": {"start": "09:00", "end": "17:00", "available": true},
  "friday": {"start": "09:00", "end": "17:00", "available": true},
  "saturday": {"start": "09:00", "end": "17:00", "available": false},
  "sunday": {"start": "09:00", "end": "17:00", "available": false}
}',
ADD COLUMN IF NOT EXISTS schedule_exceptions JSONB DEFAULT '[]';

-- Add comments for clarity
COMMENT ON COLUMN workers.default_schedule IS 'Default weekly availability schedule in JSON format';
COMMENT ON COLUMN workers.schedule_exceptions IS 'Array of date-specific schedule exceptions in JSON format';

-- Create function to get worker availability for a specific date
CREATE OR REPLACE FUNCTION get_worker_availability(
  p_worker_id UUID,
  p_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_day_of_week TEXT;
  v_default_schedule JSONB;
  v_exceptions JSONB;
  v_exception JSONB;
  v_result JSONB;
BEGIN
  -- Get day of week (monday, tuesday, etc.)
  v_day_of_week := LOWER(TO_CHAR(p_date, 'Day'));
  v_day_of_week := TRIM(v_day_of_week);
  
  -- Get worker's default schedule and exceptions
  SELECT default_schedule, schedule_exceptions
  INTO v_default_schedule, v_exceptions
  FROM workers
  WHERE id = p_worker_id;
  
  -- Start with default schedule for the day
  v_result := v_default_schedule->v_day_of_week;
  
  -- Check for date-specific exceptions
  FOR v_exception IN SELECT jsonb_array_elements(v_exceptions)
  LOOP
    IF (v_exception->>'date')::DATE = p_date THEN
      -- Override with exception data
      v_result := v_exception;
      EXIT;
    END IF;
  END LOOP;
  
  -- Add the date to the result
  v_result := v_result || jsonb_build_object('date', p_date);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update worker schedule
CREATE OR REPLACE FUNCTION update_worker_schedule(
  p_worker_id UUID,
  p_schedule JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_current_user_id UUID;
  v_current_user_role TEXT;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Get current user's role and team
  SELECT role, team_id INTO v_current_user_role, v_team_id
  FROM users 
  WHERE id = v_current_user_id;
  
  -- Get worker's user_id and team
  SELECT user_id INTO v_user_id
  FROM workers 
  WHERE id = p_worker_id;
  
  -- Security check: Only admin/sales can update others, workers can update their own
  IF v_current_user_role NOT IN ('admin', 'sales') AND v_current_user_id != v_user_id THEN
    RAISE EXCEPTION 'Insufficient permissions to update worker schedule';
  END IF;
  
  -- Update the schedule
  UPDATE workers
  SET 
    default_schedule = p_schedule,
    updated_at = NOW()
  WHERE id = p_worker_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add schedule exception
CREATE OR REPLACE FUNCTION add_schedule_exception(
  p_worker_id UUID,
  p_exception JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_team_id UUID;
  v_current_user_id UUID;
  v_current_user_role TEXT;
  v_current_exceptions JSONB;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Get current user's role and team
  SELECT role, team_id INTO v_current_user_role, v_team_id
  FROM users 
  WHERE id = v_current_user_id;
  
  -- Get worker's user_id and team
  SELECT user_id INTO v_user_id
  FROM workers 
  WHERE id = p_worker_id;
  
  -- Security check: Only admin/sales can update others, workers can update their own
  IF v_current_user_role NOT IN ('admin', 'sales') AND v_current_user_id != v_user_id THEN
    RAISE EXCEPTION 'Insufficient permissions to add schedule exception';
  END IF;
  
  -- Get current exceptions
  SELECT schedule_exceptions INTO v_current_exceptions
  FROM workers
  WHERE id = p_worker_id;
  
  -- Add new exception to array
  v_current_exceptions := v_current_exceptions || jsonb_build_array(p_exception);
  
  -- Update the exceptions
  UPDATE workers
  SET 
    schedule_exceptions = v_current_exceptions,
    updated_at = NOW()
  WHERE id = p_worker_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_worker_availability(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_worker_schedule(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_schedule_exception(UUID, JSONB) TO authenticated; 