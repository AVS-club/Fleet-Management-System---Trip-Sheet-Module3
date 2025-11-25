-- =====================================================
-- Migration: Ensure vendor_id and service_type columns exist
-- Created: 2025-11-24
-- Description:
--   Adds missing columns to maintenance_service_tasks table:
--   1. vendor_id (UUID reference to maintenance_vendors)
--   2. service_type (purchase, labor, or both)
-- =====================================================

DO $$ 
BEGIN
    -- =====================================================
    -- Add vendor_id column if it doesn't exist
    -- =====================================================
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'maintenance_service_tasks' 
        AND column_name = 'vendor_id'
    ) THEN
        ALTER TABLE public.maintenance_service_tasks
        ADD COLUMN vendor_id UUID;
        
        RAISE NOTICE 'Added vendor_id column to maintenance_service_tasks';
    ELSE
        -- Check if it's TEXT and needs to be converted to UUID
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'maintenance_service_tasks'
            AND column_name = 'vendor_id'
            AND data_type IN ('text', 'character varying')
        ) THEN
            -- Column exists as TEXT, which is correct for storing UUIDs as strings
            RAISE NOTICE 'vendor_id column exists as TEXT (correct for UUID storage)';
        ELSE
            RAISE NOTICE 'vendor_id column already exists';
        END IF;
    END IF;

    -- =====================================================
    -- Add service_type column if it doesn't exist  
    -- =====================================================
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'maintenance_service_tasks' 
        AND column_name = 'service_type'
    ) THEN
        ALTER TABLE public.maintenance_service_tasks
        ADD COLUMN service_type TEXT;
        
        RAISE NOTICE 'Added service_type column to maintenance_service_tasks';
    ELSE
        RAISE NOTICE 'service_type column already exists';
    END IF;

    -- =====================================================
    -- Add check constraint for service_type (drop first if exists)
    -- =====================================================
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'service_type_check'
        AND table_name = 'maintenance_service_tasks'
    ) THEN
        ALTER TABLE public.maintenance_service_tasks
        DROP CONSTRAINT service_type_check;
        
        RAISE NOTICE 'Dropped existing service_type_check constraint';
    END IF;

    ALTER TABLE public.maintenance_service_tasks
    ADD CONSTRAINT service_type_check 
    CHECK (service_type IN ('purchase', 'labor', 'both') OR service_type IS NULL);
    
    RAISE NOTICE 'Added service_type_check constraint';

END $$;

-- =====================================================
-- Add column comments for documentation
-- =====================================================
COMMENT ON COLUMN public.maintenance_service_tasks.vendor_id IS 'UUID reference to vendor/mechanic from maintenance_vendors table';
COMMENT ON COLUMN public.maintenance_service_tasks.service_type IS 'Type of service: purchase (bought parts only), labor (service/repair done), both (bought parts + installation)';

-- =====================================================
-- Verification Query (commented out, run manually to verify)
-- =====================================================
-- SELECT 
--   column_name,
--   data_type,
--   is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'maintenance_service_tasks'
-- AND column_name IN ('vendor_id', 'service_type')
-- ORDER BY column_name;

