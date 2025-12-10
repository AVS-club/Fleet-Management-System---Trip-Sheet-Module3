-- Migration: Prevent Vehicle Changes on Existing Trips
-- Purpose: Maintains data integrity by preventing vehicle changes that would cause:
--          1. Serial number mismatches (serial contains old vehicle digits)
--          2. Odometer continuity violations (odometer readings from wrong vehicle)
--          3. Mileage calculation errors (comparing odometers across different vehicles)
--
-- Date: 2025-01-06
-- Author: Auto Vital Solution - Fleet Management System

-- Create function to prevent vehicle changes on existing trips
CREATE OR REPLACE FUNCTION prevent_vehicle_change_on_trips()
RETURNS TRIGGER AS $$
DECLARE
    original_vehicle_id UUID;
    original_registration TEXT;
    new_registration TEXT;
BEGIN
    -- Only apply this check on UPDATE operations
    IF (TG_OP = 'UPDATE') THEN
        -- Check if vehicle_id is being changed
        IF OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
            -- Get original vehicle registration
            SELECT registration_number INTO original_registration
            FROM vehicles
            WHERE id = OLD.vehicle_id;
            
            -- Get new vehicle registration
            SELECT registration_number INTO new_registration
            FROM vehicles
            WHERE id = NEW.vehicle_id;
            
            -- Raise exception to prevent the change
            RAISE EXCEPTION E'VEHICLE CHANGE NOT ALLOWED!\n\n'
                'Trip: % (ID: %)\n'
                'Original Vehicle: % (ID: %)\n'
                'Attempted New Vehicle: % (ID: %)\n\n'
                'Changing the vehicle on an existing trip would cause:\n'
                '  • Serial number mismatch (trip serial contains original vehicle digits)\n'
                '  • Odometer continuity violations (comparing odometers across different vehicles)\n'
                '  • Incorrect mileage calculations (fuel efficiency based on wrong vehicle history)\n\n'
                'Action Required:\n'
                '  To change the vehicle, delete this trip and create a new one with the correct vehicle.\n'
                '  Contact your administrator if you need assistance.',
                NEW.trip_serial_number,
                NEW.id,
                original_registration,
                OLD.vehicle_id,
                new_registration,
                NEW.vehicle_id
            USING ERRCODE = 'integrity_constraint_violation',
                  HINT = 'Delete the trip and create a new one with the correct vehicle assignment.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS prevent_vehicle_change_trigger ON trips;

-- Create trigger to enforce the vehicle change prevention
CREATE TRIGGER prevent_vehicle_change_trigger
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION prevent_vehicle_change_on_trips();

-- Add comment explaining the trigger
COMMENT ON FUNCTION prevent_vehicle_change_on_trips() IS 
'Prevents vehicle changes on existing trips to maintain data integrity. '
'Vehicle changes would cause serial number mismatches (serial contains vehicle digits), '
'odometer continuity violations (comparing odometers across vehicles), and '
'incorrect mileage calculations (fuel efficiency based on wrong vehicle history).';

COMMENT ON TRIGGER prevent_vehicle_change_trigger ON trips IS
'Enforces vehicle immutability on existing trips to protect data integrity. '
'Users must delete and recreate trips if the vehicle assignment was incorrect.';

-- Verify the trigger was created successfully
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trips' 
    AND trigger_name = 'prevent_vehicle_change_trigger';












