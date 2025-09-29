-- Fix 4: Unrealistic Value Detection
-- Validates trip values are within realistic ranges

-- Add CHECK constraints for basic positive value validation
-- These will be added only if they don't already exist
DO $$
BEGIN
    -- Check if distance constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_positive_distance' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_positive_distance 
            CHECK ((end_km - start_km) >= 0);
    END IF;
    
    -- Check if fuel constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_positive_fuel' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_positive_fuel 
            CHECK (fuel_quantity IS NULL OR fuel_quantity >= 0);
    END IF;
    
    -- Check if expense constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_positive_expenses' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_positive_expenses 
            CHECK (
                (fuel_expense IS NULL OR fuel_expense >= 0) AND
                (driver_expense IS NULL OR driver_expense >= 0) AND
                (toll_expense IS NULL OR toll_expense >= 0) AND
                (other_expense IS NULL OR other_expense >= 0)
            );
    END IF;
END $$;

-- Function to validate trip values for realistic ranges
CREATE OR REPLACE FUNCTION validate_trip_values()
RETURNS TRIGGER AS $$
DECLARE
    distance_km INTEGER;
    trip_duration_hours NUMERIC;
    kmpl NUMERIC;
    validation_errors TEXT[];
    edge_case_reason TEXT;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Initialize validation errors array
    validation_errors := ARRAY[]::TEXT[];

    -- Calculate distance
    distance_km := NEW.end_km - NEW.start_km;

    -- Calculate trip duration in hours
    IF NEW.trip_start_date IS NOT NULL AND NEW.trip_end_date IS NOT NULL THEN
        trip_duration_hours := EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) / 3600.0;
    ELSE
        trip_duration_hours := NULL;
    END IF;

    -- Check for edge cases first
    edge_case_reason := NULL;

    -- Edge case: Maintenance trip (zero distance allowed)
    IF distance_km = 0 AND NEW.trip_type = 'maintenance' THEN
        edge_case_reason := 'Maintenance trip with zero distance';
    -- Edge case: Test trip (short distance allowed)
    ELSIF distance_km < 5 AND NEW.trip_type = 'test' THEN
        edge_case_reason := 'Test trip with minimal distance';
    -- Edge case: Refueling only trip
    ELSIF distance_km < 10 AND NEW.refueling_done = true THEN
        edge_case_reason := 'Refueling trip with short distance';
    END IF;

    -- If not an edge case, perform standard validations
    IF edge_case_reason IS NULL THEN
        -- Check for impossible distances
        IF distance_km < 0 THEN
            validation_errors := array_append(validation_errors, 
                format('Negative distance not allowed: %s km', distance_km));
        ELSIF distance_km > 2000 THEN
            validation_errors := array_append(validation_errors, 
                format('Unrealistic single trip distance: %s km (max 2000 km)', distance_km));
        END IF;

        -- Check for excessive trip duration (>48 hours)
        IF trip_duration_hours IS NOT NULL AND trip_duration_hours > 48 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive trip duration: %.1f hours (max 48 hours)', trip_duration_hours));
        END IF;

        -- Check for unrealistic speed (if duration is available)
        IF distance_km > 0 AND trip_duration_hours > 0 THEN
            IF (distance_km / trip_duration_hours) > 120 THEN
                validation_errors := array_append(validation_errors, 
                    format('Unrealistic average speed: %.1f km/h (max 120 km/h)', 
                           distance_km / trip_duration_hours));
            END IF;
        END IF;
    END IF;

    -- Check fuel efficiency if fuel was consumed
    IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 AND distance_km > 0 THEN
        kmpl := distance_km::NUMERIC / NEW.fuel_quantity;
        
        -- Check for unrealistic fuel consumption
        IF kmpl < 2 THEN
            validation_errors := array_append(validation_errors, 
                format('Unrealistic fuel consumption: %.2f km/L (min 2 km/L)', kmpl));
        ELSIF kmpl > 50 THEN
            validation_errors := array_append(validation_errors, 
                format('Unrealistic fuel efficiency: %.2f km/L (max 50 km/L)', kmpl));
        END IF;
    END IF;

    -- Check for excessive fuel quantity
    IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 500 THEN
        validation_errors := array_append(validation_errors, 
            format('Excessive fuel quantity: %.2f L (max 500 L)', NEW.fuel_quantity));
    END IF;

    -- Check for excessive expenses
    IF NEW.fuel_expense IS NOT NULL AND NEW.fuel_expense > 50000 THEN
        validation_errors := array_append(validation_errors, 
            format('Excessive fuel expense: %.2f (max 50000)', NEW.fuel_expense));
    END IF;

    IF NEW.driver_expense IS NOT NULL AND NEW.driver_expense > 10000 THEN
        validation_errors := array_append(validation_errors, 
            format('Excessive driver expense: %.2f (max 10000)', NEW.driver_expense));
    END IF;

    IF NEW.toll_expense IS NOT NULL AND NEW.toll_expense > 5000 THEN
        validation_errors := array_append(validation_errors, 
            format('Excessive toll expense: %.2f (max 5000)', NEW.toll_expense));
    END IF;

    -- If there are validation errors, raise exception
    IF array_length(validation_errors, 1) > 0 THEN
        RAISE EXCEPTION 'Value validation failed: %', array_to_string(validation_errors, '; ');
    END IF;

    -- Log edge cases and warnings to audit trail if function exists
    IF edge_case_reason IS NOT NULL OR array_length(validation_errors, 1) > 0 THEN
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'value_validation',
                'trip_data',
                'trip',
                NEW.id::TEXT,
                format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
                'validated_with_edge_case',
                jsonb_build_object(
                    'distance_km', distance_km,
                    'duration_hours', trip_duration_hours,
                    'fuel_quantity', NEW.fuel_quantity,
                    'trip_type', NEW.trip_type
                ),
                jsonb_build_object(
                    'edge_case_reason', edge_case_reason,
                    'validation_warnings', validation_errors
                ),
                CASE 
                    WHEN array_length(validation_errors, 1) > 0 THEN 'warning'
                    ELSE 'info'
                END
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for value range validation
DROP TRIGGER IF EXISTS validate_trip_value_ranges ON trips;
CREATE TRIGGER validate_trip_value_ranges
    BEFORE INSERT OR UPDATE OF start_km, end_km, fuel_quantity, fuel_expense, 
                              driver_expense, toll_expense, other_expense,
                              trip_start_date, trip_end_date, trip_type
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_trip_values();

