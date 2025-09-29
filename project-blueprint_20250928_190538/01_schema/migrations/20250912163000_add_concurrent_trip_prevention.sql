-- Fix 2: Concurrent Trip Prevention
-- Prevents overlapping trips for the same vehicle or driver

-- Function to check for trip overlaps
CREATE OR REPLACE FUNCTION check_trip_overlap()
RETURNS TRIGGER AS $$
DECLARE
    vehicle_conflict RECORD;
    driver_conflict RECORD;
    error_message TEXT;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Skip if dates are not set
    IF NEW.trip_start_date IS NULL OR NEW.trip_end_date IS NULL THEN
        RETURN NEW;
    END IF;

    -- Validate that end date is after start date
    IF NEW.trip_end_date <= NEW.trip_start_date THEN
        RAISE EXCEPTION 'Trip end date (%) must be after start date (%)',
            TO_CHAR(NEW.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            TO_CHAR(NEW.trip_start_date, 'DD-MM-YYYY HH24:MI');
    END IF;

    -- Check for vehicle conflicts (same vehicle on multiple trips)
    SELECT 
        t.id,
        t.trip_serial_number,
        t.trip_start_date,
        t.trip_end_date,
        t.driver_name
    INTO vehicle_conflict
    FROM trips t
    WHERE t.vehicle_id = NEW.vehicle_id
        AND t.id != COALESCE(NEW.id, gen_random_uuid())
        AND t.deleted_at IS NULL
        AND t.created_by = NEW.created_by
        AND (
            -- Check if new trip overlaps with existing trip
            (NEW.trip_start_date >= t.trip_start_date AND NEW.trip_start_date < t.trip_end_date)
            OR (NEW.trip_end_date > t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date)
            OR (NEW.trip_start_date <= t.trip_start_date AND NEW.trip_end_date >= t.trip_end_date)
        )
    LIMIT 1;

    IF FOUND THEN
        error_message := format(
            'Vehicle conflict: %s is already on trip %s from %s to %s with driver %s',
            NEW.vehicle_registration,
            vehicle_conflict.trip_serial_number,
            TO_CHAR(vehicle_conflict.trip_start_date, 'DD-MM-YYYY HH24:MI'),
            TO_CHAR(vehicle_conflict.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            vehicle_conflict.driver_name
        );
        RAISE EXCEPTION '%', error_message;
    END IF;

    -- Check for driver conflicts (same driver on multiple trips)
    -- Only check if driver_id is provided
    IF NEW.driver_id IS NOT NULL THEN
        SELECT 
            t.id,
            t.trip_serial_number,
            t.trip_start_date,
            t.trip_end_date,
            t.vehicle_registration
        INTO driver_conflict
        FROM trips t
        WHERE t.driver_id = NEW.driver_id
            AND t.id != COALESCE(NEW.id, gen_random_uuid())
            AND t.deleted_at IS NULL
            AND t.created_by = NEW.created_by
            AND (
                -- Check if new trip overlaps with existing trip
                (NEW.trip_start_date >= t.trip_start_date AND NEW.trip_start_date < t.trip_end_date)
                OR (NEW.trip_end_date > t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date)
                OR (NEW.trip_start_date <= t.trip_start_date AND NEW.trip_end_date >= t.trip_end_date)
            )
        LIMIT 1;

        IF FOUND THEN
            error_message := format(
                'Driver conflict: %s is already on trip %s with vehicle %s from %s to %s',
                NEW.driver_name,
                driver_conflict.trip_serial_number,
                driver_conflict.vehicle_registration,
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
            format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
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

-- Create trigger to prevent concurrent trips
DROP TRIGGER IF EXISTS prevent_concurrent_trips ON trips;
CREATE TRIGGER prevent_concurrent_trips
    BEFORE INSERT OR UPDATE OF trip_start_date, trip_end_date, vehicle_id, driver_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_overlap();

-- Function to find overlapping trips for a vehicle
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
            WHEN t1.trip_start_date = t2.trip_start_date AND t1.trip_end_date = t2.trip_end_date THEN 'exact_duplicate'
            WHEN t1.trip_start_date >= t2.trip_start_date AND t1.trip_end_date <= t2.trip_end_date THEN 'contained_within'
            WHEN t2.trip_start_date >= t1.trip_start_date AND t2.trip_end_date <= t1.trip_end_date THEN 'contains'
            WHEN t1.trip_start_date < t2.trip_end_date AND t1.trip_end_date > t2.trip_start_date THEN 'partial_overlap'
            ELSE 'unknown'
        END as overlap_type,
        t1.vehicle_registration,
        t1.driver_name
    FROM trips t1
    INNER JOIN trips t2 ON (
        (p_vehicle_id IS NULL OR (t1.vehicle_id = p_vehicle_id AND t2.vehicle_id = p_vehicle_id))
        AND (p_driver_id IS NULL OR (t1.driver_id = p_driver_id AND t2.driver_id = p_driver_id))
        AND t1.id < t2.id -- Avoid duplicate pairs
        AND t1.deleted_at IS NULL
        AND t2.deleted_at IS NULL
        AND t1.created_by = auth.uid()
        AND t2.created_by = auth.uid()
        AND (
            -- Check for overlaps
            (t1.trip_start_date >= t2.trip_start_date AND t1.trip_start_date < t2.trip_end_date)
            OR (t1.trip_end_date > t2.trip_start_date AND t1.trip_end_date <= t2.trip_end_date)
            OR (t1.trip_start_date <= t2.trip_start_date AND t1.trip_end_date >= t2.trip_end_date)
        )
    )
    WHERE (p_date_from IS NULL OR t1.trip_start_date >= p_date_from)
        AND (p_date_to IS NULL OR t1.trip_start_date <= p_date_to)
    ORDER BY t1.trip_start_date, t2.trip_start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a time slot is available for a vehicle
CREATE OR REPLACE FUNCTION is_vehicle_available(
    p_vehicle_id UUID,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_exclude_trip_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO conflict_count
    FROM trips t
    WHERE t.vehicle_id = p_vehicle_id
        AND t.id != COALESCE(p_exclude_trip_id, gen_random_uuid())
        AND t.deleted_at IS NULL
        AND t.created_by = auth.uid()
        AND (
            (p_start_date >= t.trip_start_date AND p_start_date < t.trip_end_date)
            OR (p_end_date > t.trip_start_date AND p_end_date <= t.trip_end_date)
            OR (p_start_date <= t.trip_start_date AND p_end_date >= t.trip_end_date)
        );
    
    RETURN conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_trip_overlap() TO authenticated;
GRANT EXECUTE ON FUNCTION find_overlapping_trips(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION is_vehicle_available(UUID, TIMESTAMP, TIMESTAMP, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION check_trip_overlap() IS 'Validates that trips do not overlap for the same vehicle or driver';
COMMENT ON FUNCTION find_overlapping_trips(UUID, UUID, DATE, DATE) IS 'Finds all overlapping trips for a given vehicle or driver';
COMMENT ON FUNCTION is_vehicle_available(UUID, TIMESTAMP, TIMESTAMP, UUID) IS 'Checks if a vehicle is available for a given time period';