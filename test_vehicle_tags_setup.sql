-- Test Vehicle Tags System Setup
-- Run this in Supabase SQL Editor to verify the implementation

-- Check if tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('tags', 'vehicle_tags', 'vehicle_tag_history') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tags', 'vehicle_tags', 'vehicle_tag_history');

-- Check tags table structure
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tags'
ORDER BY ordinal_position;

-- Check vehicle_tags table structure  
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'vehicle_tags'
ORDER BY ordinal_position;

-- Check if we have any existing tags
SELECT COUNT(*) as tag_count FROM public.tags;

-- Check if we have any vehicle-tag assignments
SELECT COUNT(*) as vehicle_tag_count FROM public.vehicle_tags;

-- Test query: Get vehicles with their tags (if any exist)
SELECT 
  v.registration_number,
  v.make,
  v.model,
  t.name as tag_name,
  t.color_hex as tag_color
FROM vehicles v
LEFT JOIN vehicle_tags vt ON v.id = vt.vehicle_id
LEFT JOIN tags t ON vt.tag_id = t.id
WHERE v.registration_number IS NOT NULL
LIMIT 5;

-- Check RLS policies are enabled
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('tags', 'vehicle_tags', 'vehicle_tag_history')
ORDER BY tablename, policyname;
