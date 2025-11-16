-- Clean up corrupted odometer_image and attachments data
-- This fixes the issue where empty arrays/objects were saved as strings

-- Fix odometer_image that is "[]" string
UPDATE maintenance_tasks
SET odometer_image = NULL
WHERE odometer_image = '[]'
   OR odometer_image = ''
   OR odometer_image = 'null';

-- Fix attachments that have empty objects [{}]
UPDATE maintenance_tasks
SET attachments = '[]'::jsonb
WHERE attachments::text LIKE '%{}%'
   OR attachments IS NULL;

-- Verify the fix
SELECT
  id,
  odometer_image,
  attachments,
  pg_typeof(odometer_image) as odometer_type,
  pg_typeof(attachments) as attachments_type
FROM maintenance_tasks
WHERE id = 'e937f740-696c-439d-828e-520132c52cb9';
