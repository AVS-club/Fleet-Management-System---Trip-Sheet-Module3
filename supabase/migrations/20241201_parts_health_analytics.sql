-- Add GVW columns to vehicles table if not present
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gvw NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS gbw NUMERIC;

-- Add business impact fields to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS daily_revenue NUMERIC DEFAULT 8000,
ADD COLUMN IF NOT EXISTS daily_km NUMERIC DEFAULT 200;

-- Create comprehensive parts tracking table
CREATE TABLE IF NOT EXISTS parts_replacements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  part_type VARCHAR(50) NOT NULL,
  part_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  replacement_date DATE NOT NULL,
  odometer_reading NUMERIC NOT NULL,
  next_due_odometer NUMERIC,
  cost NUMERIC,
  brand VARCHAR(100),
  warranty_months INTEGER,
  downtime_hours INTEGER,
  business_impact TEXT,
  compliance_risk TEXT,
  revenue_loss_per_day NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Add RLS policies for parts_replacements
ALTER TABLE parts_replacements ENABLE ROW LEVEL SECURITY;

-- Policy for users to view parts replacements for their organization
CREATE POLICY "Users can view parts replacements for their organization" ON parts_replacements
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for users to insert parts replacements for their organization
CREATE POLICY "Users can insert parts replacements for their organization" ON parts_replacements
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for users to update parts replacements for their organization
CREATE POLICY "Users can update parts replacements for their organization" ON parts_replacements
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Policy for users to delete parts replacements for their organization
CREATE POLICY "Users can delete parts replacements for their organization" ON parts_replacements
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parts_replacements_vehicle_id ON parts_replacements(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_parts_replacements_part_type ON parts_replacements(part_type);
CREATE INDEX IF NOT EXISTS idx_parts_replacements_replacement_date ON parts_replacements(replacement_date);
CREATE INDEX IF NOT EXISTS idx_parts_replacements_organization_id ON parts_replacements(organization_id);
CREATE INDEX IF NOT EXISTS idx_parts_replacements_category ON parts_replacements(category);
CREATE INDEX IF NOT EXISTS idx_parts_replacements_next_due ON parts_replacements(next_due_odometer);

-- Create function to automatically set organization_id
CREATE OR REPLACE FUNCTION set_parts_replacement_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get organization_id from the vehicle
  SELECT organization_id INTO NEW.organization_id
  FROM vehicles
  WHERE id = NEW.vehicle_id;
  
  -- Set created_by to current user
  NEW.created_by = auth.uid();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set organization_id
CREATE TRIGGER trigger_set_parts_replacement_organization_id
  BEFORE INSERT ON parts_replacements
  FOR EACH ROW
  EXECUTE FUNCTION set_parts_replacement_organization_id();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parts_replacement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER trigger_update_parts_replacement_updated_at
  BEFORE UPDATE ON parts_replacements
  FOR EACH ROW
  EXECUTE FUNCTION update_parts_replacement_updated_at();

-- Insert sample data for testing (optional)
-- This can be removed in production
INSERT INTO parts_replacements (vehicle_id, part_type, part_name, category, replacement_date, odometer_reading, cost, brand, warranty_months, downtime_hours, business_impact, compliance_risk, revenue_loss_per_day)
SELECT 
  v.id,
  'tyres_front',
  'Front Tyres',
  'Safety Critical',
  CURRENT_DATE - INTERVAL '6 months',
  v.current_odometer - 50000,
  7000,
  'MRF',
  12,
  4,
  'Steering control, Fuel economy -10%',
  'Insurance void if worn',
  5000
FROM vehicles v
WHERE v.organization_id IS NOT NULL
LIMIT 5;

INSERT INTO parts_replacements (vehicle_id, part_type, part_name, category, replacement_date, odometer_reading, cost, brand, warranty_months, downtime_hours, business_impact, compliance_risk, revenue_loss_per_day)
SELECT 
  v.id,
  'battery',
  'Main Battery',
  'Electrical',
  CURRENT_DATE - INTERVAL '3 months',
  v.current_odometer - 30000,
  6500,
  'Exide',
  18,
  2,
  'No-start, Stranded vehicle',
  'GPS/FASTag failure',
  5000
FROM vehicles v
WHERE v.organization_id IS NOT NULL
LIMIT 3;

INSERT INTO parts_replacements (vehicle_id, part_type, part_name, category, replacement_date, odometer_reading, cost, brand, warranty_months, downtime_hours, business_impact, compliance_risk, revenue_loss_per_day)
SELECT 
  v.id,
  'brake_pads',
  'Brake Pads',
  'Safety Critical',
  CURRENT_DATE - INTERVAL '2 months',
  v.current_odometer - 20000,
  3000,
  'Bosch',
  6,
  3,
  'Stopping distance +40%',
  'Safety audit failure',
  5000
FROM vehicles v
WHERE v.organization_id IS NOT NULL
LIMIT 3;
