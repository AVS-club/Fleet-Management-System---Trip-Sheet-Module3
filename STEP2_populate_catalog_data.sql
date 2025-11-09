-- ================================================================
-- STEP 2: Populate Maintenance Tasks Catalog with Default Tasks
-- ================================================================
-- Run this AFTER Step 1 completes successfully
-- This populates the catalog for all organizations
-- ================================================================

-- Insert Purchase Tasks for all organizations
INSERT INTO public.maintenance_tasks_catalog (task_category, task_name, is_category, active, organization_id)
SELECT 'Purchase Tasks', task_name, false, true, org.id
FROM public.organizations org
CROSS JOIN (VALUES
  ('Engine Oil Purchase'), ('Oil Filter Purchase'), ('Air Filter Purchase'), ('Fuel Filter Purchase'),
  ('Battery Purchase'), ('Tyre Purchase'), ('Brake Pad Purchase'), ('Brake Shoe Purchase'),
  ('Brake Disc Purchase'), ('Brake Drum Purchase'), ('Brake Oil Purchase'), ('Clutch Plate Purchase'),
  ('Clutch Assembly Purchase'), ('Coolant Purchase'), ('Radiator Hose Purchase'), ('Water Pump Purchase'),
  ('Thermostat Purchase'), ('Alternator Purchase'), ('Starter Motor Purchase'), ('Shock Absorber Purchase'),
  ('Spring Purchase'), ('Ball Joint Purchase'), ('Tie Rod End Purchase'), ('Wheel Bearing Purchase'),
  ('Spark Plug Purchase'), ('Glow Plug Purchase'), ('Timing Belt Purchase'), ('Drive Belt Purchase'),
  ('Windshield Wiper Purchase'), ('Light Bulb Purchase'), ('Fuse Purchase'), ('Parts Purchase')
) AS tasks(task_name);

-- Insert Labor & Service Tasks for all organizations
INSERT INTO public.maintenance_tasks_catalog (task_category, task_name, is_category, active, organization_id)
SELECT 'Labor & Service Tasks', task_name, false, true, org.id
FROM public.organizations org
CROSS JOIN (VALUES
  ('Engine Oil Change'), ('Oil Filter Replacement'), ('Air Filter Replacement'), ('Fuel Filter Replacement'),
  ('Battery Replacement'), ('Tyre Replacement'), ('Brake Pad Replacement'), ('Brake Shoe Replacement'),
  ('Brake Disc Replacement'), ('Brake Drum Replacement'), ('Brake Oil Top-up'), ('Clutch Plate Replacement'),
  ('Clutch Assembly Replacement'), ('Coolant Top-up'), ('Radiator Hose Replacement'), ('Water Pump Replacement'),
  ('Thermostat Replacement'), ('Alternator Replacement'), ('Starter Motor Replacement'), ('Shock Absorber Replacement'),
  ('Spring Replacement'), ('Ball Joint Replacement'), ('Tie Rod End Replacement'), ('Wheel Bearing Replacement'),
  ('Spark Plug Replacement'), ('Glow Plug Replacement'), ('Timing Belt Replacement'), ('Drive Belt Replacement'),
  ('Windshield Wiper Replacement'), ('Light Bulb Replacement'), ('Fuse Replacement'), ('General Inspection'),
  ('Wheel Alignment'), ('Wheel Balancing'), ('Tyre Rotation'), ('Brake Inspection'), ('Suspension Check'),
  ('Steering Check'), ('Exhaust Inspection'), ('Cooling System Check'), ('Engine Diagnostic'),
  ('Transmission Service'), ('Differential Service'), ('AC Service'), ('Electrical System Check'),
  ('Body & Paint Work'), ('Denting & Painting'), ('Rust Treatment'), ('Underbody Coating'),
  ('Interior Cleaning'), ('Engine Wash'), ('Full Vehicle Service'), ('Pre-Purchase Inspection'),
  ('Emission Test'), ('Fitness Certificate Renewal'), ('Insurance Claim Work'), ('Accident Repair'),
  ('Engine Overhaul'), ('Gearbox Overhaul'), ('Clutch Overhaul')
) AS tasks(task_name);

-- Verify the data was inserted
SELECT
  COUNT(*) as total_tasks,
  COUNT(DISTINCT organization_id) as organizations,
  COUNT(DISTINCT task_category) as categories
FROM public.maintenance_tasks_catalog;
