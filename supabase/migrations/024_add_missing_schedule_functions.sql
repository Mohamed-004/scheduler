-- Migration 024: Add missing schedule management functions
-- This adds helper functions for better schedule and exception management

-- Function to remove a specific schedule exception
CREATE OR REPLACE FUNCTION remove_schedule_exception(
  p_worker_id UUID,
  p_exception_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_current_user_id UUID;
  v_current_user_role TEXT;
  v_current_exceptions JSONB;
  v_new_exceptions JSONB;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  -- Get current user's role
  SELECT role INTO v_current_user_role
  FROM users 
  WHERE id = v_current_user_id;
  
  -- Get worker's user_id
  SELECT user_id INTO v_user_id
  FROM workers 
  WHERE id = p_worker_id;
  
  -- Security check: Only admin/sales can update others, workers can update their own
  IF v_current_user_role NOT IN ('admin', 'sales') AND v_current_user_id != v_user_id THEN
    RAISE EXCEPTION 'Insufficient permissions to remove schedule exception';
  END IF;
  
  -- Get current exceptions
  SELECT schedule_exceptions INTO v_current_exceptions
  FROM workers
  WHERE id = p_worker_id;
  
  -- Filter out the exception with matching ID
  SELECT jsonb_agg(elem)
  INTO v_new_exceptions
  FROM jsonb_array_elements(v_current_exceptions) AS elem
  WHERE elem->>'id' != p_exception_id;
  
  -- Handle case where no exceptions remain
  IF v_new_exceptions IS NULL THEN
    v_new_exceptions := '[]'::jsonb;
  END IF;
  
  -- Update the exceptions
  UPDATE workers
  SET 
    schedule_exceptions = v_new_exceptions,
    updated_at = NOW()
  WHERE id = p_worker_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get worker schedule for a date range
CREATE OR REPLACE FUNCTION get_worker_schedule_range(
  p_worker_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
  v_current_date DATE;
  v_day_availability JSONB;
BEGIN
  -- Validate date range
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date cannot be after end date';
  END IF;
  
  -- Loop through each date in the range
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    -- Get availability for this specific date
    SELECT get_worker_availability(p_worker_id, v_current_date) INTO v_day_availability;
    
    -- Add to result array
    v_result := v_result || jsonb_build_array(v_day_availability);
    
    -- Move to next date
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for schedule conflicts
CREATE OR REPLACE FUNCTION check_schedule_conflicts(
  p_worker_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_conflicts JSONB := '[]'::jsonb;
  v_job_conflicts JSONB;
  v_exception_conflicts JSONB;
  v_availability JSONB;
  v_date DATE;
BEGIN
  -- Validate input
  IF p_start_datetime >= p_end_datetime THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  -- Extract date for availability check
  v_date := p_start_datetime::date;
  
  -- Check worker availability for the date
  SELECT get_worker_availability(p_worker_id, v_date) INTO v_availability;
  
  -- Check if worker is available on this day
  IF NOT (v_availability->>'available')::boolean THEN
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
      'type', 'availability',
      'message', 'Worker is not available on this day',
      'date', v_date,
      'details', v_availability
    ));
  END IF;
  
  -- Check for job conflicts
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', 'job_conflict',
      'job_id', id,
      'job_type', job_type,
      'scheduled_start', scheduled_start,
      'scheduled_end', scheduled_end
    )
  ) INTO v_job_conflicts
  FROM jobs
  WHERE assigned_worker_id = (
    SELECT user_id FROM workers WHERE id = p_worker_id
  )
  AND status IN ('SCHEDULED', 'IN_PROGRESS')
  AND (
    (scheduled_start, scheduled_end) OVERLAPS (p_start_datetime, p_end_datetime)
  );
  
  -- Add job conflicts to result
  IF v_job_conflicts IS NOT NULL THEN
    v_conflicts := v_conflicts || v_job_conflicts;
  END IF;
  
  -- Check for exception conflicts (simplified - check for same date)
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', 'exception_conflict',
      'exception_id', elem->>'id',
      'exception_type', elem->>'type',
      'title', elem->>'title',
      'start_date', elem->>'startDate',
      'end_date', elem->>'endDate'
    )
  ) INTO v_exception_conflicts
  FROM workers w,
  jsonb_array_elements(w.schedule_exceptions) AS elem
  WHERE w.id = p_worker_id
  AND (elem->>'startDate')::date <= v_date
  AND (elem->>'endDate')::date >= v_date
  AND elem->>'status' = 'approved';
  
  -- Add exception conflicts to result
  IF v_exception_conflicts IS NOT NULL THEN
    v_conflicts := v_conflicts || v_exception_conflicts;
  END IF;
  
  RETURN jsonb_build_object(
    'has_conflicts', jsonb_array_length(v_conflicts) > 0,
    'conflicts', v_conflicts,
    'checked_period', jsonb_build_object(
      'start', p_start_datetime,
      'end', p_end_datetime,
      'worker_id', p_worker_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get schedule template
CREATE OR REPLACE FUNCTION get_schedule_template(
  p_template_name TEXT
) RETURNS JSONB AS $$
BEGIN
  CASE p_template_name
    WHEN 'fulltime' THEN
      RETURN '{
        "monday": {"available": true, "start": "08:00", "end": "17:00", "break": 60},
        "tuesday": {"available": true, "start": "08:00", "end": "17:00", "break": 60},
        "wednesday": {"available": true, "start": "08:00", "end": "17:00", "break": 60},
        "thursday": {"available": true, "start": "08:00", "end": "17:00", "break": 60},
        "friday": {"available": true, "start": "08:00", "end": "17:00", "break": 60},
        "saturday": {"available": false, "start": "09:00", "end": "17:00", "break": 0},
        "sunday": {"available": false, "start": "09:00", "end": "17:00", "break": 0}
      }'::jsonb;
    
    WHEN 'parttime' THEN
      RETURN '{
        "monday": {"available": true, "start": "09:00", "end": "15:00", "break": 30},
        "tuesday": {"available": false, "start": "09:00", "end": "15:00", "break": 0},
        "wednesday": {"available": true, "start": "09:00", "end": "15:00", "break": 30},
        "thursday": {"available": false, "start": "09:00", "end": "15:00", "break": 0},
        "friday": {"available": true, "start": "09:00", "end": "15:00", "break": 30},
        "saturday": {"available": false, "start": "09:00", "end": "15:00", "break": 0},
        "sunday": {"available": false, "start": "09:00", "end": "15:00", "break": 0}
      }'::jsonb;
    
    WHEN 'weekend' THEN
      RETURN '{
        "monday": {"available": false, "start": "09:00", "end": "17:00", "break": 0},
        "tuesday": {"available": false, "start": "09:00", "end": "17:00", "break": 0},
        "wednesday": {"available": false, "start": "09:00", "end": "17:00", "break": 0},
        "thursday": {"available": false, "start": "09:00", "end": "17:00", "break": 0},
        "friday": {"available": false, "start": "09:00", "end": "17:00", "break": 0},
        "saturday": {"available": true, "start": "09:00", "end": "17:00", "break": 60},
        "sunday": {"available": true, "start": "09:00", "end": "17:00", "break": 60}
      }'::jsonb;
    
    WHEN 'flexible' THEN
      RETURN '{
        "monday": {"available": true, "start": "10:00", "end": "16:00", "break": 45},
        "tuesday": {"available": true, "start": "10:00", "end": "16:00", "break": 45},
        "wednesday": {"available": true, "start": "10:00", "end": "16:00", "break": 45},
        "thursday": {"available": true, "start": "10:00", "end": "16:00", "break": 45},
        "friday": {"available": true, "start": "10:00", "end": "16:00", "break": 45},
        "saturday": {"available": true, "start": "12:00", "end": "18:00", "break": 30},
        "sunday": {"available": false, "start": "10:00", "end": "16:00", "break": 0}
      }'::jsonb;
    
    ELSE
      RAISE EXCEPTION 'Invalid template name: %', p_template_name;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION remove_schedule_exception(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_schedule_range(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION check_schedule_conflicts(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_schedule_template(TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION remove_schedule_exception IS 'Remove a specific schedule exception by ID';
COMMENT ON FUNCTION get_worker_schedule_range IS 'Get worker availability for a date range';
COMMENT ON FUNCTION check_schedule_conflicts IS 'Check for scheduling conflicts for a worker';
COMMENT ON FUNCTION get_schedule_template IS 'Get predefined schedule templates';