-- Final fix: Create handle_business_signup function with proper error handling
-- Run this in your Supabase Dashboard -> SQL Editor

CREATE OR REPLACE FUNCTION handle_business_signup(
    user_id UUID,
    user_email TEXT,
    business_name TEXT,
    owner_name TEXT,
    owner_phone TEXT
)
RETURNS UUID AS $$
DECLARE
    new_team_id UUID;
    existing_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT id INTO existing_user_id FROM users WHERE id = user_id;
    
    IF existing_user_id IS NOT NULL THEN
        -- User already exists, return their team_id
        SELECT team_id INTO new_team_id FROM users WHERE id = user_id;
        RETURN new_team_id;
    END IF;
    
    -- Create the team
    INSERT INTO teams (name, description)
    VALUES (business_name, 'Business team for ' || business_name)
    RETURNING id INTO new_team_id;
    
    -- Create the admin user
    INSERT INTO users (id, email, team_id, role, name, phone)
    VALUES (user_id, user_email, new_team_id, 'admin', owner_name, owner_phone);
    
    RETURN new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT handle_business_signup(
    'efe8ad93-a8f1-4bc4-b20e-c3f45b263ac1'::UUID,
    'abdelaalmohamed004@gmail.com',
    'Student Works',
    'Mohamed Abdelaal',
    ''
); 