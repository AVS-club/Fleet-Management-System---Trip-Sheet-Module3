-- Comprehensive fix for drivers table schema
-- Ensure all columns that the frontend expects actually exist

-- First, let's see what columns currently exist
SELECT 'Current drivers table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns that the frontend expects
DO $$
BEGIN
  -- Add phone column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'phone' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN phone VARCHAR(20);
    RAISE NOTICE 'Added phone column to drivers table';
  END IF;

  -- Add address column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'address' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN address TEXT;
    RAISE NOTICE 'Added address column to drivers table';
  END IF;

  -- Add date_of_birth column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'date_of_birth' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN date_of_birth DATE;
    RAISE NOTICE 'Added date_of_birth column to drivers table';
  END IF;

  -- Add date_of_joining column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'date_of_joining' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN date_of_joining DATE;
    RAISE NOTICE 'Added date_of_joining column to drivers table';
  END IF;

  -- Add license_expiry column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'license_expiry' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN license_expiry DATE;
    RAISE NOTICE 'Added license_expiry column to drivers table';
  END IF;

  -- Add medical_certificate_expiry column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'medical_certificate_expiry' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN medical_certificate_expiry DATE;
    RAISE NOTICE 'Added medical_certificate_expiry column to drivers table';
  END IF;

  -- Add aadhar_number column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'aadhar_number' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN aadhar_number VARCHAR(20);
    RAISE NOTICE 'Added aadhar_number column to drivers table';
  END IF;

  -- Add status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'status' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    RAISE NOTICE 'Added status column to drivers table';
  END IF;

  -- Add experience_years column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'experience_years' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN experience_years INTEGER DEFAULT 0;
    RAISE NOTICE 'Added experience_years column to drivers table';
  END IF;

  -- Add salary column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'salary' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN salary DECIMAL(10,2);
    RAISE NOTICE 'Added salary column to drivers table';
  END IF;

  -- Add added_by column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'added_by' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN added_by UUID;
    RAISE NOTICE 'Added added_by column to drivers table';
  END IF;

  -- Add created_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'created_at' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to drivers table';
  END IF;

  -- Add updated_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'updated_at' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to drivers table';
  END IF;

  -- Add organization_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'organization_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN organization_id UUID;
    RAISE NOTICE 'Added organization_id column to drivers table';
  END IF;

END $$;

-- Show final schema
SELECT 'Final drivers table columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND table_schema = 'public'
ORDER BY ordinal_position;
