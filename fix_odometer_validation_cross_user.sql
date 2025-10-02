-- 🔧 FIX: Odometer Validation for Cross-User Trips
-- This fixes the issue where odometer validation only checks trips from the same user
-- but should check ALL trips for the same vehicle within the organization

-- Drop the existing trigger
DROP TRIGGER IF EXISTS enhanced_odometer_continuity_check ON trips;

-- Create the fixed validation function
CREATE OR REPLACE FUNCTION validate_odometer_continuity_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    prev_trip RECORD;
    next_trip RECORD;
    gap_km INTEGER;
    warning_message TEXT;
    validation_data JSONB;
    current_user_org_id UUID;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Skip if odometer readings are not set
    IF NEW.start_km IS NULL OR NEW.end_km IS NULL THEN
        RETURN NEW;
    END IF;

    -- First validate that end_km > start_km for the current trip
    IF NEW.end_km <= NEW.start_km THEN
        RAISE EXCEPTION 'Invalid odometer reading for trip %: End KM (%) must be greater than Start KM (%). Distance cannot be zero or negative.',
            NEW.trip_serial_number, NEW.end_km, NEW.start_km;
    END IF;

    -- Get the current user's organization ID
    SELECT organization_id INTO current_user_org_id
    FROM organization_users
    WHERE user_id = NEW.created_by
    LIMIT 1;

    -- Find the previous trip for this vehicle (most recent trip before this one)
    -- ✅ FIXED: Check ALL trips for the vehicle, not just from the same user
    -- ✅ FIXED: Only check trips from users in the same organization
    SELECT t.* INTO prev_trip
    FROM trips t
    JOIN organization_users ou ON t.created_by = ou.user_id
    WHERE t.vehicle_id = NEW.vehicle_id
        AND t.id != COALESCE(NEW.id, gen_random_uuid())
        AND t.trip_end_date < NEW.trip_start_date
        AND t.deleted_at IS NULL
        AND ou.organization_id = current_user_org_id  -- ✅ Only same organization
    ORDER BY t.trip_end_date DESC
    LIMIT 1;

    -- If a previous trip exists, validate continuity
    IF FOUND THEN
        gap_km := NEW.start_km - prev_trip.end_km;

        -- Check for negative gap (odometer went backwards) - CRITICAL ERROR
        IF gap_km < 0 THEN
            RAISE EXCEPTION E'ODOMETER CONTINUITY VIOLATION!\n'
                'Trip: %\n'
                'Start KM: % cannot be less than previous trip end KM: %\n'
                'Previous trip: % ended on %\n'
                'Gap: % km (negative - odometer went backwards)\n'
                'Action required: Correct the odometer readings to maintain continuity',
                NEW.trip_serial_number,
                NEW.start_km, 
                prev_trip.end_km, 
                prev_trip.trip_serial_number, 
                TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                gap_km;
        END IF;

        -- Check for exact continuity (gap = 0) - IDEAL
        IF gap_km = 0 THEN
            -- Log perfect continuity
            validation_data := jsonb_build_object(
                'status', 'perfect_continuity',
                'gap_km', 0,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'previous_end_km', prev_trip.end_km,
                'current_start_km', NEW.start_km
            );
        END IF;

        -- Check for small gap (1-10km) - ACCEPTABLE
        IF gap_km > 0 AND gap_km <= 10 THEN
            validation_data := jsonb_build_object(
                'status', 'acceptable_gap',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'previous_end_km', prev_trip.end_km,
                'current_start_km', NEW.start_km
            );
        END IF;

        -- Check for medium gap (11-50km) - WARNING
        IF gap_km > 10 AND gap_km <= 50 THEN
            warning_message := format(
                'Medium odometer gap detected: %s km between trips. Previous trip %s ended at %s km on %s. Current trip starts at %s km.',
                gap_km,
                prev_trip.trip_serial_number,
                prev_trip.end_km,
                TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                NEW.start_km
            );
            
            validation_data := jsonb_build_object(
                'status', 'medium_gap_warning',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'previous_end_km', prev_trip.end_km,
                'current_start_km', NEW.start_km,
                'warning', warning_message
            );
            
            RAISE NOTICE '%', warning_message;
        END IF;

        -- Check for large gap (>50km) - WARNING BUT ALLOW
        IF gap_km > 50 THEN
            warning_message := format(
                'Large odometer gap detected: %s km between trips. Previous trip %s ended at %s km on %s. Current trip starts at %s km. This may indicate maintenance, personal use, or data entry error.',
                gap_km,
                prev_trip.trip_serial_number,
                prev_trip.end_km,
                TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                NEW.start_km
            );
            
            validation_data := jsonb_build_object(
                'status', 'large_gap_warning',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'previous_end_km', prev_trip.end_km,
                'current_start_km', NEW.start_km,
                'warning', warning_message
            );
            
            RAISE NOTICE '%', warning_message;
        END IF;
    END IF;

    -- Also check for future trips that might be affected
    SELECT t.* INTO next_trip
    FROM trips t
    JOIN organization_users ou ON t.created_by = ou.user_id
    WHERE t.vehicle_id = NEW.vehicle_id
        AND t.id != COALESCE(NEW.id, gen_random_uuid())
        AND t.trip_start_date > NEW.trip_end_date
        AND t.deleted_at IS NULL
        AND ou.organization_id = current_user_org_id
    ORDER BY t.trip_start_date ASC
    LIMIT 1;

    -- If there's a future trip, check if our end_km is reasonable
    IF FOUND THEN
        gap_km := next_trip.start_km - NEW.end_km;
        
        IF gap_km < 0 THEN
            RAISE NOTICE 'Warning: This trip ends at % km, but future trip % starts at % km (gap: % km). This may cause validation issues for the future trip.',
                NEW.end_km, next_trip.trip_serial_number, next_trip.start_km, gap_km;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER enhanced_odometer_continuity_check
    BEFORE INSERT OR UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_odometer_continuity_enhanced();

-- Add a comment explaining the fix
COMMENT ON FUNCTION validate_odometer_continuity_enhanced() IS 
'Enhanced odometer continuity validation that checks trips across all users within the same organization, not just the same user. This ensures proper odometer continuity when multiple users (owner, data entry, etc.) create trips for the same vehicle.';

-- Test the fix by checking if the function exists and is properly configured
SELECT 
    proname as function_name,
    prokind as function_type,
    proisstrict as is_strict,
    provolatile as volatility
FROM pg_proc 
WHERE proname = 'validate_odometer_continuity_enhanced';

-- Check if the trigger is properly created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trips' 
    AND trigger_name = 'enhanced_odometer_continuity_check';
