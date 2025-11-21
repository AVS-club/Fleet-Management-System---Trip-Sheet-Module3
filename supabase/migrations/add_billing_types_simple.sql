/*
  # Add New Billing Types - Simplified Version

  1. Changes
    - Add 'per_trip' and 'per_unit' to billing_type ENUM
    - Add default billing type to global_settings (user-based)
    
  2. Notes
    - This is a simplified version that works with existing database structure
    - Uses user_id instead of organization_id for settings
*/

-- Step 1: Add new values to billing_type enum
-- Note: These need to be run separately if there's an error
ALTER TYPE billing_type ADD VALUE IF NOT EXISTS 'per_trip' AFTER 'per_ton';
ALTER TYPE billing_type ADD VALUE IF NOT EXISTS 'per_unit' AFTER 'per_trip';

-- Step 2: Ensure global_settings table exists with correct structure
CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name VARCHAR(255) NOT NULL,
  setting_value TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(setting_name, user_id)
);

-- Step 3: Enable RLS on global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own settings" ON public.global_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.global_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.global_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.global_settings;

CREATE POLICY "Users can view their own settings" ON public.global_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.global_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.global_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON public.global_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Add comment to document the enum values
COMMENT ON TYPE billing_type IS 'Billing calculation methods: per_km (per kilometer), per_ton (per weight), per_trip (flat rate), per_unit (per package/unit), manual (custom amount)';
