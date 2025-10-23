-- Complete fix: Drop all old validation triggers and functions
-- This ensures no old code with ₹ symbol remains

-- Drop ALL validation triggers
DROP TRIGGER IF EXISTS validate_trip_value_ranges ON trips CASCADE;
DROP TRIGGER IF EXISTS check_value_ranges ON trips CASCADE;
DROP TRIGGER IF EXISTS trip_value_validation ON trips CASCADE;

-- Drop ALL old validation functions
DROP FUNCTION IF EXISTS validate_trip_value_ranges() CASCADE;
DROP FUNCTION IF EXISTS check_trip_value_ranges() CASCADE;
DROP FUNCTION IF EXISTS validate_value_ranges() CASCADE;

-- Create the ONLY validation function (with fixed format strings)
CREATE OR REPLACE FUNCTION validate_trip_value_ranges()
RETURNS TRIGGER AS $$
DECLARE
    distance_km INTEGER;
    trip_duration_hours NUMERIC;
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

        -- Check trip duration (if available)
        trip_duration_hours := EXTRACT(EPOCH FROM (NEW.trip_end_date - NEW.trip_start_date)) / 3600.0;

        IF trip_duration_hours IS NOT NULL THEN
            IF trip_duration_hours <= 0 THEN
                validation_errors := array_append(validation_errors,
                    'Trip duration must be positive');
            -- Changed to warning - multi-day trips are common
            ELSIF trip_duration_hours > 168 THEN
                validation_warnings := array_append(validation_warnings,
                    'Very long trip duration: ' || round(trip_duration_hours::numeric, 1)::text || ' hours (over 1 week) - verify dates');
            ELSIF trip_duration_hours > 72 THEN
                validation_warnings := array_append(validation_warnings,
                    'Long trip duration: ' || round(trip_duration_hours::numeric, 1)::text || ' hours - verify or split into multiple trips');
            END IF;

            -- Average speed validation
            IF distance_km > 0 THEN
                DECLARE
                    avg_speed NUMERIC := distance_km::NUMERIC / trip_duration_hours;
                BEGIN
                    IF avg_speed > 150 THEN
                        validation_warnings := array_append(validation_warnings,
                            'Very high average speed: ' || round(avg_speed, 1)::text || ' km/h - verify trip duration');
                    ELSIF avg_speed < 10 AND distance_km > 50 THEN
                        validation_warnings := array_append(validation_warnings,
                            'Very low average speed: ' || round(avg_speed, 1)::text || ' km/h - check for extended stops');
                    END IF;
                END;
            END IF;
        END IF;
    END IF;

    -- =================================================================
    -- FUEL EFFICIENCY VALIDATIONS
    -- =================================================================

    -- Fuel efficiency validation
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

    -- Fuel expense validation - warnings only, NO format() with decimals
    IF NEW.fuel_expense IS NOT NULL THEN
        IF NEW.fuel_expense > 200000 THEN
            validation_warnings := array_append(validation_warnings,
                'Very high fuel expense: Rs. ' || round(NEW.fuel_expense, 2)::text || ' - verify amount');
        ELSIF NEW.fuel_expense > 50000 THEN
            validation_warnings := array_append(validation_warnings,
                'High fuel expense: Rs. ' || round(NEW.fuel_expense, 2)::text || ' - verify amount');
        END IF;

        -- Fuel price per liter check
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
    IF NEW.total_road_expenses IS NOT NULL THEN
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

-- Create the trigger (only one)
CREATE TRIGGER validate_trip_value_ranges
    BEFORE INSERT OR UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_trip_value_ranges();

-- Add comment
COMMENT ON FUNCTION validate_trip_value_ranges() IS
'Transport business friendly validation with no hard limits on distance/mileage. Uses string concatenation instead of format() to avoid issues with special characters.';

-- Verify the trigger is active
SELECT
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as function_call
FROM information_schema.triggers
WHERE event_object_table = 'trips'
    AND trigger_name LIKE '%validate%'
ORDER BY trigger_name;
