-- Fix Vehicle Conflict Detection in Trip Creation
-- The current trigger is too strict and prevents legitimate trip creation

-- Drop the current trigger
DROP TRIGGER IF EXISTS prevent_concurrent_trips ON trips;

-- Create a more flexible conflict detection function
CREATE OR REPLACE FUNCTION check_trip_overlap()
RETURNS TRIGGER AS $$
DECLARE
    vehicle_conflict RECORD;
    driver_conflict RECORD;
    error_message TEXT;
    conflict_count INTEGER;
BEGIN
    -- Only check for conflicts if we have valid data
    IF NEW.vehicle_id IS NULL OR NEW.driver_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check for vehicle conflicts with more flexible logic
    -- Only flag conflicts if trips have significant time overlap (more than 1 hour)
    SELECT COUNT(*)
    INTO conflict_count
    FROM trips t
    WHERE t.vehicle_id = NEW.vehicle_id
        AND t.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND t.trip_start_date IS NOT NULL
        AND t.trip_end_date IS NOT NULL
        AND NEW.trip_start_date IS NOT NULL
        AND NEW.trip_end_date IS NOT NULL
        AND (
            -- Check for significant overlap (more than 1 hour)
            (NEW.trip_start_date < t.trip_end_date - INTERVAL '1 hour' 
             AND NEW.trip_end_date > t.trip_start_date + INTERVAL '1 hour')
        );

    IF conflict_count > 0 THEN
        -- Get details of the conflicting trip
        SELECT t.*, v.registration_number as vehicle_registration
        INTO vehicle_conflict
        FROM trips t
        JOIN vehicles v ON t.vehicle_id = v.id
        WHERE t.vehicle_id = NEW.vehicle_id
            AND t.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND t.trip_start_date IS NOT NULL
            AND t.trip_end_date IS NOT NULL
            AND NEW.trip_start_date IS NOT NULL
            AND NEW.trip_end_date IS NOT NULL
            AND (
                (NEW.trip_start_date < t.trip_end_date - INTERVAL '1 hour' 
                 AND NEW.trip_end_date > t.trip_start_date + INTERVAL '1 hour')
            )
        LIMIT 1;

        IF FOUND THEN
            error_message := format(
                'Vehicle conflict: Vehicle %s is already on trip %s from %s to %s. Please check trip times.',
                vehicle_conflict.vehicle_registration,
                vehicle_conflict.trip_serial_number,
                TO_CHAR(vehicle_conflict.trip_start_date, 'DD-MM-YYYY HH24:MI'),
                TO_CHAR(vehicle_conflict.trip_end_date, 'DD-MM-YYYY HH24:MI')
            );
            RAISE EXCEPTION '%', error_message;
        END IF;
    END IF;

    -- Check for driver conflicts with more flexible logic
    SELECT COUNT(*)
    INTO conflict_count
    FROM trips t
    WHERE t.driver_id = NEW.driver_id
        AND t.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND t.trip_start_date IS NOT NULL
        AND t.trip_end_date IS NOT NULL
        AND NEW.trip_start_date IS NOT NULL
        AND NEW.trip_end_date IS NOT NULL
        AND (
            -- Check for significant overlap (more than 1 hour)
            (NEW.trip_start_date < t.trip_end_date - INTERVAL '1 hour' 
             AND NEW.trip_end_date > t.trip_start_date + INTERVAL '1 hour')
        );

    IF conflict_count > 0 THEN
        -- Get details of the conflicting trip
        SELECT t.*, d.name as driver_name
        INTO driver_conflict
        FROM trips t
        JOIN drivers d ON t.driver_id = d.id
        WHERE t.driver_id = NEW.driver_id
            AND t.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND t.trip_start_date IS NOT NULL
            AND t.trip_end_date IS NOT NULL
            AND NEW.trip_start_date IS NOT NULL
            AND NEW.trip_end_date IS NOT NULL
            AND (
                (NEW.trip_start_date < t.trip_end_date - INTERVAL '1 hour' 
                 AND NEW.trip_end_date > t.trip_start_date + INTERVAL '1 hour')
            )
        LIMIT 1;

        IF FOUND THEN
            error_message := format(
                'Driver conflict: %s is already on trip %s from %s to %s. Please check trip times.',
                driver_conflict.driver_name,
                driver_conflict.trip_serial_number,
                TO_CHAR(driver_conflict.trip_start_date, 'DD-MM-YYYY HH24:MI'),
                TO_CHAR(driver_conflict.trip_end_date, 'DD-MM-YYYY HH24:MI')
            );
            RAISE EXCEPTION '%', error_message;
        END IF;
    END IF;

    -- Log successful validation to audit trail if function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
        PERFORM log_audit_trail(
            'overlap_validation',
            'trip_data',
            'trip',
            NEW.id::TEXT,
            format('Trip %s validated', NEW.trip_serial_number),
            'validated',
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'driver_id', NEW.driver_id,
                'trip_start', NEW.trip_start_date,
                'trip_end', NEW.trip_end_date
            ),
            jsonb_build_object('validation', 'no_conflicts_found'),
            'info'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the updated function
