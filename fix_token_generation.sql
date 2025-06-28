-- Fix token generation function with supported encoding
-- Replace base64url with base64 and clean it up

-- Drop and recreate the token generation function
DROP FUNCTION IF EXISTS generate_secure_token();

-- Method 1: Using base64 encoding (most compatible)
CREATE OR REPLACE FUNCTION generate_secure_token()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT encode(gen_random_bytes(32), 'base64');
$$;

-- Alternative Method 2: Using hex encoding (if base64 still fails)
-- Uncomment if Method 1 doesn't work:
-- CREATE OR REPLACE FUNCTION generate_secure_token()
-- RETURNS text
-- LANGUAGE sql
-- SECURITY DEFINER
-- AS $$
--   SELECT encode(gen_random_bytes(32), 'hex');
-- $$;

-- Alternative Method 3: UUID-based tokens (fallback if gen_random_bytes fails)
-- Uncomment if both above methods fail:
-- CREATE OR REPLACE FUNCTION generate_secure_token()
-- RETURNS text
-- LANGUAGE sql
-- SECURITY DEFINER
-- AS $$
--   SELECT replace(uuid_generate_v4()::text || uuid_generate_v4()::text, '-', '');
-- $$;

-- Test the function
SELECT generate_secure_token() as test_token; 