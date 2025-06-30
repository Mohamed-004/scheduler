-- Migration 028: Check and fix schema issues
-- First, let's check what tables exist and their structure

-- Check if timeline_items table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'timeline_items') THEN
        RAISE NOTICE 'timeline_items table exists';
    ELSE
        RAISE NOTICE 'timeline_items table does NOT exist';
    END IF;
END $$;

-- Check if workers table exists and its columns
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workers') THEN
        RAISE NOTICE 'workers table exists';
        RAISE NOTICE 'Workers table columns: %', (
            SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
            FROM information_schema.columns 
            WHERE table_name = 'workers'
        );
    ELSE
        RAISE NOTICE 'workers table does NOT exist';
    END IF;
END $$;

-- Check if crews table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crews') THEN
        RAISE NOTICE 'crews table exists';
    ELSE
        RAISE NOTICE 'crews table does NOT exist';
    END IF;
END $$;

-- Check jobs table columns to understand the schema
DO $$
BEGIN
    RAISE NOTICE 'Jobs table columns: %', (
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        FROM information_schema.columns 
        WHERE table_name = 'jobs'
    );
END $$;

-- List all tables in the public schema
DO $$
BEGIN
    RAISE NOTICE 'All tables in public schema: %', (
        SELECT string_agg(table_name, ', ' ORDER BY table_name)
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    );
END $$;