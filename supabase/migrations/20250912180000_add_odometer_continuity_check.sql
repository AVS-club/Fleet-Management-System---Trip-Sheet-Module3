-- Enhanced Odometer Continuity Validation (Phase 1 - Critical)
-- Ensures strict odometer continuity across trips for the same vehicle

-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS enhanced_odometer_continuity_check ON trips;

-- Enhanced function to validate odometer continuity with better error handling
CREATE OR REPLACE FUNCTION validate_odometer_continuity_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    prev_trip RECORD;
    next_trip RECORD;
    gap_km INTEGER;
    warning_message TEXT;
    validation_data JSONB;
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

    -- Find the previous trip for this vehicle (most recent trip before this one)
    SELECT * INTO prev_trip
    FROM trips
    WHERE vehicle_id = NEW.vehicle_id
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND trip_end_date < NEW.trip_start_date
        AND deleted_at IS NULL
        AND created_by = NEW.created_by
    ORDER BY trip_end_date DESC
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
                'message', 'Perfect odometer continuity maintained'
            );
        -- Check for small acceptable gap (1-10 km) - ACCEPTABLE
        ELSIF gap_km <= 10 THEN
            validation_data := jsonb_build_object(
                'status', 'small_gap_acceptable',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'message', format('Small gap of %s km - likely vehicle movement without trip logging', gap_km)
            );
        -- Check for moderate gap (11-50 km) - WARNING
        ELSIF gap_km <= 50 THEN
            warning_message := format(
                'Moderate odometer gap detected: %s km between trips. '
                'Previous trip %s ended at %s km on %s. '
                'Current trip %s starts at %s km. '
                'Please verify if any trips are missing.',
                gap_km,
                prev_trip.trip_serial_number,
                prev_trip.end_km,
                TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                NEW.trip_serial_number,
                NEW.start_km
            );
            
            RAISE NOTICE '%', warning_message;
            
            validation_data := jsonb_build_object(
                'status', 'moderate_gap_warning',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'message', warning_message
            );
        -- Check for large gap (>50 km) - STRONG WARNING
        ELSE
            warning_message := format(
                'LARGE ODOMETER GAP ALERT: %s km gap detected! '
                'Previous trip %s ended at %s km on %s. '
                'Current trip %s starts at %s km. '
                'This large gap suggests missing trips or data entry error. '
                'Please investigate and add any missing trips.',
                gap_km,
                prev_trip.trip_serial_number,
                prev_trip.end_km,
                TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
                NEW.trip_serial_number,
                NEW.start_km
            );
            
            RAISE WARNING '%', warning_message;
            
            validation_data := jsonb_build_object(
                'status', 'large_gap_alert',
                'gap_km', gap_km,
                'previous_trip_id', prev_trip.id,
                'previous_trip_serial', prev_trip.trip_serial_number,
                'message', warning_message,
                'action_required', 'Investigate missing trips or validate gap'
            );
        END IF;

        -- Log to audit trail if the function exists
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'odometer_continuity_validation',
                'trip_data',
                'trip',
                NEW.id::TEXT,
                format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
                CASE 
                    WHEN gap_km = 0 THEN 'validated_perfect'
                    WHEN gap_km <= 10 THEN 'validated_acceptable'
                    WHEN gap_km <= 50 THEN 'validated_with_warning'
                    ELSE 'validated_with_alert'
                END,
                jsonb_build_object(
                    'gap_km', gap_km,
                    'previous_trip_id', prev_trip.id,
                    'previous_trip_serial', prev_trip.trip_serial_number,
                    'previous_end_km', prev_trip.end_km,
                    'current_start_km', NEW.start_km,
                    'current_end_km', NEW.end_km
                ),
                validation_data,
                CASE 
                    WHEN gap_km <= 10 THEN 'info'
                    WHEN gap_km <= 50 THEN 'warning'
                    ELSE 'error'
                END,
                NULL,
                ARRAY['odometer_validation', 'continuity_check', format('gap_%s_km', gap_km)],
                CASE 
                    WHEN gap_km > 50 THEN 'Large gap requires investigation'
                    ELSE NULL
                END
            );
        END IF;
    END IF;

    -- Also check if this trip would break continuity for any future trips (on UPDATE)
    IF TG_OP = 'UPDATE' AND (OLD.end_km != NEW.end_km) THEN
        SELECT * INTO next_trip
        FROM trips
        WHERE vehicle_id = NEW.vehicle_id
            AND id != NEW.id
            AND trip_start_date > NEW.trip_end_date
            AND deleted_at IS NULL
            AND created_by = NEW.created_by
        ORDER BY trip_start_date
        LIMIT 1;

        IF FOUND AND next_trip.start_km < NEW.end_km THEN
            RAISE EXCEPTION E'ODOMETER CONTINUITY VIOLATION!\n'
                'Updating trip % end KM to % would break continuity.\n'
                'Next trip % starts at % km.\n'
                'Action required: Use cascade correction to update all subsequent trips.',
                NEW.trip_serial_number,
                NEW.end_km,
                next_trip.trip_serial_number,
                next_trip.start_km;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced trigger for odometer continuity validation
CREATE TRIGGER enhanced_odometer_continuity_check
    BEFORE INSERT OR UPDATE OF start_km, end_km, trip_start_date, trip_end_date, vehicle_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_odometer_continuity_enhanced();

