-- ============================================
-- SAFE SQL CLEANUP SCRIPT FOR AVS DOCUMENT PATHS
-- Run these steps IN ORDER in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: VERIFICATION CHECKS (Read-Only)
-- Run these first to understand the scope
-- ============================================

-- 1A. Check column types to confirm they're arrays
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'vehicles' 
    AND column_name IN ('rc_document_url', 'insurance_document_url', 'fitness_document_url', 
                        'tax_document_url', 'permit_document_url', 'puc_document_url')
ORDER BY ordinal_position;

-- 1B. Count rows that need updating in vehicles
SELECT COUNT(*) as vehicles_needing_update
FROM vehicles
WHERE 
    (rc_document_url::text LIKE '%http%' OR rc_document_url::text LIKE '%vehicle-docs/%')
    OR (insurance_document_url::text LIKE '%http%' OR insurance_document_url::text LIKE '%vehicle-docs/%')
    OR (fitness_document_url::text LIKE '%http%' OR fitness_document_url::text LIKE '%vehicle-docs/%')
    OR (tax_document_url::text LIKE '%http%' OR tax_document_url::text LIKE '%vehicle-docs/%')
    OR (permit_document_url::text LIKE '%http%' OR permit_document_url::text LIKE '%vehicle-docs/%')
    OR (puc_document_url::text LIKE '%http%' OR puc_document_url::text LIKE '%vehicle-docs/%');

-- 1C. Sample problematic entries (LIMIT 5)
SELECT 
    id,
    registration_number,
    rc_document_url[1] as first_rc_url,
    insurance_document_url[1] as first_insurance_url
FROM vehicles
WHERE 
    (rc_document_url::text LIKE '%http%' OR rc_document_url::text LIKE '%vehicle-docs/%')
    OR (insurance_document_url::text LIKE '%http%' OR insurance_document_url::text LIKE '%vehicle-docs/%')
LIMIT 5;

-- 1D. Show distinct URL patterns to verify regex coverage
SELECT DISTINCT 
    substring(url FROM '^https?://[^/]+/[^/]+/[^/]+/[^/]+/') as url_pattern,
    COUNT(*) as occurrences
FROM (
    SELECT unnest(rc_document_url) as url FROM vehicles WHERE rc_document_url IS NOT NULL
    UNION ALL
    SELECT unnest(insurance_document_url) FROM vehicles WHERE insurance_document_url IS NOT NULL
    UNION ALL
    SELECT unnest(fitness_document_url) FROM vehicles WHERE fitness_document_url IS NOT NULL
) as all_urls
WHERE url LIKE 'http%'
GROUP BY url_pattern
ORDER BY occurrences DESC;

-- ============================================
-- STEP 2: BACKUP EXISTING FUNCTIONS (if any)
-- Check if functions already exist
-- ============================================

SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('clean_document_path', 'clean_document_paths')
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- STEP 3: CREATE SAFER CLEANUP FUNCTIONS
-- Enhanced with better error handling
-- ============================================

-- Drop old functions if they exist (uncomment if needed)
-- DROP FUNCTION IF EXISTS clean_document_path(text);
-- DROP FUNCTION IF EXISTS clean_document_paths(text[]);

CREATE OR REPLACE FUNCTION clean_document_path(path text)
RETURNS text AS $$
BEGIN
    -- Return NULL for NULL or empty input
    IF path IS NULL OR path = '' THEN
        RETURN path;
    END IF;
    
    -- Remove various URL patterns (expanded coverage)
    -- Pattern 1: Full Supabase URLs with /storage/v1/object/(public|sign)/bucket/
    path := regexp_replace(path, '^https?://[^/]+/storage/v1/object/(?:public|sign)/vehicle-docs/', '', 'g');
    path := regexp_replace(path, '^https?://[^/]+/storage/v1/object/(?:public|sign)/driver-docs/', '', 'g');
    
    -- Pattern 2: Full Supabase URLs with /storage/v1/object/authenticated/bucket/
    path := regexp_replace(path, '^https?://[^/]+/storage/v1/object/authenticated/vehicle-docs/', '', 'g');
    path := regexp_replace(path, '^https?://[^/]+/storage/v1/object/authenticated/driver-docs/', '', 'g');
    
    -- Pattern 3: Remove bucket prefix if present
    path := regexp_replace(path, '^vehicle-docs/', '', 'g');
    path := regexp_replace(path, '^driver-docs/', '', 'g');
    
    -- Pattern 4: Remove any query strings (? and everything after)
    path := regexp_replace(path, '\?.*$', '', 'g');
    
    -- Trim whitespace
    path := trim(path);
    
    RETURN path;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return original path
        RAISE NOTICE 'Error cleaning path %: %', path, SQLERRM;
        RETURN path;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clean_document_paths(paths text[])
