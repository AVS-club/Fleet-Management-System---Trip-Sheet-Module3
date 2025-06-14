/*
  # Add is_global column to reminder_contacts table

  1. Changes
    - Add is_global boolean column to reminder_contacts table with default value of false
    - This column indicates whether a contact receives all reminders regardless of category
*/

-- Add is_global column to reminder_contacts table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminder_contacts' AND column_name = 'is_global'
  ) THEN
    ALTER TABLE reminder_contacts ADD COLUMN is_global boolean DEFAULT false;
  END IF;
END $$;