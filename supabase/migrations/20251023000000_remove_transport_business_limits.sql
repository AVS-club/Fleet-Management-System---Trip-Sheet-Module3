-- Remove unrealistic validation limits for transport business
-- Transport vehicles can travel >2000 km in a single trip
-- Some vehicles (two-wheelers, efficient cars) can achieve >30 km/L

-- Drop the existing trigger
DROP TRIGGER IF EXISTS validate_trip_value_ranges ON trips;

-- Get the existing function definition and recreate it with modified limits
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

        -- Check for very short trips (non-edge case)
        ELSIF distance_km < 5 THEN
            validation_warnings := array_append(validation_warnings,
                format('Very short trip (%s km) - verify odometer readings or mark as test/maintenance', distance_km));

        -- REMOVED: Excessive single trip distance check (was 2000 km limit)
        -- Transport businesses can have trips >2000 km

        -- Moderate distance warning (increased threshold)
        ELSIF distance_km > 5000 THEN
            validation_warnings := array_append(validation_warnings,
                format('Very long trip distance: %s km - consider verifying odometer readings', distance_km));
        END IF;

        -- Check trip duration
        IF trip_duration_hours IS NOT NULL THEN
            IF trip_duration_hours <= 0 THEN
                validation_errors := array_append(validation_errors,
                    'Trip duration must be positive');
            -- Changed to warning - multi-day trips are common in transport
            ELSIF trip_duration_hours > 168 THEN
                validation_warnings := array_append(validation_warnings,
                    format('Very long trip duration: %.1f hours (over 1 week) - verify dates', trip_duration_hours));
            ELSIF trip_duration_hours > 72 THEN
                validation_warnings := array_append(validation_warnings,
                    format('Long trip duration: %.1f hours - verify or split into multiple trips', trip_duration_hours));
            END IF;

            -- Average speed validation (only if distance and duration available)
            IF distance_km > 0 THEN
                DECLARE
                    avg_speed NUMERIC := distance_km::NUMERIC / trip_duration_hours;
                BEGIN
                    IF avg_speed > 150 THEN
                        validation_warnings := array_append(validation_warnings,
                            format('Very high average speed: %.1f km/h - verify trip duration', avg_speed));
                    ELSIF avg_speed < 10 AND distance_km > 50 THEN
                        validation_warnings := array_append(validation_warnings,
                            format('Very low average speed: %.1f km/h - check for extended stops', avg_speed));
                    END IF;
                END;
            END IF;
        END IF;
    END IF;

    -- =================================================================
    -- FUEL EFFICIENCY VALIDATIONS
    -- =================================================================

    -- Fuel efficiency validation (if refueling data available)
    IF NEW.refueling_done AND NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 THEN
        IF distance_km IS NOT NULL AND distance_km > 0 THEN
            kmpl := distance_km::NUMERIC / NEW.fuel_quantity;

            -- Check for very low efficiency - changed to warning
            IF kmpl < 2 THEN
                validation_warnings := array_append(validation_warnings,
                    format('Very low fuel consumption: %.2f km/L - check for fuel leak or heavy load', kmpl));
            ELSIF kmpl < 5 THEN
                validation_warnings := array_append(validation_warnings,
                    format('Poor fuel efficiency: %.2f km/L - check for issues or heavy load', kmpl));

            -- REMOVED: 30 km/L and 50 km/L upper limits
            -- Two-wheelers and efficient vehicles can exceed these values
            -- Only flag extremely unrealistic values
            ELSIF kmpl > 100 THEN
                validation_warnings := array_append(validation_warnings,
                    format('Unusually high efficiency: %.2f km/L - verify fuel quantity', kmpl));
            END IF;
        END IF;
    END IF;

    -- =================================================================
    -- EXPENSE VALIDATIONS
    -- =================================================================

    -- Fuel expense validation - changed to warnings only
    IF NEW.fuel_expense IS NOT NULL THEN
        IF NEW.fuel_expense > 200000 THEN
            validation_warnings := array_append(validation_warnings,
                format('Very high fuel expense: ₹%.2f - verify amount', NEW.fuel_expense));
        ELSIF NEW.fuel_expense > 50000 THEN
            validation_warnings := array_append(validation_warnings,
                format('High fuel expense: %.2f - verify amount', NEW.fuel_expense));
        END IF;

        -- Check fuel expense vs quantity correlation
        IF NEW.fuel_quantity IS NOT NULL AND NEW.fuel_quantity > 0 THEN
            DECLARE
                price_per_liter NUMERIC := NEW.fuel_expense / NEW.fuel_quantity;
            BEGIN
                IF price_per_liter > 300 THEN
                    validation_warnings := array_append(validation_warnings,
                        format('Very high fuel price: ₹%.2f per liter - verify amount', price_per_liter));
                ELSIF price_per_liter < 50 THEN
                    validation_warnings := array_append(validation_warnings,
                        format('Unusually low fuel price: %.2f per liter', price_per_liter));
                END IF;
            END;
        END IF;
    END IF;

    -- Total expense validation - changed to warnings only
    IF NEW.total_road_expenses IS NOT NULL THEN
        IF NEW.total_road_expenses > 200000 THEN
            validation_warnings := array_append(validation_warnings,
                format('Very high total expenses: ₹%.2f - verify breakdown', NEW.total_road_expenses));
        ELSIF NEW.total_road_expenses > 50000 THEN
            validation_warnings := array_append(validation_warnings,
                format('High total expenses: %.2f - verify breakdown', NEW.total_road_expenses));
        END IF;
    END IF;

    -- =================================================================
    -- WEIGHT VALIDATIONS
    -- =================================================================

    IF NEW.gross_weight IS NOT NULL THEN
        IF NEW.gross_weight > 100000 THEN
            validation_warnings := array_append(validation_warnings,
                format('Very high gross weight: %s kg - verify load capacity', NEW.gross_weight));
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

-- Recreate the trigger
CREATE TRIGGER validate_trip_value_ranges
    BEFORE INSERT OR UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_trip_value_ranges();

-- Add comment explaining the changes
COMMENT ON FUNCTION validate_trip_value_ranges() IS
'Validates trip value ranges with relaxed limits suitable for transport business. Removed 2000km distance limit and 30km/L mileage limit to accommodate long-haul trips and efficient vehicles (two-wheelers, etc).';
