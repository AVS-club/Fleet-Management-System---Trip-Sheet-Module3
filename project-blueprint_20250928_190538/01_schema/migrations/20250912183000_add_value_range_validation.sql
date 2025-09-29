-- Enhanced Value Range Validation (Phase 1 - Critical)
-- Comprehensive validation of trip values for realistic ranges with edge case handling

-- Add CHECK constraints for basic positive value validation (idempotent)
DO $$
BEGIN
    -- Check if distance constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_enhanced_positive_distance' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_enhanced_positive_distance 
            CHECK ((end_km - start_km) >= 0);
    END IF;
    
    -- Check if fuel constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_enhanced_positive_fuel' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_enhanced_positive_fuel 
            CHECK (fuel_quantity IS NULL OR fuel_quantity >= 0);
    END IF;
    
    -- Check if expense constraints exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_enhanced_positive_expenses' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_enhanced_positive_expenses 
            CHECK (
                (fuel_expense IS NULL OR fuel_expense >= 0) AND
                (driver_expense IS NULL OR driver_expense >= 0) AND
                (toll_expense IS NULL OR toll_expense >= 0) AND
                (other_expense IS NULL OR other_expense >= 0) AND
                (breakdown_expense IS NULL OR breakdown_expense >= 0) AND
                (miscellaneous_expense IS NULL OR miscellaneous_expense >= 0)
            );
    END IF;
    
    -- Check if realistic fuel quantity constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_realistic_fuel_quantity' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_realistic_fuel_quantity 
            CHECK (fuel_quantity IS NULL OR fuel_quantity <= 500);
    END IF;
    
    -- Check if realistic distance constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_realistic_distance' 
        AND conrelid = 'trips'::regclass
    ) THEN
        ALTER TABLE trips ADD CONSTRAINT trips_realistic_distance 
            CHECK ((end_km - start_km) <= 3000);
    END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enhanced_trip_value_validation ON trips;

