-- Verify and Fix Unique Constraint on kpi_cards
-- Ensure only kpi_cards_unique_key_org exists on (kpi_key, organization_id)

DO $$
DECLARE
    constraint_record RECORD;
    constraint_count INTEGER;
BEGIN
    -- First, check all unique constraints on kpi_cards
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conrelid = 'kpi_cards'::regclass 
    AND contype = 'u';
    
    RAISE NOTICE 'Found % unique constraints on kpi_cards table', constraint_count;
    
    -- Log all unique constraints
    FOR constraint_record IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint 
        WHERE conrelid = 'kpi_cards'::regclass 
        AND contype = 'u'
    LOOP
        RAISE NOTICE 'Constraint: % - Definition: %', constraint_record.conname, constraint_record.definition;
    END LOOP;
    
    -- Drop all unique constraints EXCEPT the one we want
    FOR constraint_record IN 
        SELECT conname
        FROM pg_constraint 
        WHERE conrelid = 'kpi_cards'::regclass 
        AND contype = 'u'
        AND conname != 'kpi_cards_unique_key_org'
    LOOP
        RAISE NOTICE 'Dropping constraint: %', constraint_record.conname;
        EXECUTE format('ALTER TABLE kpi_cards DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
    
    -- Ensure the correct constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'kpi_cards'::regclass 
        AND contype = 'u'
        AND conname = 'kpi_cards_unique_key_org'
    ) THEN
        RAISE NOTICE 'Creating kpi_cards_unique_key_org constraint';
        ALTER TABLE kpi_cards 
        ADD CONSTRAINT kpi_cards_unique_key_org 
        UNIQUE (kpi_key, organization_id);
    ELSE
        RAISE NOTICE 'kpi_cards_unique_key_org constraint already exists';
    END IF;
    
    -- Final verification
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conrelid = 'kpi_cards'::regclass 
    AND contype = 'u';
    
    RAISE NOTICE 'After cleanup: % unique constraint(s) remain on kpi_cards', constraint_count;
    
    IF constraint_count = 1 THEN
        RAISE NOTICE '✅ Unique constraint verified successfully';
    ELSE
        RAISE WARNING '⚠️ Expected 1 unique constraint, found %', constraint_count;
    END IF;
END $$;

