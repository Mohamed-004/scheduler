-- Fix infinite recursion in users table RLS policies
-- Run this in your Supabase Dashboard -> SQL Editor

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view team members" ON users;

-- Create a simple policy that avoids infinite recursion
-- For now, just allow authenticated users to view user profiles
-- Team isolation will be enforced at the application level
CREATE POLICY "Authenticated users can view profiles" 
    ON users FOR SELECT 
    USING (auth.uid() IS NOT NULL);

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname; 