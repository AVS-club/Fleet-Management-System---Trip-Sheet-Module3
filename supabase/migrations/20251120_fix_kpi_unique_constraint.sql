-- Fix the unique constraint on kpi_cards to prevent duplicates
-- Ensure only one KPI per key per organization

-- First, check existing constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'kpi_cards'::regclass
AND contype = 'u';

-- Drop any incorrect unique constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all unique constraints that are not on (kpi_key, organization_id)
    FOR r IN 
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'kpi_cards'::regclass
        AND contype = 'u'
        AND conname != 'kpi_cards_unique_key_org'
    LOOP
        EXECUTE 'ALTER TABLE kpi_cards DROP CONSTRAINT IF EXISTS ' || r.conname;
        RAISE NOTICE 'Dropped constraint: %', r.conname;
    END LOOP;
END $$;

-- Create the correct unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'kpi_cards'::regclass
        AND contype = 'u'
        AND conname = 'kpi_cards_unique_key_org'
    ) THEN
        ALTER TABLE kpi_cards
        ADD CONSTRAINT kpi_cards_unique_key_org 
        UNIQUE (kpi_key, organization_id);
        RAISE NOTICE 'Created unique constraint on (kpi_key, organization_id)';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Verify the constraint is working
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'kpi_cards'::regclass
AND contype = 'u';
