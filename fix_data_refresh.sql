-- Fix Database Migration Issues
-- Run this in your Supabase SQL Editor to resolve migration problems

-- 1. First, let's check if the profiles table exists and create it properly
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'data_entry', 'driver', 'viewer')),
  organization_id UUID,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create missing indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles (organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Fix activity log tables if they have issues
-- First, check if user_activity_log exists and drop it if it has wrong structure
DO $$ 
BEGIN
    -- Check if the table exists and has the wrong column name
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_log') THEN
        -- Check if it has user_id column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_log' AND column_name = 'user_id') THEN
            DROP TABLE IF EXISTS user_activity_log CASCADE;
        END IF;
    END IF;
END $$;

-- Create the table with correct structure
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(100),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    device VARCHAR(100),
    location VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id_timestamp ON user_activity_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action_type ON user_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_timestamp ON user_activity_log(timestamp DESC);

-- 7. Enable RLS for activity logs
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- 8. Create policies for activity logs (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_log') THEN
        DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_log;
        CREATE POLICY "Users can view own activity logs" ON user_activity_log
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert own activity logs" ON user_activity_log;
        CREATE POLICY "Users can insert own activity logs" ON user_activity_log
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 9. Grant permissions
GRANT SELECT, INSERT ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON user_activity_log TO authenticated;

-- 10. Test the connection
SELECT 'Database connection test successful' as status;
