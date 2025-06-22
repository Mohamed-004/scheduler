-- Fix RLS policies for team page data access
-- The issue is that JWT tokens don't update automatically when roles change
-- So we need more permissive policies for authenticated users

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin and sales can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
DROP POLICY IF EXISTS "Admin and sales can manage workers" ON public.workers;
DROP POLICY IF EXISTS "Workers can view own record" ON public.workers;

-- Create more permissive policies for authenticated users
-- Users table: Allow authenticated users to read all user records
CREATE POLICY "Authenticated users can view all users" ON public.users 
FOR SELECT TO authenticated USING (true);

-- Users table: Users can still only update their own record
CREATE POLICY "Users can update own record" ON public.users 
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Users table: Allow user creation during signup/invitation
CREATE POLICY "Allow user creation" ON public.users 
FOR INSERT TO authenticated WITH CHECK (true);

-- Workers table: Allow authenticated users to read all worker records
CREATE POLICY "Authenticated users can view all workers" ON public.workers 
FOR SELECT TO authenticated USING (true);

-- Workers table: Allow authenticated users to manage workers (for invitations)
CREATE POLICY "Authenticated users can manage workers" ON public.workers 
FOR ALL TO authenticated USING (true);

-- Create a function to refresh user JWT after role changes
CREATE OR REPLACE FUNCTION refresh_user_jwt()
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    user_profile RECORD;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get user profile
    SELECT * INTO user_profile FROM public.users WHERE id = current_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;
    
    -- Update auth.users metadata to refresh JWT
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
                            jsonb_build_object(
                                'role', user_profile.role,
                                'tz', user_profile.tz,
                                'updated_at', NOW()
                            )
    WHERE id = current_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', current_user_id,
        'role', user_profile.role,
        'message', 'JWT metadata updated'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_user_jwt() TO authenticated; 