-- ================================================================
-- Fix Empty Vendor IDs in Maintenance Service Tasks
-- ================================================================
-- This migration fixes the 40 records that have empty vendor_ids
-- and adds a constraint to prevent this issue in the future
-- ================================================================

-- Step 1: Create a default "Unknown/Unspecified Vendor" entry for each organization
-- This will be used for records where vendor was not specified

DO $$
DECLARE
  org_record RECORD;
  unknown_vendor_id UUID;
BEGIN
  -- Loop through each organization that has maintenance tasks
  FOR org_record IN 
    SELECT DISTINCT mt.organization_id 
    FROM maintenance_tasks mt
    INNER JOIN maintenance_service_tasks mst ON mst.maintenance_task_id = mt.id
    WHERE mst.vendor_id = '' OR mst.vendor_id IS NULL
  LOOP
    -- Check if "Unknown Vendor" already exists for this org
    SELECT id INTO unknown_vendor_id
    FROM maintenance_vendors
    WHERE organization_id = org_record.organization_id
      AND vendor_name = 'Unknown/Unspecified Vendor';
    
    -- If it doesn't exist, create it
    IF unknown_vendor_id IS NULL THEN
      INSERT INTO maintenance_vendors (
        id,
        vendor_name,
        active,
        organization_id,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        'Unknown/Unspecified Vendor',
        true,
        org_record.organization_id,
        NOW(),
        NOW()
      )
      RETURNING id INTO unknown_vendor_id;
      
      RAISE NOTICE 'Created Unknown Vendor for organization: %', org_record.organization_id;
    END IF;
    
    -- Update all empty vendor_ids for this organization
    UPDATE maintenance_service_tasks mst
    SET 
      vendor_id = unknown_vendor_id::text,
      updated_at = NOW()
    FROM maintenance_tasks mt
    WHERE mst.maintenance_task_id = mt.id
      AND mt.organization_id = org_record.organization_id
      AND (mst.vendor_id = '' OR mst.vendor_id IS NULL);
    
    RAISE NOTICE 'Updated empty vendor_ids for organization: %', org_record.organization_id;
  END LOOP;
END $$;

-- Step 2: Add a check constraint to prevent empty vendor_ids in the future
ALTER TABLE maintenance_service_tasks 
DROP CONSTRAINT IF EXISTS vendor_id_not_empty;

ALTER TABLE maintenance_service_tasks 
ADD CONSTRAINT vendor_id_not_empty 
CHECK (vendor_id IS NOT NULL AND vendor_id != '');

-- Step 3: Create an index on vendor_id for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_service_tasks_vendor_lookup 
ON maintenance_service_tasks(vendor_id) 
WHERE vendor_id IS NOT NULL AND vendor_id != '';

-- Step 4: Add a comment to document this fix
COMMENT ON CONSTRAINT vendor_id_not_empty ON maintenance_service_tasks IS 
  'Ensures vendor_id is never empty. Added in migration 20251208000001 to fix issue where 40 records had empty vendor_ids causing "Unknown" display in UI.';

-- Verification Query (run this to check the fix worked)
-- SELECT COUNT(*) as fixed_count
-- FROM maintenance_service_tasks
-- WHERE vendor_id IS NOT NULL AND vendor_id != '';
--
-- SELECT mv.vendor_name, COUNT(mst.id) as usage_count
-- FROM maintenance_service_tasks mst
-- LEFT JOIN maintenance_vendors mv ON mst.vendor_id = mv.id::text
-- GROUP BY mv.vendor_name
-- ORDER BY usage_count DESC;





