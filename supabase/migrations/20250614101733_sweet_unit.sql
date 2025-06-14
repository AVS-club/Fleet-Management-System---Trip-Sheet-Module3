/*
  # Add Vehicle Reminder Fields

  1. New Columns
    - Add reminder-related columns to the vehicles table for each document type:
      - Insurance
      - Fitness
      - PUC (Pollution)
      - Tax
      - Permit
      - Service
    
  2. Changes
    - For each document type, add:
      - A boolean flag to enable/disable reminders
      - A contact ID reference to reminder_contacts
      - A days_before override value
*/

-- Add reminder fields for Insurance
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'remind_insurance'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN remind_insurance boolean DEFAULT false;
    ALTER TABLE vehicles ADD COLUMN insurance_reminder_contact_id uuid REFERENCES reminder_contacts(id);
    ALTER TABLE vehicles ADD COLUMN insurance_reminder_days_before integer;
  END IF;
END $$;

-- Add reminder fields for Fitness
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'remind_fitness'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN remind_fitness boolean DEFAULT false;
    ALTER TABLE vehicles ADD COLUMN fitness_reminder_contact_id uuid REFERENCES reminder_contacts(id);
    ALTER TABLE vehicles ADD COLUMN fitness_reminder_days_before integer;
  END IF;
END $$;

-- Add reminder fields for PUC (Pollution)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'remind_puc'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN remind_puc boolean DEFAULT false;
    ALTER TABLE vehicles ADD COLUMN puc_reminder_contact_id uuid REFERENCES reminder_contacts(id);
    ALTER TABLE vehicles ADD COLUMN puc_reminder_days_before integer;
  END IF;
END $$;

-- Add reminder fields for Tax
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'remind_tax'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN remind_tax boolean DEFAULT false;
    ALTER TABLE vehicles ADD COLUMN tax_reminder_contact_id uuid REFERENCES reminder_contacts(id);
    ALTER TABLE vehicles ADD COLUMN tax_reminder_days_before integer;
  END IF;
END $$;

-- Add reminder fields for Permit
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'remind_permit'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN remind_permit boolean DEFAULT false;
    ALTER TABLE vehicles ADD COLUMN permit_reminder_contact_id uuid REFERENCES reminder_contacts(id);
    ALTER TABLE vehicles ADD COLUMN permit_reminder_days_before integer;
  END IF;
END $$;

-- Add reminder fields for Service Due
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'remind_service'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN remind_service boolean DEFAULT false;
    ALTER TABLE vehicles ADD COLUMN service_reminder_contact_id uuid REFERENCES reminder_contacts(id);
    ALTER TABLE vehicles ADD COLUMN service_reminder_days_before integer;
    ALTER TABLE vehicles ADD COLUMN service_reminder_km integer;
  END IF;
END $$;

-- Add comment to explain the purpose of these fields
COMMENT ON COLUMN vehicles.remind_insurance IS 'Flag to enable/disable insurance expiry reminders';
COMMENT ON COLUMN vehicles.insurance_reminder_contact_id IS 'Contact to notify for insurance expiry';
COMMENT ON COLUMN vehicles.insurance_reminder_days_before IS 'Days before insurance expiry to send reminder (overrides template)';

COMMENT ON COLUMN vehicles.remind_fitness IS 'Flag to enable/disable fitness certificate expiry reminders';
COMMENT ON COLUMN vehicles.fitness_reminder_contact_id IS 'Contact to notify for fitness certificate expiry';
COMMENT ON COLUMN vehicles.fitness_reminder_days_before IS 'Days before fitness expiry to send reminder (overrides template)';

COMMENT ON COLUMN vehicles.remind_puc IS 'Flag to enable/disable pollution certificate expiry reminders';
COMMENT ON COLUMN vehicles.puc_reminder_contact_id IS 'Contact to notify for pollution certificate expiry';
COMMENT ON COLUMN vehicles.puc_reminder_days_before IS 'Days before pollution certificate expiry to send reminder (overrides template)';

COMMENT ON COLUMN vehicles.remind_tax IS 'Flag to enable/disable tax expiry reminders';
COMMENT ON COLUMN vehicles.tax_reminder_contact_id IS 'Contact to notify for tax expiry';
COMMENT ON COLUMN vehicles.tax_reminder_days_before IS 'Days before tax expiry to send reminder (overrides template)';

COMMENT ON COLUMN vehicles.remind_permit IS 'Flag to enable/disable permit expiry reminders';
COMMENT ON COLUMN vehicles.permit_reminder_contact_id IS 'Contact to notify for permit expiry';
COMMENT ON COLUMN vehicles.permit_reminder_days_before IS 'Days before permit expiry to send reminder (overrides template)';

COMMENT ON COLUMN vehicles.remind_service IS 'Flag to enable/disable service due reminders';
COMMENT ON COLUMN vehicles.service_reminder_contact_id IS 'Contact to notify for service due';
COMMENT ON COLUMN vehicles.service_reminder_days_before IS 'Days before service is due to send reminder (overrides template)';
COMMENT ON COLUMN vehicles.service_reminder_km IS 'Kilometers before service is due to send reminder';