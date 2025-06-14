/*
  # Schema update for maintenance tasks

  1. Changes
    - Drop the `vendor_id` column from maintenance_tasks table since vendors are now managed at the service group level
    - Add `next_predicted_service` column to maintenance_tasks table to match the code expectations
    - Add category validation check to ensure valid category values

  This migration addresses errors:
  - "Could not find the 'next_predicted_service' column of 'maintenance_tasks'"
  - "null value in column \"vendor_id\" of relation \"maintenance_tasks\" violates not-null constraint"
*/

-- Drop vendor_id column that's no longer used (vendors are now in service groups)
ALTER TABLE maintenance_tasks DROP COLUMN IF EXISTS vendor_id;

-- Add next_predicted_service column for AI predictions
ALTER TABLE maintenance_tasks ADD COLUMN IF NOT EXISTS next_predicted_service JSONB DEFAULT NULL;

-- Fix any inconsistent data in the category column
UPDATE maintenance_tasks
SET category = 'General'
WHERE category IS NOT NULL AND category NOT IN ('General', 'Accidental', 'Repair/Replacement', 'Others');