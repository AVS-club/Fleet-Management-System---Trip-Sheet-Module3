-- Check which tables have organization_id column
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE column_name = 'organization_id' 
AND table_schema = 'public'
ORDER BY table_name;