RETURNS text[] AS $$
DECLARE
    cleaned_paths text[];
    i integer;
    cleaned_path text;
BEGIN
    -- Return NULL for NULL input
    IF paths IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Return empty array for empty input (not NULL)
    IF array_length(paths, 1) = 0 OR array_length(paths, 1) IS NULL THEN
        RETURN ARRAY[]::text[];
    END IF;
    
    cleaned_paths := ARRAY[]::text[];
    
    -- Clean each path and remove duplicates
    FOR i IN 1..array_length(paths, 1) LOOP
        IF paths[i] IS NOT NULL AND paths[i] != '' THEN
            cleaned_path := clean_document_path(paths[i]);
            -- Only add if not already in array (deduplicate)
            IF NOT (cleaned_path = ANY(cleaned_paths)) THEN
                cleaned_paths := array_append(cleaned_paths, cleaned_path);
            END IF;
        END IF;
    END LOOP;
    
    -- Return empty array instead of NULL if no valid paths
    IF array_length(cleaned_paths, 1) > 0 THEN
        RETURN cleaned_paths;
    ELSE
        RETURN ARRAY[]::text[];
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and return original
        RAISE NOTICE 'Error cleaning paths: %', SQLERRM;
        RETURN paths;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: DRY RUN - Preview changes
-- Check what will be updated before actual update
-- ============================================

-- Preview for vehicles (LIMIT 10)
SELECT 
    id,
    registration_number,
    rc_document_url as original_rc,
    clean_document_paths(rc_document_url) as cleaned_rc,
    insurance_document_url as original_insurance,
    clean_document_paths(insurance_document_url) as cleaned_insurance
FROM vehicles
WHERE 
    rc_document_url IS NOT NULL 
    OR insurance_document_url IS NOT NULL
LIMIT 10;

-- Count how many would change
SELECT 
    COUNT(*) as total_vehicles,
    COUNT(CASE WHEN rc_document_url != clean_document_paths(rc_document_url) THEN 1 END) as rc_changes,
    COUNT(CASE WHEN insurance_document_url != clean_document_paths(insurance_document_url) THEN 1 END) as insurance_changes
FROM vehicles
WHERE rc_document_url IS NOT NULL OR insurance_document_url IS NOT NULL;

-- ============================================
-- STEP 5: ACTUAL UPDATE (With Transaction Safety)
-- Only run after verifying Step 4 looks correct
-- ============================================

-- Start a transaction so we can rollback if needed
BEGIN;

-- Update vehicles table
UPDATE vehicles
SET 
    rc_document_url = clean_document_paths(rc_document_url),
    insurance_document_url = clean_document_paths(insurance_document_url),
    fitness_document_url = clean_document_paths(fitness_document_url),
    tax_document_url = clean_document_paths(tax_document_url),
    permit_document_url = clean_document_paths(permit_document_url),
    puc_document_url = clean_document_paths(puc_document_url),
    updated_at = NOW()
