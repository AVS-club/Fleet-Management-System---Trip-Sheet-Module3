-- Fix Trip Trigger Column Issues
-- The trigger functions are trying to access columns that don't exist in the trips table

-- Drop the problematic trigger first
DROP TRIGGER IF EXISTS prevent_concurrent_trips ON trips;

-- Fix the check_trip_overlap function to use correct column names
CREATE OR REPLACE FUNCTION check_trip_overlap()
RETURNS TRIGGER AS $$
DECLARE
    driver_conflict RECORD;
    vehicle_conflict RECORD;
    error_message TEXT;
BEGIN
    -- Check for vehicle conflicts (same vehicle, overlapping time)
    IF NEW.vehicle_id IS NOT NULL THEN
        SELECT t.*, v.registration_number as vehicle_registration
        INTO vehicle_conflict
        FROM trips t
        JOIN vehicles v ON t.vehicle_id = v.id
        WHERE t.vehicle_id = NEW.vehicle_id
            AND t.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND (
                (NEW.trip_start_date >= t.trip_start_date AND NEW.trip_start_date < t.trip_end_date)
                OR (NEW.trip_end_date > t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date)
                OR (NEW.trip_start_date <= t.trip_start_date AND NEW.trip_end_date >= t.trip_end_date)
            )
        LIMIT 1;

        IF FOUND THEN
            error_message := format(
                'Vehicle conflict: Vehicle %s is already on trip %s from %s to %s',
                vehicle_conflict.vehicle_registration,
                vehicle_conflict.trip_serial_number,
                TO_CHAR(vehicle_conflict.trip_start_date, 'DD-MM-YYYY HH24:MI'),
                TO_CHAR(vehicle_conflict.trip_end_date, 'DD-MM-YYYY HH24:MI')
            );
            RAISE EXCEPTION '%', error_message;
        END IF;
    END IF;

    -- Check for driver conflicts (same driver, overlapping time)
    IF NEW.driver_id IS NOT NULL THEN
        SELECT t.*, d.name as driver_name
        INTO driver_conflict
        FROM trips t
        JOIN drivers d ON t.driver_id = d.id
        WHERE t.driver_id = NEW.driver_id
            AND t.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND (
                (NEW.trip_start_date >= t.trip_start_date AND NEW.trip_start_date < t.trip_end_date)
                OR (NEW.trip_end_date > t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date)
                OR (NEW.trip_start_date <= t.trip_start_date AND NEW.trip_end_date >= t.trip_end_date)
            )
        LIMIT 1;

        IF FOUND THEN
            error_message := format(
                'Driver conflict: %s is already on trip %s from %s to %s',
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

-- Recreate the trigger
CREATE TRIGGER prevent_concurrent_trips
    BEFORE INSERT OR UPDATE OF trip_start_date, trip_end_date, vehicle_id, driver_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_overlap();

-- Also fix the find_overlapping_trips function if it has similar issues
CREATE OR REPLACE FUNCTION find_overlapping_trips(
    p_vehicle_id UUID DEFAULT NULL,
    p_driver_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    trip1_id UUID,
    trip1_serial TEXT,
    trip1_start TIMESTAMP,
    trip1_end TIMESTAMP,
    trip2_id UUID,
    trip2_serial TEXT,
    trip2_start TIMESTAMP,
    trip2_end TIMESTAMP,
    overlap_type TEXT,
    vehicle_registration TEXT,
    driver_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t1.id as trip1_id,
        t1.trip_serial_number as trip1_serial,
        t1.trip_start_date as trip1_start,
        t1.trip_end_date as trip1_end,
        t2.id as trip2_id,
        t2.trip_serial_number as trip2_serial,
        t2.trip_start_date as trip2_start,
        t2.trip_end_date as trip2_end,
        CASE 
            WHEN t1.vehicle_id = t2.vehicle_id AND t1.driver_id = t2.driver_id THEN 'vehicle_and_driver'
            WHEN t1.vehicle_id = t2.vehicle_id THEN 'vehicle_only'
            WHEN t1.driver_id = t2.driver_id THEN 'driver_only'
            ELSE 'unknown'
        END as overlap_type,
        v1.registration_number as vehicle_registration,
        d1.name as driver_name
    FROM trips t1
    JOIN trips t2 ON t1.id != t2.id
    JOIN vehicles v1 ON t1.vehicle_id = v1.id
    JOIN drivers d1 ON t1.driver_id = d1.id
    WHERE 
        (p_vehicle_id IS NULL OR t1.vehicle_id = p_vehicle_id)
        AND (p_driver_id IS NULL OR t1.driver_id = p_driver_id)
        AND (p_date_from IS NULL OR t1.trip_start_date >= p_date_from)
        AND (p_date_to IS NULL OR t1.trip_start_date <= p_date_to)
        AND (
            (t1.trip_start_date >= t2.trip_start_date AND t1.trip_start_date < t2.trip_end_date)
            OR (t1.trip_end_date > t2.trip_start_date AND t1.trip_end_date <= t2.trip_end_date)
            OR (t1.trip_start_date <= t2.trip_start_date AND t1.trip_end_date >= t2.trip_end_date)
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