-- Function to detect trips with edge case patterns
CREATE OR REPLACE FUNCTION detect_edge_case_trips(
    p_vehicle_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    trip_id UUID,
    trip_serial TEXT,
    trip_date DATE,
    edge_case_type TEXT,
    edge_case_details JSONB,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.trip_serial_number,
        t.trip_start_date::DATE,
        CASE 
            WHEN (t.end_km - t.start_km) = 0 AND t.trip_type = 'maintenance' THEN 'maintenance_zero_km'
            WHEN (t.end_km - t.start_km) = 0 AND t.trip_type != 'maintenance' THEN 'zero_km_non_maintenance'
            WHEN (t.end_km - t.start_km) < 5 THEN 'very_short_trip'
            WHEN (t.end_km - t.start_km) > 1500 THEN 'very_long_trip'
            WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
                 (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity < 3 THEN 'low_fuel_efficiency'
            WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
                 (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity > 40 THEN 'high_fuel_efficiency'
            WHEN EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 36 THEN 'long_duration'
            WHEN t.fuel_expense > 30000 THEN 'high_fuel_expense'
            WHEN t.driver_expense > 5000 THEN 'high_driver_expense'
            ELSE 'other'
        END as edge_case_type,
        jsonb_build_object(
            'distance_km', t.end_km - t.start_km,
            'duration_hours', ROUND(EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0, 2),
            'fuel_quantity', t.fuel_quantity,
            'fuel_efficiency', CASE 
                WHEN t.fuel_quantity > 0 THEN ROUND((t.end_km - t.start_km)::NUMERIC / t.fuel_quantity, 2)
                ELSE NULL 
            END,
            'fuel_expense', t.fuel_expense,
            'driver_expense', t.driver_expense,
            'trip_type', t.trip_type
        ) as edge_case_details,
        CASE 
            WHEN (t.end_km - t.start_km) = 0 AND t.trip_type != 'maintenance' THEN 
                'Verify if this should be marked as maintenance trip'
            WHEN (t.end_km - t.start_km) < 5 THEN 
                'Verify odometer readings are correct'
            WHEN (t.end_km - t.start_km) > 1500 THEN 
                'Verify this long-distance trip or check for missing intermediate stops'
            WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
                 (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity < 3 THEN 
                'Check fuel quantity entry - unusually low efficiency'
            WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
                 (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity > 40 THEN 
                'Verify fuel quantity - unusually high efficiency'
            WHEN EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 36 THEN 
                'Check if this should be split into multiple trips'
            WHEN t.fuel_expense > 30000 THEN 
                'Verify fuel expense amount'
            WHEN t.driver_expense > 5000 THEN 
                'Verify driver expense amount'
            ELSE 'Review trip details for accuracy'
        END as recommendation
    FROM trips t
    WHERE t.deleted_at IS NULL
        AND t.created_by = auth.uid()
        AND (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id)
        AND (p_date_from IS NULL OR t.trip_start_date >= p_date_from)
        AND (p_date_to IS NULL OR t.trip_start_date <= p_date_to)
        AND (
            (t.end_km - t.start_km) = 0 OR
            (t.end_km - t.start_km) < 5 OR
            (t.end_km - t.start_km) > 1500 OR
            (t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 0 AND 
             ((t.end_km - t.start_km)::NUMERIC / t.fuel_quantity < 3 OR
              (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity > 40)) OR
            EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 36 OR
            t.fuel_expense > 30000 OR
            t.driver_expense > 5000
        )
    ORDER BY t.trip_start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate a batch of trips
CREATE OR REPLACE FUNCTION validate_trip_batch(
    p_trip_ids UUID[]
) RETURNS TABLE (
    trip_id UUID,
    trip_serial TEXT,
    validation_status TEXT,
    validation_errors TEXT[],
    edge_cases TEXT[]
) AS $$
DECLARE
    trip_record RECORD;
    errors TEXT[];
    edge_cases_found TEXT[];
    distance_km INTEGER;
    kmpl NUMERIC;
BEGIN
    FOREACH trip_id IN ARRAY p_trip_ids LOOP
        SELECT * INTO trip_record
        FROM trips
        WHERE id = trip_id
            AND created_by = auth.uid();
        
        IF NOT FOUND THEN
            CONTINUE;
        END IF;
        
        errors := ARRAY[]::TEXT[];
        edge_cases_found := ARRAY[]::TEXT[];
        distance_km := trip_record.end_km - trip_record.start_km;
        
        -- Check various validation rules
        IF distance_km < 0 THEN
            errors := array_append(errors, 'Negative distance');
        END IF;
        
        IF distance_km > 2000 THEN
            errors := array_append(errors, 'Distance exceeds 2000km');
        END IF;
        
        IF trip_record.fuel_quantity IS NOT NULL AND trip_record.fuel_quantity > 0 THEN
            kmpl := distance_km::NUMERIC / trip_record.fuel_quantity;
            IF kmpl < 2 THEN
                errors := array_append(errors, format('Very low efficiency: %.2f km/L', kmpl));
            ELSIF kmpl > 50 THEN
                errors := array_append(errors, format('Unrealistic efficiency: %.2f km/L', kmpl));
            END IF;
        END IF;
        
        -- Check for edge cases
        IF distance_km = 0 AND trip_record.trip_type = 'maintenance' THEN
            edge_cases_found := array_append(edge_cases_found, 'Maintenance trip with zero km');
        ELSIF distance_km < 5 THEN
            edge_cases_found := array_append(edge_cases_found, 'Very short trip');
        END IF;
        
        RETURN QUERY SELECT
            trip_record.id,
            trip_record.trip_serial_number,
            CASE 
                WHEN array_length(errors, 1) > 0 THEN 'failed'
                WHEN array_length(edge_cases_found, 1) > 0 THEN 'warning'
                ELSE 'passed'
            END as validation_status,
            errors as validation_errors,
            edge_cases_found as edge_cases;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_trip_values() TO authenticated;
GRANT EXECUTE ON FUNCTION detect_edge_case_trips(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_trip_batch(UUID[]) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_trip_values() IS 'Validates trip values are within realistic ranges';
COMMENT ON FUNCTION detect_edge_case_trips IS 'Detects trips with edge case patterns that may need review';
COMMENT ON FUNCTION validate_trip_batch IS 'Validates multiple trips and returns their validation status';