CREATE TRIGGER prevent_concurrent_trips
    BEFORE INSERT OR UPDATE OF trip_start_date, trip_end_date, vehicle_id, driver_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_overlap();

-- Alternative: Create a function to allow manual override of conflicts
CREATE OR REPLACE FUNCTION create_trip_with_override(
    p_trip_data JSONB,
    p_override_conflicts BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
    new_trip_id UUID;
    conflict_count INTEGER;
BEGIN
    -- If override is enabled, temporarily disable the trigger
    IF p_override_conflicts THEN
        ALTER TABLE trips DISABLE TRIGGER prevent_concurrent_trips;
    END IF;

    -- Insert the trip
    INSERT INTO trips (
        vehicle_id, driver_id, trip_start_date, trip_end_date,
        start_km, end_km, trip_serial_number, warehouse_id,
        destinations, destination_names, refueling_done,
        fuel_quantity, fuel_rate_per_liter, total_fuel_cost,
        unloading_expense, driver_expense, road_rto_expense,
        breakdown_expense, miscellaneous_expense, total_road_expenses,
        gross_weight, is_return_trip, remarks, created_by, organization_id
    ) VALUES (
        (p_trip_data->>'vehicle_id')::UUID,
        (p_trip_data->>'driver_id')::UUID,
        (p_trip_data->>'trip_start_date')::TIMESTAMPTZ,
        (p_trip_data->>'trip_end_date')::TIMESTAMPTZ,
        (p_trip_data->>'start_km')::INTEGER,
        (p_trip_data->>'end_km')::INTEGER,
        p_trip_data->>'trip_serial_number',
        (p_trip_data->>'warehouse_id')::UUID,
        ARRAY(SELECT jsonb_array_elements_text(p_trip_data->'destinations')),
        ARRAY(SELECT jsonb_array_elements_text(p_trip_data->'destination_names')),
        (p_trip_data->>'refueling_done')::BOOLEAN,
        (p_trip_data->>'fuel_quantity')::DECIMAL,
        (p_trip_data->>'fuel_rate_per_liter')::DECIMAL,
        (p_trip_data->>'total_fuel_cost')::DECIMAL,
        (p_trip_data->>'unloading_expense')::DECIMAL,
        (p_trip_data->>'driver_expense')::DECIMAL,
        (p_trip_data->>'road_rto_expense')::DECIMAL,
        (p_trip_data->>'breakdown_expense')::DECIMAL,
        (p_trip_data->>'miscellaneous_expense')::DECIMAL,
        (p_trip_data->>'total_road_expenses')::DECIMAL,
        (p_trip_data->>'gross_weight')::DECIMAL,
        (p_trip_data->>'is_return_trip')::BOOLEAN,
        p_trip_data->>'remarks',
        (p_trip_data->>'created_by')::UUID,
        (p_trip_data->>'organization_id')::UUID
    ) RETURNING id INTO new_trip_id;

    -- Re-enable the trigger if it was disabled
    IF p_override_conflicts THEN
        ALTER TABLE trips ENABLE TRIGGER prevent_concurrent_trips;
    END IF;

    RETURN new_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
