/*
  # Add additional indexes for performance optimization

  1. Changes
    - Add composite index on trips for vehicle and date range queries
    - Add composite index on maintenance tasks for vehicle and status
    - Add index on material types name for faster lookups
    - Add index on destinations name for search
*/

-- Add composite index for trips filtering by vehicle and date range
CREATE INDEX idx_trips_vehicle_dates ON trips(vehicle_id, trip_start_date, trip_end_date);

-- Add composite index for maintenance tasks by vehicle and status
CREATE INDEX idx_maintenance_vehicle_status ON maintenance_tasks(vehicle_id, status);

-- Add index for material types name search
CREATE INDEX idx_material_types_name ON material_types(name);

-- Add index for destinations name search
CREATE INDEX idx_destinations_name ON destinations(name);