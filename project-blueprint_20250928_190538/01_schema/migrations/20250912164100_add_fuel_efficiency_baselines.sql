-- Create fuel efficiency baselines table for vehicle performance tracking
CREATE TABLE IF NOT EXISTS fuel_efficiency_baselines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Vehicle reference
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  vehicle_registration TEXT NOT NULL,
  
  -- Baseline metrics
  baseline_kmpl DECIMAL(6,2) NOT NULL CHECK (baseline_kmpl > 0),
  baseline_calculated_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sample_size INTEGER NOT NULL CHECK (sample_size >= 10),
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Tolerance settings
  tolerance_upper_percent DECIMAL(5,2) DEFAULT 15.00 CHECK (tolerance_upper_percent >= 0),
  tolerance_lower_percent DECIMAL(5,2) DEFAULT 15.00 CHECK (tolerance_lower_percent >= 0),
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_range JSONB NOT NULL DEFAULT '{}',
  
  -- Constraints
  UNIQUE(vehicle_id),
  
  -- Indexes for performance
  CONSTRAINT valid_confidence_score CHECK (confidence_score BETWEEN 0 AND 100),
  CONSTRAINT valid_sample_size CHECK (sample_size >= 10),
  CONSTRAINT valid_baseline_kmpl CHECK (baseline_kmpl > 0 AND baseline_kmpl < 100)
);

-- Create indexes for efficient querying
CREATE INDEX idx_fuel_baselines_vehicle_id ON fuel_efficiency_baselines(vehicle_id);
CREATE INDEX idx_fuel_baselines_confidence ON fuel_efficiency_baselines(confidence_score);
CREATE INDEX idx_fuel_baselines_updated ON fuel_efficiency_baselines(last_updated);

-- Enable RLS
ALTER TABLE fuel_efficiency_baselines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view fuel baselines for their organization" ON fuel_efficiency_baselines
  FOR SELECT USING (
    created_by IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'organization_id' = 
        (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can insert fuel baselines for their organization" ON fuel_efficiency_baselines
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    vehicle_id IN (
      SELECT id FROM vehicles 
      WHERE created_by IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'organization_id' = 
          (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update fuel baselines for their organization" ON fuel_efficiency_baselines
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'organization_id' = 
        (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can delete fuel baselines for their organization" ON fuel_efficiency_baselines
  FOR DELETE USING (
    created_by IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'organization_id' = 
        (SELECT raw_user_meta_data->>'organization_id' FROM auth.users WHERE id = auth.uid())
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fuel_baseline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fuel_baseline_updated_at_trigger
  BEFORE UPDATE ON fuel_efficiency_baselines
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_baseline_updated_at();

-- Add comments for documentation
COMMENT ON TABLE fuel_efficiency_baselines IS 'Vehicle-specific fuel efficiency baselines for performance monitoring';
COMMENT ON COLUMN fuel_efficiency_baselines.baseline_kmpl IS 'Calculated baseline fuel efficiency in km per liter';
COMMENT ON COLUMN fuel_efficiency_baselines.confidence_score IS 'Confidence level of baseline accuracy (0-100)';
COMMENT ON COLUMN fuel_efficiency_baselines.sample_size IS 'Number of trips used to calculate baseline';
COMMENT ON COLUMN fuel_efficiency_baselines.data_range IS 'JSON object containing calculation metadata and date ranges';