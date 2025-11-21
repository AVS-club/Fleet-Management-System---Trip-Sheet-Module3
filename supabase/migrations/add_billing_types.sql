/*
  # Add New Billing Types and Default Billing Settings

  1. Changes
    - Add 'per_trip' and 'per_unit' to billing_type ENUM
    - Add default_billing_type to global_settings table
    
  2. Notes
    - Safely adds new enum values without breaking existing data
    - Adds organization-level default billing type preference
*/

-- Add new values to billing_type enum
-- PostgreSQL doesn't allow direct ALTER TYPE ADD VALUE in a transaction,
-- so we need to do this outside a transaction block
DO $$ 
BEGIN
  -- Check if 'per_trip' doesn't exist in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'per_trip' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'billing_type')
  ) THEN
    ALTER TYPE billing_type ADD VALUE 'per_trip' AFTER 'per_ton';
  END IF;
  
  -- Check if 'per_unit' doesn't exist in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'per_unit' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'billing_type')
  ) THEN
    ALTER TYPE billing_type ADD VALUE 'per_unit' AFTER 'per_trip';
  END IF;
END $$;

-- Create global_settings table if it doesn't exist
-- Check if table exists first
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_schema = 'public' 
                 AND table_name = 'global_settings') THEN
    CREATE TABLE public.global_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      setting_name VARCHAR(255) NOT NULL,
      setting_value TEXT,
      user_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(setting_name, user_id)
    );
  END IF;
END $$;

-- Enable RLS on global_settings if not already enabled
DO $$
BEGIN
  ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own settings" ON public.global_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.global_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.global_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.global_settings;

-- Create RLS policies for global_settings
CREATE POLICY "Users can view their own settings" ON public.global_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.global_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.global_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON public.global_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Add default billing type setting for current user
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NOT NULL THEN
    -- Insert default billing type for current user if it doesn't exist
    INSERT INTO public.global_settings (setting_name, setting_value, user_id)
    VALUES ('default_billing_type', 'per_km', current_user_id)
    ON CONFLICT (setting_name, user_id) DO NOTHING;
  END IF;
END $$;

-- Create a function to get the default billing type for a user
CREATE OR REPLACE FUNCTION get_default_billing_type(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  default_type TEXT;
BEGIN
  SELECT setting_value INTO default_type
  FROM public.global_settings
  WHERE setting_name = 'default_billing_type'
  AND user_id = user_id_param;
  
  -- Return 'per_km' as default if no setting found
  RETURN COALESCE(default_type, 'per_km');
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the new enum values
COMMENT ON TYPE billing_type IS 'Billing calculation methods: per_km (per kilometer), per_ton (per weight), per_trip (flat rate), per_unit (per package/unit), manual (custom amount)';