-- Function to analyze odometer continuity for a vehicle over time
CREATE OR REPLACE FUNCTION analyze_vehicle_odometer_continuity(
    p_vehicle_id UUID,
    p_date_from DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_date_to DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    analysis_date DATE,
    total_trips INTEGER,
    perfect_continuity_count INTEGER,
    small_gaps_count INTEGER,
    moderate_gaps_count INTEGER,
    large_gaps_count INTEGER,
    negative_gaps_count INTEGER,
    total_gap_km INTEGER,
    avg_gap_km NUMERIC,
    max_gap_km INTEGER,
    continuity_score INTEGER,
    recommendations TEXT[]
) AS $$
DECLARE
    rec RECORD;
    v_perfect_count INTEGER := 0;
    v_small_gaps INTEGER := 0;
    v_moderate_gaps INTEGER := 0;
    v_large_gaps INTEGER := 0;
    v_negative_gaps INTEGER := 0;
    v_total_gap_km INTEGER := 0;
    v_max_gap_km INTEGER := 0;
    v_trip_count INTEGER := 0;
    v_recommendations TEXT[] := ARRAY[]::TEXT[];
    v_continuity_score INTEGER;
BEGIN
    -- Analyze all trips in the date range
    FOR rec IN
        WITH ordered_trips AS (
            SELECT 
                trip_serial_number,
                trip_start_date,
                start_km,
                end_km,
                LAG(end_km) OVER (ORDER BY trip_start_date) as prev_end_km
            FROM trips
            WHERE vehicle_id = p_vehicle_id
                AND deleted_at IS NULL
                AND trip_start_date >= p_date_from
                AND trip_start_date <= p_date_to
                AND created_by = auth.uid()
            ORDER BY trip_start_date
        )
        SELECT 
            trip_serial_number,
            start_km,
            prev_end_km,
            CASE WHEN prev_end_km IS NOT NULL THEN start_km - prev_end_km ELSE 0 END as gap_km
        FROM ordered_trips
    LOOP
        v_trip_count := v_trip_count + 1;
        
        IF rec.prev_end_km IS NOT NULL THEN
            IF rec.gap_km < 0 THEN
                v_negative_gaps := v_negative_gaps + 1;
            ELSIF rec.gap_km = 0 THEN
                v_perfect_count := v_perfect_count + 1;
            ELSIF rec.gap_km <= 10 THEN
                v_small_gaps := v_small_gaps + 1;
            ELSIF rec.gap_km <= 50 THEN
                v_moderate_gaps := v_moderate_gaps + 1;
            ELSE
                v_large_gaps := v_large_gaps + 1;
            END IF;
            
            v_total_gap_km := v_total_gap_km + ABS(rec.gap_km);
            v_max_gap_km := GREATEST(v_max_gap_km, ABS(rec.gap_km));
        END IF;
    END LOOP;

    -- Calculate continuity score (0-100)
    IF v_trip_count > 0 THEN
        v_continuity_score := CASE
            WHEN v_negative_gaps > 0 THEN 0  -- Critical issues
            WHEN v_large_gaps > 0 THEN LEAST(50 - (v_large_gaps * 10), 0)
            WHEN v_moderate_gaps > 0 THEN 70 - (v_moderate_gaps * 5)
            WHEN v_small_gaps > 0 THEN 90 - (v_small_gaps * 2)
            ELSE 100  -- Perfect continuity
        END;
    ELSE
        v_continuity_score := NULL;
    END IF;

    -- Generate recommendations
    IF v_negative_gaps > 0 THEN
        v_recommendations := array_append(v_recommendations, 
            format('CRITICAL: %s trips have negative odometer gaps. Immediate correction required.', v_negative_gaps));
    END IF;
    
    IF v_large_gaps > 0 THEN
        v_recommendations := array_append(v_recommendations, 
            format('WARNING: %s trips have large gaps (>50km). Check for missing trips.', v_large_gaps));
    END IF;
    
    IF v_moderate_gaps > 3 THEN
        v_recommendations := array_append(v_recommendations, 
            'Multiple moderate gaps detected. Consider reviewing trip logging practices.');
    END IF;
    
    IF v_continuity_score >= 90 THEN
        v_recommendations := array_append(v_recommendations, 
            'Excellent odometer continuity maintained!');
    END IF;

    RETURN QUERY SELECT
        p_date_to as analysis_date,
        v_trip_count as total_trips,
        v_perfect_count as perfect_continuity_count,
        v_small_gaps as small_gaps_count,
        v_moderate_gaps as moderate_gaps_count,
        v_large_gaps as large_gaps_count,
        v_negative_gaps as negative_gaps_count,
        v_total_gap_km as total_gap_km,
        CASE WHEN v_trip_count > 0 THEN v_total_gap_km::NUMERIC / v_trip_count ELSE 0 END as avg_gap_km,
        v_max_gap_km as max_gap_km,
        v_continuity_score as continuity_score,
        v_recommendations as recommendations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_odometer_continuity_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_vehicle_odometer_continuity(UUID, DATE, DATE) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_odometer_continuity_enhanced() IS 'Enhanced validation of odometer continuity with comprehensive gap analysis and audit logging';
COMMENT ON FUNCTION analyze_vehicle_odometer_continuity(UUID, DATE, DATE) IS 'Analyzes odometer continuity patterns for a vehicle and provides recommendations';