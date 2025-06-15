/*
  # Add AI Alerts and Alert Settings Tables (Idempotent Version)
  
  1. New Tables (if they don't exist)
    - `ai_alerts` - Stores AI-generated alerts for the fleet management system
    - `alert_settings` - Stores user preferences for alert display and notifications
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
  
  3. Indexes
    - Add performance indexes for alert queries
*/

-- Check if ai_alerts table exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_alerts') THEN
    -- Create AI Alerts table
    CREATE TABLE ai_alerts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      alert_type text NOT NULL,
      severity text NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      title text NOT NULL,
      description text NOT NULL,
      affected_entity jsonb NOT NULL,
      metadata jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE ai_alerts ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Enable read access for authenticated users" ON ai_alerts
      FOR SELECT TO authenticated USING (true);
    
    CREATE POLICY "Enable insert for authenticated users" ON ai_alerts
      FOR INSERT TO authenticated WITH CHECK (true);
    
    -- Add indexes for better query performance
    CREATE INDEX idx_ai_alerts_type ON ai_alerts(alert_type);
    CREATE INDEX idx_ai_alerts_status ON ai_alerts(status);
    CREATE INDEX idx_ai_alerts_entity ON ai_alerts USING gin(affected_entity);
  END IF;
END $$;

-- Check if alert_settings table exists before creating
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_settings') THEN
    -- Create Alert Settings table
    CREATE TABLE alert_settings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users NOT NULL,
      auto_popup boolean DEFAULT true,
      display_type text DEFAULT 'all',
      group_by text DEFAULT 'none',
      enabled_types text[] DEFAULT ARRAY['route_deviation', 'maintenance', 'documentation', 'fuel_anomaly'],
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(user_id)
    );
    
    -- Enable RLS
    ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Enable read access for own alert settings" ON alert_settings
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
    
    CREATE POLICY "Enable insert/update for own alert settings" ON alert_settings
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure policies exist (these won't error if they already exist)
DO $$ 
BEGIN
  -- For ai_alerts table
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_alerts') 
     AND NOT EXISTS (
       SELECT FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'ai_alerts' 
       AND policyname = 'Enable read access for authenticated users'
     ) THEN
    CREATE POLICY "Enable read access for authenticated users" ON ai_alerts
      FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_alerts') 
     AND NOT EXISTS (
       SELECT FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'ai_alerts' 
       AND policyname = 'Enable insert for authenticated users'
     ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON ai_alerts
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  
  -- For alert_settings table
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_settings') 
     AND NOT EXISTS (
       SELECT FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'alert_settings' 
       AND policyname = 'Enable read access for own alert settings'
     ) THEN
    CREATE POLICY "Enable read access for own alert settings" ON alert_settings
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_settings') 
     AND NOT EXISTS (
       SELECT FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'alert_settings' 
       AND policyname = 'Enable insert/update for own alert settings'
     ) THEN
    CREATE POLICY "Enable insert/update for own alert settings" ON alert_settings
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure indexes exist (these won't error if they already exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_alerts') THEN
    -- Check if index exists before creating
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ai_alerts' AND indexname = 'idx_ai_alerts_type') THEN
      CREATE INDEX idx_ai_alerts_type ON ai_alerts(alert_type);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ai_alerts' AND indexname = 'idx_ai_alerts_status') THEN
      CREATE INDEX idx_ai_alerts_status ON ai_alerts(status);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'ai_alerts' AND indexname = 'idx_ai_alerts_entity') THEN
      CREATE INDEX idx_ai_alerts_entity ON ai_alerts USING gin(affected_entity);
    END IF;
  END IF;
END $$;