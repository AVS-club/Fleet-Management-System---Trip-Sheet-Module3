-- SQL Query to check if 'notes' field exists in maintenance_service_tasks table

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM
  information_schema.columns
WHERE
  table_name = 'maintenance_service_tasks'
  AND column_name = 'notes';

-- If the above query returns a row, the notes field exists
-- If it returns no rows, the field does not exist

-- Alternative query to see ALL columns in the table:
SELECT
  column_name,
  data_type,
  is_nullable
FROM
  information_schema.columns
WHERE
  table_name = 'maintenance_service_tasks'
ORDER BY
  ordinal_position;
