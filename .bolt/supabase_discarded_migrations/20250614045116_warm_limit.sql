-- First, check if the maintenance_type enum exists, create it if not
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
    CREATE TYPE maintenance_type AS ENUM (
      'general_scheduled_service',
      'wear_and_tear_replacement_repairs',
      'accidental',
      'others'
    );
  END IF;
END $$;

-- Try to add values to the enum if it already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
    -- We need to use EXECUTE for dynamic SQL to add values conditionally
    -- Check each value and add it if it doesn't exist
    PERFORM 1 FROM pg_enum WHERE enumtypid = 'maintenance_type'::regtype AND enumlabel = 'general_scheduled_service';
    IF NOT FOUND THEN
      EXECUTE 'ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS ''general_scheduled_service''';
    END IF;
    
    PERFORM 1 FROM pg_enum WHERE enumtypid = 'maintenance_type'::regtype AND enumlabel = 'wear_and_tear_replacement_repairs';
    IF NOT FOUND THEN
      EXECUTE 'ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS ''wear_and_tear_replacement_repairs''';
    END IF;
    
    PERFORM 1 FROM pg_enum WHERE enumtypid = 'maintenance_type'::regtype AND enumlabel = 'accidental';
    IF NOT FOUND THEN
      EXECUTE 'ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS ''accidental''';
    END IF;
    
    PERFORM 1 FROM pg_enum WHERE enumtypid = 'maintenance_type'::regtype AND enumlabel = 'others';
    IF NOT FOUND THEN
      EXECUTE 'ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS ''others''';
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding enum values: %', SQLERRM;
END $$;

-- Check if the maintenance_tasks table exists and update task_type column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'maintenance_tasks'
  ) THEN
    -- Table exists, check if task_type column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'maintenance_tasks'
      AND column_name = 'task_type'
    ) THEN
      -- Create a temporary function to convert old values to new values
      CREATE OR REPLACE FUNCTION temp_convert_task_type(old_type TEXT) 
      RETURNS TEXT AS $$
      BEGIN
        CASE old_type
          WHEN 'general_scheduled' THEN RETURN 'general_scheduled_service';
          WHEN 'emergency_breakdown' THEN RETURN 'wear_and_tear_replacement_repairs';
          WHEN 'driver_damage' THEN RETURN 'accidental';
          WHEN 'warranty_claim' THEN RETURN 'others';
          ELSE RETURN 'others';
        END CASE;
      END;
      $$ LANGUAGE plpgsql;

      -- Temporarily alter the column to text type to allow the conversion
      ALTER TABLE maintenance_tasks 
        ALTER COLUMN task_type TYPE TEXT;

      -- Update existing data to use new values
      UPDATE maintenance_tasks
      SET task_type = temp_convert_task_type(task_type);

      -- Change the column type to use the maintenance_type enum
      ALTER TABLE maintenance_tasks 
        ALTER COLUMN task_type TYPE maintenance_type 
        USING task_type::maintenance_type;

      -- Drop the temporary function
      DROP FUNCTION temp_convert_task_type;
    END IF;
  END IF;
END $$;