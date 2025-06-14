/*
  # Add Reminder System Tables
  
  1. New Enums
    - `reminder_contact_mode` - How contacts prefer to be notified (SMS, Email, Both)
    - `reminder_assigned_type` - Types of reminders a contact can be assigned to
  
  2. New Tables
    - `reminder_contacts` - People who receive reminders
      - Contact details (name, position, contact info)
      - Notification preferences
      - Assignment to reminder types
    - `reminder_templates` - Configuration for different reminder types
      - Timing rules (days before expiry)
      - Repeat settings
      - Default contact assignment
  
  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    
  4. Triggers
    - Add updated_at triggers for both tables
*/

-- Create enum types
CREATE TYPE reminder_contact_mode AS ENUM ('SMS', 'Email', 'Both');
CREATE TYPE reminder_assigned_type AS ENUM ('Insurance', 'Fitness', 'Pollution', 'Tax', 'Permit', 'Service Due');

-- Create reminder_contacts table
CREATE TABLE reminder_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  position text NOT NULL,
  duty text,
  phone_number text NOT NULL,
  email text,
  preferred_contact_mode reminder_contact_mode NOT NULL,
  is_active boolean DEFAULT true,
  photo_url text,
  assigned_types reminder_assigned_type[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reminder_templates table
CREATE TABLE reminder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL,
  default_days_before integer NOT NULL,
  repeat boolean DEFAULT false,
  default_contact_id uuid REFERENCES reminder_contacts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE reminder_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reminder_contacts
CREATE POLICY "Enable full access for authenticated users on reminder_contacts"
ON reminder_contacts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create RLS policies for reminder_templates
CREATE POLICY "Enable full access for authenticated users on reminder_templates"
ON reminder_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add updated_at triggers to new tables
CREATE TRIGGER set_timestamp_reminder_contacts
BEFORE UPDATE ON reminder_contacts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_reminder_templates
BEFORE UPDATE ON reminder_templates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();