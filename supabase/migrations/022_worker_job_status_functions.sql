-- Worker Job Status Functions Migration
-- Adds database functions for worker-specific job management

-- Function to update job status (worker can only update jobs assigned to them)
CREATE OR REPLACE FUNCTION update_worker_job_status(
  p_job_id uuid,
  p_worker_id uuid,
  p_status job_status,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job record;
BEGIN
  -- Get job and verify it's assigned to this worker
  SELECT * INTO v_job
  FROM jobs
  WHERE id = p_job_id
    AND assigned_worker_id = p_worker_id
    AND team_id = (SELECT team_id FROM users WHERE id = p_worker_id);
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Job not found or not assigned to you'
    );
  END IF;
  
  -- Update job status and notes
  UPDATE jobs 
  SET 
    status = p_status,
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
    updated_at = NOW()
  WHERE id = p_job_id;
  
  RETURN json_build_object(
    'success', true,
    'job_id', p_job_id,
    'new_status', p_status
  );
END;
$$;

-- Function to get jobs assigned to a specific worker
CREATE OR REPLACE FUNCTION get_worker_assigned_jobs(
  p_worker_id uuid,
  p_status job_status DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  client_id uuid,
  assigned_worker_id uuid,
  address text,
  job_type text,
  estimated_hours numeric,
  quote_amount numeric,
  equipment_required jsonb,
  status job_status,
  start_time timestamptz,
  end_time timestamptz,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  client_name text,
  client_phone text,
  client_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.team_id,
    j.client_id,
    j.assigned_worker_id,
    j.address,
    j.job_type,
    j.estimated_hours,
    j.quote_amount,
    j.equipment_required,
    j.status,
    j.start_time,
    j.end_time,
    j.notes,
    j.created_at,
    j.updated_at,
    c.name as client_name,
    c.phone as client_phone,
    c.email as client_email
  FROM jobs j
  LEFT JOIN clients c ON c.id = j.client_id
  WHERE j.assigned_worker_id = p_worker_id
    AND j.team_id = (SELECT team_id FROM users WHERE id = p_worker_id)
    AND (p_status IS NULL OR j.status = p_status)
  ORDER BY 
    CASE j.status
      WHEN 'IN_PROGRESS' THEN 1
      WHEN 'SCHEDULED' THEN 2
      WHEN 'PENDING' THEN 3
      WHEN 'COMPLETED' THEN 4
      WHEN 'CANCELLED' THEN 5
    END,
    j.start_time ASC NULLS LAST,
    j.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_worker_job_status(uuid, uuid, job_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_assigned_jobs(uuid, job_status) TO authenticated; 