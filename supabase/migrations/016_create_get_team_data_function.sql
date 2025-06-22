-- Create RPC function to get team data bypassing RLS
CREATE OR REPLACE FUNCTION get_team_data()
RETURNS JSONB AS $$
DECLARE
    users_data JSONB;
    workers_data JSONB;
    result JSONB;
BEGIN
    -- Get all users
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'email', email,
            'role', role,
            'tz', tz,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO users_data
    FROM public.users
    ORDER BY created_at DESC;
    
    -- Get all workers
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'user_id', user_id,
            'name', name,
            'phone', phone,
            'rating', rating,
            'weekly_hours', weekly_hours,
            'tz', tz,
            'is_active', is_active,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO workers_data
    FROM public.workers;
    
    -- Return combined result
    RETURN jsonb_build_object(
        'users', COALESCE(users_data, '[]'::jsonb),
        'workers', COALESCE(workers_data, '[]'::jsonb),
        'success', true,
        'timestamp', NOW()
    );
    
EXCEPTION
    WHEN others THEN
        RETURN jsonb_build_object(
            'users', '[]'::jsonb,
            'workers', '[]'::jsonb,
            'success', false,
            'error', SQLERRM,
            'timestamp', NOW()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_team_data() TO authenticated; 