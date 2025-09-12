-- Enhanced Concurrent Trip Prevention (Phase 1 - Critical)
-- Prevents overlapping trips for the same vehicle or driver with comprehensive conflict detection

-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS enhanced_concurrent_trip_prevention ON trips;

-- Enhanced function to check for trip overlaps with detailed conflict reporting
CREATE OR REPLACE FUNCTION check_trip_overlap_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    vehicle_conflict RECORD;
    driver_conflict RECORD;
    conflict_details JSONB;
    error_message TEXT;
    validation_result TEXT;
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
        RAISE EXCEPTION E'INVALID TRIP DURATION!\n'
            'Trip: %\n'
            'End date/time (%s) must be after start date/time (%s)\n'
            'Duration cannot be zero or negative',
            NEW.trip_serial_number,
            TO_CHAR(NEW.trip_end_date, 'DD-MM-YYYY HH24:MI:SS'),
            TO_CHAR(NEW.trip_start_date, 'DD-MM-YYYY HH24:MI:SS');
    END IF;

    -- Check for unrealistic trip duration (>48 hours)
    IF EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) > 172800 THEN
        RAISE WARNING 'Trip duration exceeds 48 hours. Trip: %, Duration: % hours',
            NEW.trip_serial_number,
            ROUND(EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) / 3600, 1);
    END IF;

    -- Check for vehicle conflicts with detailed overlap information
    FOR vehicle_conflict IN
        SELECT 
            t.id,
            t.trip_serial_number,
            t.trip_start_date,
            t.trip_end_date,
            t.driver_name,
            CASE 
                WHEN NEW.trip_start_date >= t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date THEN 'new_contained_in_existing'
                WHEN t.trip_start_date >= NEW.trip_start_date AND t.trip_end_date <= NEW.trip_end_date THEN 'existing_contained_in_new'
                WHEN NEW.trip_start_date < t.trip_end_date AND NEW.trip_end_date > t.trip_end_date THEN 'overlap_at_end'
                WHEN NEW.trip_start_date < t.trip_start_date AND NEW.trip_end_date > t.trip_start_date THEN 'overlap_at_start'
                ELSE 'unknown_overlap'
            END as overlap_type,
            GREATEST(0, 
                EXTRACT(EPOCH FROM (
                    LEAST(NEW.trip_end_date, t.trip_end_date) - 
                    GREATEST(NEW.trip_start_date, t.trip_start_date)
                )) / 3600
            ) as overlap_hours
        FROM trips t
        WHERE t.vehicle_id = NEW.vehicle_id
            AND t.id != COALESCE(NEW.id, gen_random_uuid())
            AND t.deleted_at IS NULL
            AND t.created_by = NEW.created_by
            AND (
                -- Comprehensive overlap detection
                (NEW.trip_start_date >= t.trip_start_date AND NEW.trip_start_date < t.trip_end_date)
                OR (NEW.trip_end_date > t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date)
                OR (NEW.trip_start_date <= t.trip_start_date AND NEW.trip_end_date >= t.trip_end_date)
            )
        ORDER BY t.trip_start_date
    LOOP
        -- Build detailed error message
        error_message := format(E'VEHICLE CONFLICT DETECTED!\n'
            'Vehicle: %s\n'
            'Conflicting trip: %s (Driver: %s)\n'
            'Conflict type: %s\n'
            'Existing trip period: %s to %s\n'
            'New trip period: %s to %s\n'
            'Overlap duration: %.1f hours\n'
            'Action required: Adjust trip times to avoid overlap or use a different vehicle',
            NEW.vehicle_registration,
            vehicle_conflicts.trip_serial_number,
            vehicle_conflicts.driver_name,
            CASE vehicle_conflicts.overlap_type
                WHEN 'new_contained_in_existing' THEN 'New trip is entirely within existing trip'
                WHEN 'existing_contained_in_new' THEN 'Existing trip is entirely within new trip'
                WHEN 'overlap_at_end' THEN 'New trip starts before existing trip ends'
                WHEN 'overlap_at_start' THEN 'New trip ends after existing trip starts'
                ELSE 'Trips overlap'
            END,
            TO_CHAR(vehicle_conflicts.trip_start_date, 'DD-MM-YYYY HH24:MI'),
            TO_CHAR(vehicle_conflicts.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            TO_CHAR(NEW.trip_start_date, 'DD-MM-YYYY HH24:MI'),
            TO_CHAR(NEW.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            vehicle_conflicts.overlap_hours
        );
        
        -- Log conflict to audit trail before raising exception
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'concurrent_trip_prevention',
                'trip_data',
                'trip',
                NEW.id::TEXT,
                format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
                'rejected_vehicle_conflict',
                jsonb_build_object(
                    'new_trip', jsonb_build_object(
                        'serial', NEW.trip_serial_number,
                        'start', NEW.trip_start_date,
                        'end', NEW.trip_end_date,
                        'driver', NEW.driver_name
                    ),
                    'conflicting_trip', jsonb_build_object(
                        'id', vehicle_conflicts.id,
                        'serial', vehicle_conflicts.trip_serial_number,
                        'start', vehicle_conflicts.trip_start_date,
                        'end', vehicle_conflicts.trip_end_date,
                        'driver', vehicle_conflicts.driver_name
                    )
                ),
                jsonb_build_object(
                    'conflict_type', 'vehicle',
                    'overlap_type', vehicle_conflicts.overlap_type,
                    'overlap_hours', vehicle_conflicts.overlap_hours
                ),
                'error',
                NULL,
                ARRAY['overlap_validation', 'vehicle_conflict', vehicle_conflicts.overlap_type],
                error_message
            );
        END IF;
        
        RAISE EXCEPTION '%', error_message;
    END LOOP;

    -- Check for driver conflicts (only if driver_id is provided)
    IF NEW.driver_id IS NOT NULL THEN
        FOR driver_conflict IN
            SELECT 
                t.id,
                t.trip_serial_number,
                t.trip_start_date,
                t.trip_end_date,
                t.vehicle_registration,
                CASE 
                    WHEN NEW.trip_start_date >= t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date THEN 'new_contained_in_existing'
                    WHEN t.trip_start_date >= NEW.trip_start_date AND t.trip_end_date <= NEW.trip_end_date THEN 'existing_contained_in_new'
                    WHEN NEW.trip_start_date < t.trip_end_date AND NEW.trip_end_date > t.trip_end_date THEN 'overlap_at_end'
                    WHEN NEW.trip_start_date < t.trip_start_date AND NEW.trip_end_date > t.trip_start_date THEN 'overlap_at_start'
                    ELSE 'unknown_overlap'
                END as overlap_type,
                GREATEST(0, 
                    EXTRACT(EPOCH FROM (
                        LEAST(NEW.trip_end_date, t.trip_end_date) - 
                        GREATEST(NEW.trip_start_date, t.trip_start_date)
                    )) / 3600
                ) as overlap_hours
            FROM trips t
            WHERE t.driver_id = NEW.driver_id
                AND t.id != COALESCE(NEW.id, gen_random_uuid())
                AND t.deleted_at IS NULL
                AND t.created_by = NEW.created_by
                AND (
                    -- Comprehensive overlap detection
                    (NEW.trip_start_date >= t.trip_start_date AND NEW.trip_start_date < t.trip_end_date)
                    OR (NEW.trip_end_date > t.trip_start_date AND NEW.trip_end_date <= t.trip_end_date)
                    OR (NEW.trip_start_date <= t.trip_start_date AND NEW.trip_end_date >= t.trip_end_date)
                )
            ORDER BY t.trip_start_date
        LOOP
            -- Build detailed error message
            error_message := format(E'DRIVER CONFLICT DETECTED!\n'
                'Driver: %s\n'
                'Conflicting trip: %s (Vehicle: %s)\n'
                'Conflict type: %s\n'
                'Existing trip period: %s to %s\n'
                'New trip period: %s to %s\n'
                'Overlap duration: %.1f hours\n'
                'Action required: Adjust trip times to avoid overlap or assign a different driver',
                NEW.driver_name,
                driver_conflicts.trip_serial_number,
                driver_conflicts.vehicle_registration,
                CASE driver_conflicts.overlap_type
                    WHEN 'new_contained_in_existing' THEN 'New trip is entirely within existing trip'
                    WHEN 'existing_contained_in_new' THEN 'Existing trip is entirely within new trip'
                    WHEN 'overlap_at_end' THEN 'New trip starts before existing trip ends'
                    WHEN 'overlap_at_start' THEN 'New trip ends after existing trip starts'
                    ELSE 'Trips overlap'
                END,
                TO_CHAR(driver_conflicts.trip_start_date, 'DD-MM-YYYY HH24:MI'),
                TO_CHAR(driver_conflicts.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                TO_CHAR(NEW.trip_start_date, 'DD-MM-YYYY HH24:MI'),
                TO_CHAR(NEW.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                driver_conflicts.overlap_hours
            );
            
            -- Log conflict to audit trail before raising exception
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
                PERFORM log_audit_trail(
                    'concurrent_trip_prevention',
                    'trip_data',
                    'trip',
                    NEW.id::TEXT,
                    format('Trip %s for driver %s', NEW.trip_serial_number, NEW.driver_name),
                    'rejected_driver_conflict',
                    jsonb_build_object(
                        'new_trip', jsonb_build_object(
                            'serial', NEW.trip_serial_number,
                            'start', NEW.trip_start_date,
                            'end', NEW.trip_end_date,
                            'vehicle', NEW.vehicle_registration
                        ),
                        'conflicting_trip', jsonb_build_object(
                            'id', driver_conflicts.id,
                            'serial', driver_conflicts.trip_serial_number,
                            'start', driver_conflicts.trip_start_date,
                            'end', driver_conflicts.trip_end_date,
                            'vehicle', driver_conflicts.vehicle_registration
                        )
                    ),
                    jsonb_build_object(
                        'conflict_type', 'driver',
                        'overlap_type', driver_conflicts.overlap_type,
                        'overlap_hours', driver_conflicts.overlap_hours
                    ),
                    'error',
                    NULL,
                    ARRAY['overlap_validation', 'driver_conflict', driver_conflicts.overlap_type],
                    error_message
                );
            END IF;
            
            RAISE EXCEPTION '%', error_message;
        END LOOP;
    END IF;

    -- Log successful validation
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
        PERFORM log_audit_trail(
            'concurrent_trip_validation',
            'trip_data',
            'trip',
            NEW.id::TEXT,
            format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
            'validated_no_conflicts',
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'driver_id', NEW.driver_id,
                'trip_start', NEW.trip_start_date,
                'trip_end', NEW.trip_end_date,
                'duration_hours', ROUND(EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) / 3600, 1)
            ),
            jsonb_build_object('validation', 'no_conflicts_found'),
            'info'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced trigger to prevent concurrent trips
CREATE TRIGGER enhanced_concurrent_trip_prevention
    BEFORE INSERT OR UPDATE OF trip_start_date, trip_end_date, vehicle_id, driver_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION check_trip_overlap_enhanced();

-- Function to find and analyze all overlapping trips in the system
CREATE OR REPLACE FUNCTION analyze_trip_overlaps(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_fix_suggestions BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
    conflict_id UUID,
    conflict_type TEXT,
    severity TEXT,
    trip1_id UUID,
    trip1_serial TEXT,
    trip1_vehicle TEXT,
    trip1_driver TEXT,
    trip1_period TEXT,
    trip2_id UUID,
    trip2_serial TEXT,
    trip2_vehicle TEXT,
    trip2_driver TEXT,
    trip2_period TEXT,
    overlap_duration_hours NUMERIC,
    suggested_fix TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH overlap_analysis AS (
        SELECT 
            gen_random_uuid() as conflict_id,
            CASE 
                WHEN t1.vehicle_id = t2.vehicle_id AND t1.driver_id = t2.driver_id THEN 'both_vehicle_and_driver'
                WHEN t1.vehicle_id = t2.vehicle_id THEN 'vehicle'
                WHEN t1.driver_id = t2.driver_id THEN 'driver'
                ELSE 'unknown'
            END as conflict_type,
            CASE 
                WHEN t1.trip_start_date = t2.trip_start_date AND t1.trip_end_date = t2.trip_end_date THEN 'critical_duplicate'
                WHEN (t1.trip_start_date >= t2.trip_start_date AND t1.trip_end_date <= t2.trip_end_date) OR
                     (t2.trip_start_date >= t1.trip_start_date AND t2.trip_end_date <= t1.trip_end_date) THEN 'critical_contained'
                WHEN EXTRACT(EPOCH FROM (
                    LEAST(t1.trip_end_date, t2.trip_end_date) - 
                    GREATEST(t1.trip_start_date, t2.trip_start_date)
                )) / 3600 > 4 THEN 'high'
                ELSE 'medium'
            END as severity,
            t1.id as trip1_id,
            t1.trip_serial_number as trip1_serial,
            t1.vehicle_registration as trip1_vehicle,
            t1.driver_name as trip1_driver,
            format('%s to %s', 
                TO_CHAR(t1.trip_start_date, 'DD-MM HH24:MI'),
                TO_CHAR(t1.trip_end_date, 'DD-MM HH24:MI')
            ) as trip1_period,
            t2.id as trip2_id,
            t2.trip_serial_number as trip2_serial,
            t2.vehicle_registration as trip2_vehicle,
            t2.driver_name as trip2_driver,
            format('%s to %s', 
                TO_CHAR(t2.trip_start_date, 'DD-MM HH24:MI'),
                TO_CHAR(t2.trip_end_date, 'DD-MM HH24:MI')
            ) as trip2_period,
            ROUND(EXTRACT(EPOCH FROM (
                LEAST(t1.trip_end_date, t2.trip_end_date) - 
                GREATEST(t1.trip_start_date, t2.trip_start_date)
            )) / 3600, 1) as overlap_hours
        FROM trips t1
        INNER JOIN trips t2 ON (
            t1.id < t2.id -- Avoid duplicate pairs
            AND t1.deleted_at IS NULL
            AND t2.deleted_at IS NULL
            AND t1.created_by = auth.uid()
            AND t2.created_by = auth.uid()
            AND (
                (t1.vehicle_id = t2.vehicle_id) OR 
                (t1.driver_id IS NOT NULL AND t1.driver_id = t2.driver_id)
            )
            AND (
                -- Check for overlaps
                (t1.trip_start_date >= t2.trip_start_date AND t1.trip_start_date < t2.trip_end_date)
                OR (t1.trip_end_date > t2.trip_start_date AND t1.trip_end_date <= t2.trip_end_date)
                OR (t1.trip_start_date <= t2.trip_start_date AND t1.trip_end_date >= t2.trip_end_date)
            )
        )
        WHERE t1.trip_start_date >= p_start_date 
            AND t1.trip_start_date <= p_end_date
    )
    SELECT 
        oa.conflict_id,
        oa.conflict_type,
        oa.severity,
        oa.trip1_id,
        oa.trip1_serial,
        oa.trip1_vehicle,
        oa.trip1_driver,
        oa.trip1_period,
        oa.trip2_id,
        oa.trip2_serial,
        oa.trip2_vehicle,
        oa.trip2_driver,
        oa.trip2_period,
        oa.overlap_hours as overlap_duration_hours,
        CASE 
            WHEN p_fix_suggestions = FALSE THEN NULL
            WHEN oa.severity = 'critical_duplicate' THEN 
                format('Delete duplicate trip %s', oa.trip2_serial)
            WHEN oa.severity = 'critical_contained' THEN 
                format('Review and merge trips %s and %s', oa.trip1_serial, oa.trip2_serial)
            WHEN oa.conflict_type = 'vehicle' THEN 
                format('Adjust trip times or assign different vehicle for trip %s', oa.trip2_serial)
            WHEN oa.conflict_type = 'driver' THEN 
                format('Adjust trip times or assign different driver for trip %s', oa.trip2_serial)
            WHEN oa.conflict_type = 'both_vehicle_and_driver' THEN 
                format('Critical conflict - review both trips %s and %s', oa.trip1_serial, oa.trip2_serial)
            ELSE 'Review and adjust trip schedules'
        END as suggested_fix
    FROM overlap_analysis oa
    ORDER BY oa.severity DESC, oa.overlap_hours DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check availability for scheduling
CREATE OR REPLACE FUNCTION check_scheduling_availability(
    p_vehicle_id UUID DEFAULT NULL,
    p_driver_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_exclude_trip_id UUID DEFAULT NULL
) RETURNS TABLE (
    is_available BOOLEAN,
    conflict_count INTEGER,
    conflicts JSONB
) AS $$
DECLARE
    v_conflicts JSONB := '[]'::JSONB;
    v_conflict_count INTEGER := 0;
    rec RECORD;
BEGIN
    -- Check vehicle conflicts if vehicle_id provided
    IF p_vehicle_id IS NOT NULL THEN
        FOR rec IN
            SELECT 
                id,
                trip_serial_number,
                trip_start_date,
                trip_end_date,
                driver_name
            FROM trips t
            WHERE t.vehicle_id = p_vehicle_id
                AND t.id != COALESCE(p_exclude_trip_id, gen_random_uuid())
                AND t.deleted_at IS NULL
                AND t.created_by = auth.uid()
                AND (
                    (p_start_date >= t.trip_start_date AND p_start_date < t.trip_end_date)
                    OR (p_end_date > t.trip_start_date AND p_end_date <= t.trip_end_date)
                    OR (p_start_date <= t.trip_start_date AND p_end_date >= t.trip_end_date)
                )
        LOOP
            v_conflict_count := v_conflict_count + 1;
            v_conflicts := v_conflicts || jsonb_build_object(
                'type', 'vehicle',
                'trip_id', rec.id,
                'trip_serial', rec.trip_serial_number,
                'period', format('%s to %s', 
                    TO_CHAR(rec.trip_start_date, 'DD-MM-YYYY HH24:MI'),
                    TO_CHAR(rec.trip_end_date, 'DD-MM-YYYY HH24:MI')
                ),
                'driver', rec.driver_name
            );
        END LOOP;
    END IF;

    -- Check driver conflicts if driver_id provided
    IF p_driver_id IS NOT NULL THEN
        FOR rec IN
            SELECT 
                id,
                trip_serial_number,
                trip_start_date,
                trip_end_date,
                vehicle_registration
            FROM trips t
            WHERE t.driver_id = p_driver_id
                AND t.id != COALESCE(p_exclude_trip_id, gen_random_uuid())
                AND t.deleted_at IS NULL
                AND t.created_by = auth.uid()
                AND (
                    (p_start_date >= t.trip_start_date AND p_start_date < t.trip_end_date)
                    OR (p_end_date > t.trip_start_date AND p_end_date <= t.trip_end_date)
                    OR (p_start_date <= t.trip_start_date AND p_end_date >= t.trip_end_date)
                )
        LOOP
            v_conflict_count := v_conflict_count + 1;
            v_conflicts := v_conflicts || jsonb_build_object(
                'type', 'driver',
                'trip_id', rec.id,
                'trip_serial', rec.trip_serial_number,
                'period', format('%s to %s', 
                    TO_CHAR(rec.trip_start_date, 'DD-MM-YYYY HH24:MI'),
                    TO_CHAR(rec.trip_end_date, 'DD-MM-YYYY HH24:MI')
                ),
                'vehicle', rec.vehicle_registration
            );
        END LOOP;
    END IF;

    RETURN QUERY SELECT 
        (v_conflict_count = 0) as is_available,
        v_conflict_count as conflict_count,
        v_conflicts as conflicts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_trip_overlap_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_trip_overlaps(DATE, DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION check_scheduling_availability(UUID, UUID, TIMESTAMP, TIMESTAMP, UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION check_trip_overlap_enhanced() IS 'Enhanced validation to prevent concurrent trips for vehicles and drivers with detailed conflict reporting';
COMMENT ON FUNCTION analyze_trip_overlaps(DATE, DATE, BOOLEAN) IS 'Analyzes all trip overlaps in the system and provides fix suggestions';
COMMENT ON FUNCTION check_scheduling_availability(UUID, UUID, TIMESTAMP, TIMESTAMP, UUID) IS 'Checks if a vehicle or driver is available for a given time period';