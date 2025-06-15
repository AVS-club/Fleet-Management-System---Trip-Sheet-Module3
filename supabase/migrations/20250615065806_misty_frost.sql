-- Check if tables exist before trying to create them
DO $$ 
BEGIN
  -- Only create ai_alerts table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_alerts') THEN
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

    -- Create indexes for better query performance
    CREATE INDEX idx_ai_alerts_type ON ai_alerts(alert_type);
    CREATE INDEX idx_ai_alerts_status ON ai_alerts(status);
    CREATE INDEX idx_ai_alerts_entity ON ai_alerts USING gin(affected_entity);
  END IF;

  -- Only create alert_settings table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alert_settings') THEN
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
  END IF;
END $$;

-- Add policies only if they don't already exist
DO $$
BEGIN
  -- Policy for ai_alerts SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_alerts' 
    AND policyname = 'Enable read access for authenticated users'
  ) THEN
    CREATE POLICY "Enable read access for authenticated users" ON ai_alerts
      FOR SELECT TO authenticated USING (true);
  END IF;

  -- Policy for ai_alerts INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ai_alerts' 
    AND policyname = 'Enable insert for authenticated users'
  ) THEN
    CREATE POLICY "Enable insert for authenticated users" ON ai_alerts
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  -- Policy for alert_settings SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'alert_settings' 
    AND policyname = 'Enable read access for own alert settings'
  ) THEN
    CREATE POLICY "Enable read access for own alert settings" ON alert_settings
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  -- Policy for alert_settings ALL operations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'alert_settings' 
    AND policyname = 'Enable insert/update for own alert settings'
  ) THEN
    CREATE POLICY "Enable insert/update for own alert settings" ON alert_settings
      FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;