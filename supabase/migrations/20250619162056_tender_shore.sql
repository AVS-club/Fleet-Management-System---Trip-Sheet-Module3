/*
  # Add Google Places fields to destinations table
  
  1. Changes
    - Add place_id column to store Google Places unique identifier
    - Add formatted_address column to store the full address from Google Places
    - These fields will improve location accuracy and provide better user experience
*/

-- Add place_id column to destinations table
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS place_id text;

-- Add formatted_address column to destinations table
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS formatted_address text;

-- Add comment explaining the purpose of these fields
COMMENT ON COLUMN destinations.place_id IS 'Google Places unique identifier for the location';
COMMENT ON COLUMN destinations.formatted_address IS 'Full formatted address from Google Places API';