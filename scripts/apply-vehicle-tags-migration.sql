-- Script to apply the vehicle tags migration
-- Run this in your Supabase SQL editor or via CLI

-- First, check if the migration has been applied
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tags', 'vehicle_tags', 'vehicle_tag_history');

-- If the tables don't exist, apply the migration
-- You can run the migration file: supabase/migrations/20250131000000_create_vehicle_tags_system.sql

-- Test the setup
SELECT 'Testing tags table...' as test_step;
SELECT COUNT(*) as tags_count FROM public.tags;

SELECT 'Testing vehicle_tags table...' as test_step;
SELECT COUNT(*) as vehicle_tags_count FROM public.vehicle_tags;

SELECT 'Testing vehicle_tag_history table...' as test_step;
SELECT COUNT(*) as history_count FROM public.vehicle_tag_history;

-- Check if vehicles table has organization_id
SELECT 'Checking vehicles table structure...' as test_step;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vehicles' 
AND table_schema = 'public'
AND column_name = 'organization_id';
