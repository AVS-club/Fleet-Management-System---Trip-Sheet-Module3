-- Final comprehensive fix for transport business validations
-- 1. Allow same-day trips (0 duration) but block negative durations
-- 2. Remove time-based validations (speed) since no time tracking
-- 3. Use date-based duration instead of hours
-- 4. Keep all other validations (distance, fuel, expenses)

DROP TRIGGER IF EXISTS validate_trip_value_ranges ON trips CASCADE;

CREATE OR REPLACE FUNCTION validate_trip_value_ranges()
RETURNS TRIGGER AS $$
DECLARE
    distance_km INTEGER;
    trip_duration_days INTEGER;
    kmpl NUMERIC;
    validation_errors TEXT[] := ARRAY[]::TEXT[];
    validation_warnings TEXT[] := ARRAY[]::TEXT[];
    error_message TEXT;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- =================================================================
    -- DISTANCE AND ODOMETER VALIDATIONS
    -- =================================================================

    -- Calculate distance
    IF NEW.start_km IS NOT NULL AND NEW.end_km IS NOT NULL THEN
        distance_km := NEW.end_km - NEW.start_km;

        -- Check for zero or negative distance
        IF distance_km <= 0 THEN
            validation_errors := array_append(validation_errors,
                'Zero distance recorded - if vehicle was stationary, mark as maintenance/service trip');

        -- Check for very short trips
        ELSIF distance_km < 5 THEN
            validation_warnings := array_append(validation_warnings,
                'Very short trip (' || distance_km::text || ' km) - verify odometer readings or mark as test/maintenance');

        -- Moderate distance warning (no upper limit error)
        ELSIF distance_km > 5000 THEN
            validation_warnings := array_append(validation_warnings,
                'Very long trip distance: ' || distance_km::text || ' km - consider verifying odometer readings');
        END IF;

        -- Check trip duration (date-based, not time-based)
        IF NEW.trip_start_date IS NOT NULL AND NEW.trip_end_date IS NOT NULL THEN
            -- Calculate duration in days (allows same-day trips)
            trip_duration_days := EXTRACT(DAY FROM (NEW.trip_end_date - NEW.trip_start_date));

            -- Only block if end date is BEFORE start date (negative duration)
            IF trip_duration_days < 0 THEN
                validation_errors := array_append(validation_errors,
                    'Trip end date cannot be before start date');

            -- Warn for very long trips (more than 7 days)
            ELSIF trip_duration_days > 7 THEN
                validation_warnings := array_append(validation_warnings,
                    'Very long trip: ' || trip_duration_days::text || ' days - verify dates');

            -- Warn for moderate length trips (3-7 days)
            ELSIF trip_duration_days > 3 THEN
                validation_warnings := array_append(validation_warnings,
                    'Multi-day trip: ' || trip_duration_days::text || ' days');
            END IF;
        END IF;
    END IF;

    -- NOTE: Speed validation removed - not meaningful without hour/minute tracking
    -- If you only track dates, speed calculation would be inaccurate

    -- =================================================================
    -- FUEL EFFICIENCY VALIDATIONS
    -- =================================================================

    -- Fuel efficiency validation
    -- Safe division - only calculate if fuel_quantity > 0
    IF NEW.refueling_done AND NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 THEN
        IF distance_km IS NOT NULL AND distance_km > 0 THEN
            kmpl := distance_km::NUMERIC / NEW.fuel_quantity;

            -- Very low efficiency - warning only
            IF kmpl < 2 THEN
                validation_warnings := array_append(validation_warnings,
                    'Very low fuel consumption: ' || round(kmpl, 2)::text || ' km/L - check for fuel leak or heavy load');
            ELSIF kmpl < 5 THEN
                validation_warnings := array_append(validation_warnings,
                    'Poor fuel efficiency: ' || round(kmpl, 2)::text || ' km/L - check for issues or heavy load');
            -- Very high efficiency - warning only
            ELSIF kmpl > 100 THEN
                validation_warnings := array_append(validation_warnings,
                    'Unusually high efficiency: ' || round(kmpl, 2)::text || ' km/L - verify fuel quantity');
            END IF;
        END IF;
    END IF;

    -- =================================================================
    -- EXPENSE VALIDATIONS
    -- =================================================================

    -- Fuel expense validation - warnings only
    IF NEW.fuel_expense IS NOT NULL AND NEW.fuel_expense > 0 THEN
        IF NEW.fuel_expense > 200000 THEN
            validation_warnings := array_append(validation_warnings,
                'Very high fuel expense: Rs. ' || round(NEW.fuel_expense, 2)::text || ' - verify amount');
        ELSIF NEW.fuel_expense > 50000 THEN
            validation_warnings := array_append(validation_warnings,
                'High fuel expense: Rs. ' || round(NEW.fuel_expense, 2)::text || ' - verify amount');
        END IF;

        -- Fuel price per liter check (safe division)
        IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 THEN
            DECLARE
                price_per_liter NUMERIC := NEW.fuel_expense / NEW.fuel_quantity;
            BEGIN
                IF price_per_liter > 300 THEN
                    validation_warnings := array_append(validation_warnings,
                        'Very high fuel price: Rs. ' || round(price_per_liter, 2)::text || ' per liter - verify amount');
                ELSIF price_per_liter < 50 THEN
                    validation_warnings := array_append(validation_warnings,
                        'Unusually low fuel price: Rs. ' || round(price_per_liter, 2)::text || ' per liter');
                END IF;
            END;
        END IF;
    END IF;

    -- Total expense validation - warnings only
    IF NEW.total_road_expenses IS NOT NULL AND NEW.total_road_expenses > 0 THEN
        IF NEW.total_road_expenses > 200000 THEN
            validation_warnings := array_append(validation_warnings,
                'Very high total expenses: Rs. ' || round(NEW.total_road_expenses, 2)::text || ' - verify breakdown');
        ELSIF NEW.total_road_expenses > 50000 THEN
            validation_warnings := array_append(validation_warnings,
                'High total expenses: Rs. ' || round(NEW.total_road_expenses, 2)::text || ' - verify breakdown');
        END IF;
    END IF;

    -- =================================================================
    -- WEIGHT VALIDATIONS
    -- =================================================================

    IF NEW.gross_weight IS NOT NULL THEN
        IF NEW.gross_weight > 100000 THEN
            validation_warnings := array_append(validation_warnings,
                'Very high gross weight: ' || NEW.gross_weight::text || ' kg - verify load capacity');
        ELSIF NEW.gross_weight < 0 THEN
            validation_errors := array_append(validation_errors,
                'Gross weight cannot be negative');
        END IF;
    END IF;

    -- =================================================================
    -- RAISE ERRORS IF VALIDATION FAILED
    -- =================================================================

    IF array_length(validation_errors, 1) > 0 THEN
        error_message := 'Value validation failed: ' || array_to_string(validation_errors, '; ');
        RAISE EXCEPTION '%', error_message;
    END IF;

    -- Log warnings (but allow the operation)
    IF array_length(validation_warnings, 1) > 0 THEN
        RAISE NOTICE 'Validation warnings: %', array_to_string(validation_warnings, '; ');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER validate_trip_value_ranges
    BEFORE INSERT OR UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_trip_value_ranges();

COMMENT ON FUNCTION validate_trip_value_ranges() IS
'Transport business validation: allows same-day trips, uses date-based duration, no time-based checks. Prevents division by zero and uses string concatenation for formatting.';

-- Show what changed
DO $$
BEGIN
    RAISE NOTICE '=== VALIDATION CHANGES APPLIED ===';
    RAISE NOTICE '✓ Same-day trips now ALLOWED (0 days duration)';
    RAISE NOTICE '✓ Negative durations BLOCKED (end before start)';
    RAISE NOTICE '✓ Duration calculated in DAYS (not hours)';
    RAISE NOTICE '✓ Speed validation REMOVED (no time tracking)';
    RAISE NOTICE '✓ All distance/fuel/expense validations active';
    RAISE NOTICE '✓ Division by zero errors prevented';
    RAISE NOTICE '====================================';
END $$;
