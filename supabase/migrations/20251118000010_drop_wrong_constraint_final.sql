-- Final Fix: Drop the Wrong Constraint and Ensure Correct One Exists

-- 1. First, let's see ALL indexes and constraints on kpi_cards
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'kpi_cards';

-- 2. Drop the problematic constraint/index that uses computed_at
DROP INDEX IF EXISTS public.kpi_cards_unique_key_time CASCADE;

-- 3. Drop any other constraint that might include computed_at
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop any unique constraint containing computed_at
    FOR r IN (
        SELECT conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'kpi_cards'
        AND contype = 'u'
        AND pg_get_constraintdef(con.oid) LIKE '%computed_at%'
    )
    LOOP
        EXECUTE 'ALTER TABLE public.kpi_cards DROP CONSTRAINT IF EXISTS ' || r.conname || ' CASCADE';
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- 4. Ensure the CORRECT unique constraint exists (kpi_key, organization_id)
-- First drop if exists to avoid conflicts
ALTER TABLE public.kpi_cards 
DROP CONSTRAINT IF EXISTS kpi_cards_unique_key_org CASCADE;

ALTER TABLE public.kpi_cards 
DROP CONSTRAINT IF EXISTS kpi_cards_kpi_key_organization_id_key CASCADE;

-- Now create the correct one
ALTER TABLE public.kpi_cards
ADD CONSTRAINT kpi_cards_unique_key_org 
UNIQUE(kpi_key, organization_id);

-- 5. Clear existing KPI cards for your organization to start fresh
DELETE FROM public.kpi_cards 
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58';

-- 6. Now run generate_kpi_cards - should work perfectly!
SELECT generate_kpi_cards();

-- 7. Verify KPI cards were created for your organization
SELECT 
  COUNT(*) as total_cards
FROM public.kpi_cards
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58';

-- 8. Show your KPI cards
SELECT 
  kpi_key,
  kpi_title,
  kpi_value_human,
  theme,
  computed_at
FROM public.kpi_cards
WHERE organization_id = 'ab6c2178-32f9-4a03-b5ab-d535db827a58'
ORDER BY kpi_key;

-- 9. Verify no constraints with computed_at exist anymore
SELECT 
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'kpi_cards'
AND contype = 'u';
