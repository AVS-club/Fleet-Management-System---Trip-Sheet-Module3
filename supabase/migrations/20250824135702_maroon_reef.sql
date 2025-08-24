```sql
/*
  # Create fuel_stations table

  1. New Tables
    - `fuel_stations` - Stores information about fuel stations

  2. Security
    - Enable RLS on `fuel_stations` table
    - Add policies for authenticated users to manage their own fuel stations

  3. Functions & Triggers
    - `set_created_by()` trigger to automatically set `created_by` on insert
    - `set_updated_at()` trigger to automatically update `updated_at` on update
*/

-- Create fuel_stations table
CREATE TABLE public.fuel_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  fuel_types text[] DEFAULT '{}'::text[],
  prices jsonb DEFAULT '{}'::jsonb,
  google_place_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_fuel_stations_created_by ON public.fuel_stations(created_by);
CREATE INDEX idx_fuel_stations_name ON public.fuel_stations(name);

-- Enable RLS
ALTER TABLE public.fuel_stations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own fuel stations"
ON public.fuel_stations
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own fuel stations"
ON public.fuel_stations
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own fuel stations"
ON public.fuel_stations
FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own fuel stations"
ON public.fuel_stations
FOR DELETE USING (auth.uid() = created_by);

-- Apply the set_created_by trigger (assuming it's already defined in your database)
-- This trigger automatically sets the created_by column for new rows.
DROP TRIGGER IF EXISTS trg_set_created_by_fuel_stations ON public.fuel_stations;
CREATE TRIGGER trg_set_created_by_fuel_stations
BEFORE INSERT ON public.fuel_stations
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- Apply the set_updated_at trigger (assuming it's already defined in your database)
-- This trigger automatically updates the updated_at column on row changes.
DROP TRIGGER IF EXISTS trg_set_updated_at_fuel_stations ON public.fuel_stations;
CREATE TRIGGER trg_set_updated_at_fuel_stations
BEFORE UPDATE ON public.fuel_stations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```