-- Enhanced function to validate trip values with comprehensive range checking
CREATE OR REPLACE FUNCTION validate_trip_values_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    distance_km INTEGER;
    trip_duration_hours NUMERIC;
    avg_speed_kmh NUMERIC;
    kmpl NUMERIC;
    validation_errors TEXT[];
    validation_warnings TEXT[];
    edge_case_info JSONB;
    is_edge_case BOOLEAN := FALSE;
    severity_level TEXT := 'info';
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Initialize arrays
    validation_errors := ARRAY[]::TEXT[];
    validation_warnings := ARRAY[]::TEXT[];
    edge_case_info := jsonb_build_object();

    -- Calculate basic metrics
    distance_km := NEW.end_km - NEW.start_km;
    
    IF NEW.trip_start_date IS NOT NULL AND NEW.trip_end_date IS NOT NULL THEN
        trip_duration_hours := EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) / 3600.0;
        IF distance_km > 0 AND trip_duration_hours > 0 THEN
            avg_speed_kmh := distance_km / trip_duration_hours;
        END IF;
    END IF;

    -- =================================================================
    -- EDGE CASE DETECTION (Allowed scenarios with special handling)
    -- =================================================================
    
    -- Edge case 1: Maintenance/Service trips (zero or minimal distance)
    IF distance_km <= 5 AND (
        NEW.trip_type = 'maintenance' OR 
        NEW.trip_type = 'service' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%maintenance%' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%service%'
    ) THEN
        is_edge_case := TRUE;
        edge_case_info := edge_case_info || jsonb_build_object(
            'type', 'maintenance_trip',
            'reason', 'Vehicle maintenance/service with minimal movement'
        );
    
    -- Edge case 2: Test drive (short distance)
    ELSIF distance_km < 10 AND (
        NEW.trip_type = 'test' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%test%'
    ) THEN
        is_edge_case := TRUE;
        edge_case_info := edge_case_info || jsonb_build_object(
            'type', 'test_trip',
            'reason', 'Test drive with short distance'
        );
    
    -- Edge case 3: Refueling only trip (short distance with fuel)
    ELSIF distance_km < 15 AND NEW.refueling_done = true AND NEW.fuel_quantity > 0 THEN
        is_edge_case := TRUE;
        edge_case_info := edge_case_info || jsonb_build_object(
            'type', 'refueling_trip',
            'reason', 'Dedicated refueling trip with minimal distance'
        );
    
    -- Edge case 4: Long-haul trip (very long distance/duration)
    ELSIF (distance_km > 1000 OR trip_duration_hours > 24) AND (
        NEW.trip_type = 'long_haul' OR
        NEW.trip_type = 'interstate' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%long haul%' OR
        LOWER(COALESCE(NEW.notes, '')) LIKE '%interstate%'
    ) THEN
        is_edge_case := TRUE;
        edge_case_info := edge_case_info || jsonb_build_object(
            'type', 'long_haul_trip',
            'reason', 'Long-distance interstate/long-haul trip'
        );
        
        -- Still validate max limits for long-haul
        IF distance_km > 3000 THEN
            validation_errors := array_append(validation_errors,
                format('Even for long-haul, distance %s km exceeds maximum 3000 km', distance_km));
        END IF;
        IF trip_duration_hours > 72 THEN
            validation_errors := array_append(validation_errors,
                format('Trip duration %.1f hours exceeds maximum 72 hours for continuous driving', trip_duration_hours));
        END IF;
    END IF;

    -- =================================================================
    -- STANDARD VALIDATIONS (Applied unless it's a valid edge case)
    -- =================================================================
    
    IF NOT is_edge_case THEN
        -- Check for impossible negative distance
        IF distance_km < 0 THEN
            validation_errors := array_append(validation_errors, 
                format('CRITICAL: Negative distance (%s km) - end KM cannot be less than start KM', distance_km));
        
        -- Check for zero distance (non-edge case)
        ELSIF distance_km = 0 THEN
            validation_errors := array_append(validation_errors, 
                'Zero distance recorded - if vehicle was stationary, mark as maintenance/service trip');
        
        -- Check for very short trips (non-edge case)
        ELSIF distance_km < 5 THEN
            validation_warnings := array_append(validation_warnings, 
                format('Very short trip (%s km) - verify odometer readings or mark as test/maintenance', distance_km));
        
        -- Check for excessive single trip distance
        ELSIF distance_km > 2000 THEN
            validation_errors := array_append(validation_errors, 
                format('Unrealistic single trip distance: %s km (max 2000 km for regular trips)', distance_km));
        
        -- Moderate distance warning
        ELSIF distance_km > 1500 THEN
            validation_warnings := array_append(validation_warnings, 
                format('Very long trip distance: %s km - consider marking as long-haul', distance_km));
        END IF;

        -- Check trip duration
        IF trip_duration_hours IS NOT NULL THEN
            IF trip_duration_hours <= 0 THEN
                validation_errors := array_append(validation_errors, 
                    'Trip duration must be positive');
            ELSIF trip_duration_hours > 48 THEN
                validation_errors := array_append(validation_errors, 
                    format('Excessive trip duration: %.1f hours (max 48 hours for regular trips)', trip_duration_hours));
            ELSIF trip_duration_hours > 36 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Long trip duration: %.1f hours - verify or split into multiple trips', trip_duration_hours));
            END IF;
        END IF;

        -- Check average speed
        IF avg_speed_kmh IS NOT NULL AND distance_km > 10 THEN  -- Only check for trips > 10km
            IF avg_speed_kmh > 120 THEN
                validation_errors := array_append(validation_errors, 
                    format('Impossible average speed: %.1f km/h (max 120 km/h)', avg_speed_kmh));
            ELSIF avg_speed_kmh > 100 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('High average speed: %.1f km/h - verify trip times', avg_speed_kmh));
            ELSIF avg_speed_kmh < 5 AND distance_km > 50 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Very low average speed: %.1f km/h for %s km - check for data entry errors', avg_speed_kmh, distance_km));
            END IF;
        END IF;
    END IF;

    -- =================================================================
    -- FUEL EFFICIENCY VALIDATIONS (Applied to all trips with fuel)
    -- =================================================================
    
    IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 THEN
        -- Check fuel quantity limits
        IF NEW.fuel_quantity > 500 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive fuel quantity: %.2f L (max 500 L)', NEW.fuel_quantity));
        ELSIF NEW.fuel_quantity > 200 THEN
            validation_warnings := array_append(validation_warnings, 
                format('Large fuel quantity: %.2f L - verify entry', NEW.fuel_quantity));
        END IF;
        
        -- Calculate and check fuel efficiency
        IF distance_km > 0 THEN
            kmpl := distance_km::NUMERIC / NEW.fuel_quantity;
            
            -- Extreme efficiency issues (always check)
            IF kmpl < 1 THEN
                validation_errors := array_append(validation_errors, 
                    format('Impossible fuel consumption: %.2f km/L (min 1 km/L)', kmpl));
            ELSIF kmpl < 3 AND NOT is_edge_case THEN
                validation_errors := array_append(validation_errors, 
                    format('Unrealistic fuel consumption: %.2f km/L (min 3 km/L for normal trips)', kmpl));
            ELSIF kmpl < 5 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Poor fuel efficiency: %.2f km/L - check for issues or heavy load', kmpl));
            ELSIF kmpl > 50 THEN
                validation_errors := array_append(validation_errors, 
                    format('Impossible fuel efficiency: %.2f km/L (max 50 km/L)', kmpl));
            ELSIF kmpl > 30 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Unusually high efficiency: %.2f km/L - verify fuel quantity', kmpl));
            END IF;
        END IF;
    END IF;

    -- =================================================================
    -- EXPENSE VALIDATIONS
    -- =================================================================
    
    -- Fuel expense validation
    IF NEW.fuel_expense IS NOT NULL THEN
        IF NEW.fuel_expense > 50000 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive fuel expense: %.2f (max 50000)', NEW.fuel_expense));
        ELSIF NEW.fuel_expense > 30000 THEN
            validation_warnings := array_append(validation_warnings, 
                format('High fuel expense: %.2f - verify amount', NEW.fuel_expense));
        END IF;
        
        -- Check fuel expense vs quantity correlation
        IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 THEN
            IF NEW.fuel_expense / NEW.fuel_quantity > 200 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Fuel rate seems high: %.2f per liter', NEW.fuel_expense / NEW.fuel_quantity));
            ELSIF NEW.fuel_expense / NEW.fuel_quantity < 50 THEN
                validation_warnings := array_append(validation_warnings, 
                    format('Fuel rate seems low: %.2f per liter', NEW.fuel_expense / NEW.fuel_quantity));
            END IF;
        END IF;
    END IF;
    
    -- Driver expense validation
    IF NEW.driver_expense IS NOT NULL THEN
        IF NEW.driver_expense > 10000 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive driver expense: %.2f (max 10000)', NEW.driver_expense));
        ELSIF NEW.driver_expense > 5000 THEN
            validation_warnings := array_append(validation_warnings, 
                format('High driver expense: %.2f - verify amount', NEW.driver_expense));
        END IF;
    END IF;
    
    -- Toll expense validation
    IF NEW.toll_expense IS NOT NULL THEN
        IF NEW.toll_expense > 5000 THEN
            validation_errors := array_append(validation_errors, 
                format('Excessive toll expense: %.2f (max 5000)', NEW.toll_expense));
        ELSIF NEW.toll_expense > 2000 THEN
            validation_warnings := array_append(validation_warnings, 
                format('High toll expense: %.2f - verify amount', NEW.toll_expense));
        END IF;
    END IF;

    -- =================================================================
    -- DETERMINE SEVERITY AND HANDLE ERRORS/WARNINGS
    -- =================================================================
    
    IF array_length(validation_errors, 1) > 0 THEN
        severity_level := 'error';
        -- Raise exception with all errors
        RAISE EXCEPTION E'VALUE VALIDATION FAILED!\n%', 
            array_to_string(validation_errors, E'\n');
    ELSIF array_length(validation_warnings, 1) > 0 THEN
        severity_level := 'warning';
        -- Raise notice with warnings but allow the operation
        RAISE NOTICE E'VALUE VALIDATION WARNINGS:\n%', 
            array_to_string(validation_warnings, E'\n');
    ELSIF is_edge_case THEN
        severity_level := 'info';
        RAISE NOTICE 'Edge case detected: %', edge_case_info->>'reason';
    END IF;

    -- =================================================================
    -- AUDIT LOGGING
    -- =================================================================
    
    IF (is_edge_case OR array_length(validation_warnings, 1) > 0) AND 
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
        
        PERFORM log_audit_trail(
            'value_range_validation',
            'trip_data',
            'trip',
            NEW.id::TEXT,
            format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
            CASE 
                WHEN is_edge_case THEN 'validated_edge_case'
                ELSE 'validated_with_warnings'
            END,
            jsonb_build_object(
                'distance_km', distance_km,
                'duration_hours', trip_duration_hours,
                'avg_speed_kmh', avg_speed_kmh,
                'fuel_quantity', NEW.fuel_quantity,
                'fuel_efficiency_kmpl', kmpl,
                'trip_type', NEW.trip_type
            ),
            jsonb_build_object(
                'is_edge_case', is_edge_case,
                'edge_case_info', edge_case_info,
                'validation_warnings', validation_warnings
            ),
            severity_level,
            NULL,
            ARRAY['value_validation', 
                  CASE WHEN is_edge_case THEN 'edge_case' ELSE 'standard' END,
                  COALESCE(edge_case_info->>'type', 'normal')],
            CASE 
                WHEN is_edge_case THEN edge_case_info->>'reason'
                WHEN array_length(validation_warnings, 1) > 0 THEN array_to_string(validation_warnings, '; ')
                ELSE NULL
            END
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced trigger for value range validation
CREATE TRIGGER enhanced_trip_value_validation
    BEFORE INSERT OR UPDATE OF start_km, end_km, fuel_quantity, fuel_expense, 
                              driver_expense, toll_expense, other_expense,
                              breakdown_expense, miscellaneous_expense,
                              trip_start_date, trip_end_date, trip_type,
                              refueling_done, notes
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_trip_values_enhanced();

-- Function to analyze value anomalies across all trips
CREATE OR REPLACE FUNCTION analyze_value_anomalies(
    p_vehicle_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT (CURRENT_DATE - INTERVAL '90 days')::DATE,
    p_date_to DATE DEFAULT CURRENT_DATE,
    p_include_edge_cases BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
    anomaly_type TEXT,
    severity TEXT,
    trip_count INTEGER,
    trip_ids UUID[],
    trip_serials TEXT[],
    anomaly_details JSONB,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH anomaly_detection AS (
        SELECT 
            t.id,
            t.trip_serial_number,
            t.vehicle_id,
            t.vehicle_registration,
            t.trip_start_date,
            (t.end_km - t.start_km) as distance_km,
            t.fuel_quantity,
            CASE 
                WHEN t.fuel_quantity > 0 THEN (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity 
                ELSE NULL 
            END as kmpl,
            EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 as duration_hours,
            t.fuel_expense,
            t.driver_expense,
            t.toll_expense,
            t.trip_type,
            t.refueling_done,
            -- Anomaly detection logic
            CASE
                WHEN (t.end_km - t.start_km) < 0 THEN 'negative_distance'
                WHEN (t.end_km - t.start_km) = 0 AND t.trip_type NOT IN ('maintenance', 'service') THEN 'zero_distance_non_maintenance'
                WHEN (t.end_km - t.start_km) > 2000 THEN 'excessive_distance'
                WHEN t.fuel_quantity IS NOT NULL AND t.fuel_quantity > 300 THEN 'excessive_fuel'
                WHEN t.fuel_quantity > 0 AND (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity < 2 THEN 'poor_efficiency'
                WHEN t.fuel_quantity > 0 AND (t.end_km - t.start_km)::NUMERIC / t.fuel_quantity > 40 THEN 'suspicious_efficiency'
                WHEN EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 48 THEN 'excessive_duration'
                WHEN t.fuel_expense > 30000 THEN 'high_fuel_expense'
                WHEN t.driver_expense > 5000 THEN 'high_driver_expense'
                WHEN (t.end_km - t.start_km) > 100 AND 
                     EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0 > 0 AND
                     (t.end_km - t.start_km) / (EXTRACT(EPOCH FROM (t.trip_end_date - t.trip_start_date)) / 3600.0) > 120 THEN 'impossible_speed'
                ELSE NULL
            END as anomaly_type
        FROM trips t
        WHERE t.deleted_at IS NULL
            AND t.created_by = auth.uid()
            AND (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id)
            AND t.trip_start_date >= p_date_from
            AND t.trip_start_date <= p_date_to
    )
    SELECT 
        ad.anomaly_type,
        CASE 
            WHEN ad.anomaly_type IN ('negative_distance', 'impossible_speed', 'poor_efficiency') THEN 'critical'
            WHEN ad.anomaly_type IN ('excessive_distance', 'excessive_fuel', 'excessive_duration', 'zero_distance_non_maintenance') THEN 'high'
            WHEN ad.anomaly_type IN ('suspicious_efficiency', 'high_fuel_expense', 'high_driver_expense') THEN 'medium'
            ELSE 'low'
        END as severity,
        COUNT(*)::INTEGER as trip_count,
        array_agg(ad.id) as trip_ids,
        array_agg(ad.trip_serial_number) as trip_serials,
        jsonb_build_object(
            'avg_distance', AVG(ad.distance_km),
            'max_distance', MAX(ad.distance_km),
            'min_distance', MIN(ad.distance_km),
            'avg_efficiency', AVG(ad.kmpl),
            'vehicles_affected', COUNT(DISTINCT ad.vehicle_id),
            'date_range', jsonb_build_object(
                'from', MIN(ad.trip_start_date),
                'to', MAX(ad.trip_start_date)
            )
        ) as anomaly_details,
        CASE ad.anomaly_type
            WHEN 'negative_distance' THEN 'Critical: Review and correct odometer readings immediately'
            WHEN 'zero_distance_non_maintenance' THEN 'Mark as maintenance trip or verify odometer readings'
            WHEN 'excessive_distance' THEN 'Verify trip or split into multiple segments'
            WHEN 'excessive_fuel' THEN 'Verify fuel quantity entry'
            WHEN 'poor_efficiency' THEN 'Check vehicle condition or verify fuel/distance entries'
            WHEN 'suspicious_efficiency' THEN 'Verify fuel quantity - efficiency seems too high'
            WHEN 'excessive_duration' THEN 'Consider splitting into multiple trips'
            WHEN 'high_fuel_expense' THEN 'Verify fuel expense amount'
            WHEN 'high_driver_expense' THEN 'Review and validate driver expense'
            WHEN 'impossible_speed' THEN 'Critical: Check trip times and distances'
            ELSE 'Review trip details for accuracy'
        END as recommendation
    FROM anomaly_detection ad
    WHERE ad.anomaly_type IS NOT NULL
        AND (p_include_edge_cases OR ad.trip_type NOT IN ('maintenance', 'service', 'test', 'long_haul'))
    GROUP BY ad.anomaly_type
    ORDER BY 
        CASE 
            WHEN ad.anomaly_type IN ('negative_distance', 'impossible_speed', 'poor_efficiency') THEN 1
            WHEN ad.anomaly_type IN ('excessive_distance', 'excessive_fuel', 'excessive_duration', 'zero_distance_non_maintenance') THEN 2
            ELSE 3
        END,
        COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_trip_values_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_value_anomalies(UUID, DATE, DATE, BOOLEAN) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_trip_values_enhanced() IS 'Enhanced validation of trip values with comprehensive range checking and edge case handling';
COMMENT ON FUNCTION analyze_value_anomalies(UUID, DATE, DATE, BOOLEAN) IS 'Analyzes trips for value anomalies and provides recommendations for data quality improvement';