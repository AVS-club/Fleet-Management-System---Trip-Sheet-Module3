-- Fix 1: Odometer Continuity Validation
-- Ensures odometer readings are continuous across trips for the same vehicle

-- Function to validate odometer continuity
CREATE OR REPLACE FUNCTION validate_odometer_continuity()
RETURNS TRIGGER AS $$
DECLARE
    prev_trip RECORD;
    gap_km INTEGER;
    warning_message TEXT;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Find the previous trip for this vehicle
    SELECT * INTO prev_trip
    FROM trips
    WHERE vehicle_id = NEW.vehicle_id
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND trip_end_date < NEW.trip_start_date
        AND deleted_at IS NULL
        AND created_by = NEW.created_by
    ORDER BY trip_end_date DESC
    LIMIT 1;

    -- If no previous trip exists, this is the first trip for this vehicle - allow it
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Calculate the gap between trips
    gap_km := NEW.start_km - prev_trip.end_km;

    -- Check for negative gap (odometer went backwards)
    IF gap_km < 0 THEN
        RAISE EXCEPTION 'Odometer continuity violation: Start KM (%) cannot be less than previous trip end KM (%). Previous trip: % ended on %',
            NEW.start_km, 
            prev_trip.end_km, 
            prev_trip.trip_serial_number, 
            TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI');
    END IF;

    -- Check for large gap (>50km) - warning but allow
    IF gap_km > 50 THEN
        warning_message := format(
            'Large odometer gap detected: %s km between trips. Previous trip %s ended at %s km on %s. Current trip starts at %s km.',
            gap_km,
            prev_trip.trip_serial_number,
            prev_trip.end_km,
            TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            NEW.start_km
        );
        
        -- Log the warning to audit trail if the function exists
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'odometer_validation',
                'trip_data',
                'trip',
                NEW.id::TEXT,
                format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
                'validated_with_warning',
                jsonb_build_object(
                    'gap_km', gap_km,
                    'previous_trip_id', prev_trip.id,
                    'previous_trip_serial', prev_trip.trip_serial_number,
                    'previous_end_km', prev_trip.end_km,
                    'current_start_km', NEW.start_km
                ),
                jsonb_build_object('warning', warning_message),
                'warning',
                NULL,
                ARRAY['odometer_gap', 'large_gap'],
                warning_message
            );
        END IF;
        
        -- Raise notice but allow the operation
        RAISE NOTICE '%', warning_message;
    END IF;

    -- Also validate that end_km > start_km for the current trip
    IF NEW.end_km <= NEW.start_km THEN
        RAISE EXCEPTION 'Invalid odometer reading: End KM (%) must be greater than Start KM (%)',
            NEW.end_km, NEW.start_km;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for odometer continuity validation
DROP TRIGGER IF EXISTS check_odometer_continuity ON trips;
CREATE TRIGGER check_odometer_continuity
    BEFORE INSERT OR UPDATE OF start_km, end_km, trip_start_date, trip_end_date, vehicle_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_odometer_continuity();

-- Function to check and report odometer gaps for a vehicle
CREATE OR REPLACE FUNCTION check_vehicle_odometer_gaps(
    p_vehicle_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    trip_serial_number TEXT,
    trip_date DATE,
    start_km INTEGER,
    previous_trip_serial TEXT,
    previous_end_km INTEGER,
    gap_km INTEGER,
    gap_severity TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH ordered_trips AS (
        SELECT 
            t.trip_serial_number,
            t.trip_start_date::DATE as trip_date,
            t.start_km,
            t.end_km,
            LAG(t.trip_serial_number) OVER (ORDER BY t.trip_start_date) as prev_serial,
            LAG(t.end_km) OVER (ORDER BY t.trip_start_date) as prev_end_km
        FROM trips t
        WHERE t.vehicle_id = p_vehicle_id
            AND t.deleted_at IS NULL
            AND (p_date_from IS NULL OR t.trip_start_date >= p_date_from)
            AND (p_date_to IS NULL OR t.trip_start_date <= p_date_to)
            AND t.created_by = auth.uid()
        ORDER BY t.trip_start_date
    )
    SELECT 
        ot.trip_serial_number,
        ot.trip_date,
        ot.start_km,
        ot.prev_serial as previous_trip_serial,
        ot.prev_end_km as previous_end_km,
        (ot.start_km - ot.prev_end_km) as gap_km,
        CASE 
            WHEN ot.prev_end_km IS NULL THEN 'first_trip'
            WHEN (ot.start_km - ot.prev_end_km) < 0 THEN 'error_negative'
            WHEN (ot.start_km - ot.prev_end_km) = 0 THEN 'perfect'
            WHEN (ot.start_km - ot.prev_end_km) <= 10 THEN 'normal'
            WHEN (ot.start_km - ot.prev_end_km) <= 50 THEN 'moderate'
            ELSE 'large'
        END as gap_severity
    FROM ordered_trips ot
    WHERE ot.prev_end_km IS NULL OR (ot.start_km - ot.prev_end_km) != 0
    ORDER BY ot.trip_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_odometer_continuity() TO authenticated;
GRANT EXECUTE ON FUNCTION check_vehicle_odometer_gaps(UUID, DATE, DATE) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_odometer_continuity() IS 'Validates odometer continuity between trips for the same vehicle';
COMMENT ON FUNCTION check_vehicle_odometer_gaps(UUID, DATE, DATE) IS 'Reports odometer gaps between trips for a specific vehicle';