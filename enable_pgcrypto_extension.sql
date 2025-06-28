-- Enable pgcrypto extension for secure token generation
-- This enables gen_random_bytes() function

-- Enable the pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Alternative: If pgcrypto is not available, replace the function with uuid-based token
-- Uncomment the lines below if the extension fails to enable

-- DROP FUNCTION IF EXISTS generate_secure_token();
-- CREATE OR REPLACE FUNCTION generate_secure_token()
-- RETURNS text
-- LANGUAGE sql
-- SECURITY DEFINER
-- AS $$
--   SELECT replace(uuid_generate_v4()::text || uuid_generate_v4()::text, '-', '');
-- $$;

-- Test that the function works
SELECT generate_secure_token() as test_token; 