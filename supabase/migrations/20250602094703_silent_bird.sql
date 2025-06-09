/*
  # Add Fuel Stations Table

  1. New Tables
    - `fuel_stations`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `address` (text)
      - `city` (text)
      - `state` (state_type)
      - `pincode` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `fuel_types` (text array)
      - `preferred` (boolean)
      - `active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Relationship Changes
    - Add `fuel_station_id` to `trips` table as a foreign key reference
  
  3. Security
    - Enable RLS on `fuel_stations` table
    - Add policy for authenticated users to read fuel stations
*/

-- Create fuel_stations table
CREATE TABLE fuel_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  state state_type,
  pincode text,
  latitude decimal(10,8),
  longitude decimal(11,8),
  fuel_types text[],
  preferred boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add fuel_station_id to trips table
ALTER TABLE trips ADD COLUMN fuel_station_id uuid REFERENCES fuel_stations(id);

-- Enable RLS
ALTER TABLE fuel_stations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON fuel_stations
  FOR SELECT TO authenticated USING (true);

-- Add indexes for better query performance
CREATE INDEX idx_fuel_stations_name ON fuel_stations(name);
CREATE INDEX idx_fuel_stations_location ON fuel_stations(latitude, longitude);
CREATE INDEX idx_trips_fuel_station ON trips(fuel_station_id);