/*
  # Add AI Alerts Table

  1. New Tables
    - `ai_alerts` - Stores AI-generated alerts for the fleet management system
      - `id` (uuid, primary key)
      - `alert_type` (text, alert category)
      - `severity` (text, alert importance level)
      - `status` (text, alert processing status)
      - `title` (text, alert title)
      - `description` (text, detailed alert description)
      - `affected_entity` (jsonb, entity the alert relates to)
      - `metadata` (jsonb, additional alert data)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `alert_settings` - Stores user preferences for alert display and notifications
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `auto_popup` (boolean)
      - `display_type` (text)
      - `group_by` (text)
      - `enabled_types` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

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
ALTER TABLE ai_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON ai_alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for own alert settings" ON alert_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Enable insert/update for own alert settings" ON alert_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add indexes for better query performance
CREATE INDEX idx_ai_alerts_type ON ai_alerts(alert_type);
CREATE INDEX idx_ai_alerts_status ON ai_alerts(status);
CREATE INDEX idx_ai_alerts_entity ON ai_alerts USING gin(affected_entity);