WHERE 
    (rc_document_url::text LIKE '%http%' OR rc_document_url::text LIKE '%vehicle-docs/%')
    OR (insurance_document_url::text LIKE '%http%' OR insurance_document_url::text LIKE '%vehicle-docs/%')
    OR (fitness_document_url::text LIKE '%http%' OR fitness_document_url::text LIKE '%vehicle-docs/%')
    OR (tax_document_url::text LIKE '%http%' OR tax_document_url::text LIKE '%vehicle-docs/%')
    OR (permit_document_url::text LIKE '%http%' OR permit_document_url::text LIKE '%vehicle-docs/%')
    OR (puc_document_url::text LIKE '%http%' OR puc_document_url::text LIKE '%vehicle-docs/%');

-- Check how many rows were updated
GET DIAGNOSTICS @rows_updated = ROW_COUNT;
RAISE NOTICE 'Updated % vehicle rows', @rows_updated;

-- Update drivers table
UPDATE drivers
SET 
    license_doc_url = clean_document_paths(license_doc_url),
    aadhar_doc_url = clean_document_paths(aadhar_doc_url),
    police_doc_url = clean_document_paths(police_doc_url),
    medical_doc_url = clean_document_paths(medical_doc_url),
    updated_at = NOW()
WHERE 
    (license_doc_url::text LIKE '%http%' OR license_doc_url::text LIKE '%driver-docs/%')
    OR (aadhar_doc_url::text LIKE '%http%' OR aadhar_doc_url::text LIKE '%driver-docs/%')
    OR (police_doc_url::text LIKE '%http%' OR police_doc_url::text LIKE '%driver-docs/%')
    OR (medical_doc_url::text LIKE '%http%' OR medical_doc_url::text LIKE '%driver-docs/%');

-- Check how many rows were updated
GET DIAGNOSTICS @rows_updated = ROW_COUNT;
RAISE NOTICE 'Updated % driver rows', @rows_updated;

-- IMPORTANT: Review the changes and either COMMIT or ROLLBACK
-- Run one of these:
-- COMMIT;  -- To save changes
-- ROLLBACK;  -- To undo changes

-- ============================================
-- STEP 6: VERIFY SUCCESS
-- Check if any problematic paths remain
-- ============================================

SELECT 
    'vehicles' as table_name,
    COUNT(*) as remaining_issues
FROM vehicles
WHERE 
    (rc_document_url::text LIKE '%http%' OR rc_document_url::text LIKE '%vehicle-docs/%')
    OR (insurance_document_url::text LIKE '%http%' OR insurance_document_url::text LIKE '%vehicle-docs/%')
UNION ALL
SELECT 
    'drivers' as table_name,
    COUNT(*) as remaining_issues
FROM drivers
WHERE 
    (license_doc_url::text LIKE '%http%' OR license_doc_url::text LIKE '%driver-docs/%')
    OR (aadhar_doc_url::text LIKE '%http%' OR aadhar_doc_url::text LIKE '%driver-docs/%');

-- ============================================
-- STEP 7: UPDATE OTHER DOCUMENT TABLES (if needed)
-- Check if vehicle_documents or driver_documents need updates
-- ============================================

-- Check vehicle_documents table
SELECT COUNT(*) as vehicle_docs_needing_update
FROM vehicle_documents
WHERE file_path LIKE '%http%' OR file_path LIKE '%vehicle-docs/%';

-- If count > 0, update them too:
-- UPDATE vehicle_documents
-- SET file_path = clean_document_path(file_path)
-- WHERE file_path LIKE '%http%' OR file_path LIKE '%vehicle-docs/%';

-- Check driver_documents table
SELECT COUNT(*) as driver_docs_needing_update
FROM driver_documents
WHERE file_path LIKE '%http%' OR file_path LIKE '%driver-docs/%';

-- If count > 0, update them too:
-- UPDATE driver_documents
-- SET file_path = clean_document_path(file_path)
-- WHERE file_path LIKE '%http%' OR file_path LIKE '%driver-docs/%';

-- ============================================
-- STEP 8: CLEANUP (Optional)
-- Remove functions after successful update
-- ============================================

-- Uncomment to remove functions after use:
-- DROP FUNCTION IF EXISTS clean_document_path(text);
-- DROP FUNCTION IF EXISTS clean_document_paths(text[]);