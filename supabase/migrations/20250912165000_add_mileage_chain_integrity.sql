-- Fix 3: Mileage Calculation Chain Integrity
-- Additional functions for comprehensive mileage chain integrity beyond correction cascade

-- Ensure deleted_at column exists for soft deletion (may already exist from correction cascade)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Function to validate mileage calculation chain
CREATE OR REPLACE FUNCTION validate_mileage_chain(
    p_vehicle_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    trip_id UUID,
    trip_serial TEXT,
    trip_date DATE,
    is_refueling BOOLEAN,
    fuel_quantity DECIMAL,
    distance_km INTEGER,
    calculated_kmpl DECIMAL,
    expected_kmpl DECIMAL,
    chain_valid BOOLEAN,
    validation_message TEXT
) AS $$
DECLARE
    trip_record RECORD;
    prev_refueling RECORD;
    expected_mileage DECIMAL;
    total_distance INTEGER;
    total_fuel DECIMAL;
BEGIN
    -- Initialize previous refueling as NULL
    prev_refueling := NULL;
    
    FOR trip_record IN
        SELECT 
            t.id,
            t.trip_serial_number,
            t.trip_start_date::DATE as trip_date,
            t.refueling_done,
            t.fuel_quantity,
            t.start_km,
            t.end_km,
            t.calculated_kmpl
        FROM trips t
        WHERE t.vehicle_id = p_vehicle_id
            AND t.deleted_at IS NULL
            AND t.created_by = auth.uid()
            AND (p_date_from IS NULL OR t.trip_start_date >= p_date_from)
            AND (p_date_to IS NULL OR t.trip_start_date <= p_date_to)
        ORDER BY t.trip_start_date
    LOOP
        IF trip_record.refueling_done THEN
            -- This is a refueling trip
            IF prev_refueling IS NOT NULL THEN
                -- Calculate expected mileage based on tank-to-tank method
                total_distance := trip_record.end_km - prev_refueling.end_km;
                total_fuel := trip_record.fuel_quantity;
                
                IF total_fuel > 0 THEN
                    expected_mileage := total_distance::DECIMAL / total_fuel;
                ELSE
                    expected_mileage := NULL;
                END IF;
                
                -- Return validation result
                RETURN QUERY SELECT
                    trip_record.id,
                    trip_record.trip_serial_number,
                    trip_record.trip_date,
                    trip_record.refueling_done,
                    trip_record.fuel_quantity,
                    total_distance,
                    trip_record.calculated_kmpl,
                    expected_mileage,
                    COALESCE(ABS(trip_record.calculated_kmpl - expected_mileage) < 0.5, FALSE) as chain_valid,
                    CASE 
                        WHEN expected_mileage IS NULL THEN 'No fuel quantity recorded'
                        WHEN ABS(COALESCE(trip_record.calculated_kmpl, 0) - expected_mileage) < 0.5 THEN 'Chain valid'
                        ELSE format('Mismatch: calculated=%s, expected=%s', 
                                   COALESCE(trip_record.calculated_kmpl::TEXT, 'NULL'), 
                                   expected_mileage::TEXT)
                    END as validation_message;
            ELSE
                -- First refueling trip
                RETURN QUERY SELECT
                    trip_record.id,
                    trip_record.trip_serial_number,
                    trip_record.trip_date,
                    trip_record.refueling_done,
                    trip_record.fuel_quantity,
                    trip_record.end_km - trip_record.start_km,
                    trip_record.calculated_kmpl,
                    NULL::DECIMAL,
                    TRUE,
                    'First refueling trip - no previous reference' as validation_message;
            END IF;
            
            -- Update previous refueling reference
            prev_refueling := trip_record;
        ELSE
            -- Non-refueling trip
            RETURN QUERY SELECT
                trip_record.id,
                trip_record.trip_serial_number,
                trip_record.trip_date,
                trip_record.refueling_done,
                trip_record.fuel_quantity,
                trip_record.end_km - trip_record.start_km,
                trip_record.calculated_kmpl,
                NULL::DECIMAL,
                TRUE,
                'Non-refueling trip - not part of chain calculation' as validation_message;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rebuild mileage chain for a vehicle
CREATE OR REPLACE FUNCTION rebuild_mileage_chain(
    p_vehicle_id UUID,
    p_recalculate_all BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
    trips_processed INTEGER,
    refueling_trips_updated INTEGER,
    chain_status TEXT
) AS $$
DECLARE
    trip_count INTEGER := 0;
    refueling_count INTEGER := 0;
    trip_record RECORD;
    prev_refueling RECORD;
    new_kmpl DECIMAL;
BEGIN
    -- Initialize
    prev_refueling := NULL;
    
    -- Process all trips in chronological order
    FOR trip_record IN
        SELECT 
            id,
            trip_serial_number,
            start_km,
            end_km,
            refueling_done,
            fuel_quantity,
            calculated_kmpl
        FROM trips
        WHERE vehicle_id = p_vehicle_id
            AND deleted_at IS NULL
            AND created_by = auth.uid()
        ORDER BY trip_start_date
    LOOP
        trip_count := trip_count + 1;
        
        IF trip_record.refueling_done AND trip_record.fuel_quantity > 0 THEN
            IF prev_refueling IS NOT NULL THEN
                -- Calculate tank-to-tank mileage
                new_kmpl := (trip_record.end_km - prev_refueling.end_km)::DECIMAL / trip_record.fuel_quantity;
                
                -- Update if different or if recalculate_all is true
                IF p_recalculate_all OR 
                   trip_record.calculated_kmpl IS NULL OR 
                   ABS(COALESCE(trip_record.calculated_kmpl, 0) - new_kmpl) > 0.01 THEN
                    
                    UPDATE trips
                    SET calculated_kmpl = new_kmpl
                    WHERE id = trip_record.id;
                    
                    refueling_count := refueling_count + 1;
                    
                    -- Log to audit trail if function exists
                    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
                        PERFORM log_audit_trail(
                            'mileage_recalculation',
                            'trip_data',
                            'trip',
                            trip_record.id::TEXT,
                            format('Trip %s', trip_record.trip_serial_number),
                            'recalculated',
                            jsonb_build_object(
                                'old_kmpl', trip_record.calculated_kmpl,
                                'new_kmpl', new_kmpl,
                                'distance', trip_record.end_km - prev_refueling.end_km,
                                'fuel', trip_record.fuel_quantity
                            ),
                            NULL,
                            'info'
                        );
                    END IF;
                END IF;
            END IF;
            
            -- Update reference to previous refueling
            prev_refueling := trip_record;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        trip_count as trips_processed,
        refueling_count as refueling_trips_updated,
        format('Processed %s trips, updated %s refueling calculations', trip_count, refueling_count) as chain_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect and fix mileage chain breaks
CREATE OR REPLACE FUNCTION detect_mileage_chain_breaks(
    p_vehicle_id UUID
) RETURNS TABLE (
    break_location TEXT,
    trip_before_id UUID,
    trip_before_serial TEXT,
    trip_after_id UUID,
    trip_after_serial TEXT,
    gap_km INTEGER,
    gap_type TEXT,
    suggested_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH trip_pairs AS (
        SELECT 
            t1.id as before_id,
            t1.trip_serial_number as before_serial,
            t1.end_km as before_end_km,
            t1.trip_end_date as before_end_date,
            t2.id as after_id,
            t2.trip_serial_number as after_serial,
            t2.start_km as after_start_km,
            t2.trip_start_date as after_start_date
        FROM trips t1
        INNER JOIN trips t2 ON (
            t1.vehicle_id = t2.vehicle_id
            AND t1.trip_end_date < t2.trip_start_date
            AND t1.deleted_at IS NULL
            AND t2.deleted_at IS NULL
            AND t1.created_by = auth.uid()
            AND t2.created_by = auth.uid()
        )
        WHERE t1.vehicle_id = p_vehicle_id
            AND NOT EXISTS (
                -- No trip between t1 and t2
                SELECT 1 FROM trips t3
                WHERE t3.vehicle_id = p_vehicle_id
                    AND t3.trip_start_date > t1.trip_end_date
                    AND t3.trip_end_date < t2.trip_start_date
                    AND t3.deleted_at IS NULL
                    AND t3.created_by = auth.uid()
            )
    )
    SELECT 
        format('Between %s and %s', 
               TO_CHAR(before_end_date, 'DD-MM-YYYY'), 
               TO_CHAR(after_start_date, 'DD-MM-YYYY')) as break_location,
        before_id,
        before_serial,
        after_id,
        after_serial,
        (after_start_km - before_end_km) as gap_km,
        CASE 
            WHEN (after_start_km - before_end_km) < 0 THEN 'negative_gap'
            WHEN (after_start_km - before_end_km) = 0 THEN 'continuous'
            WHEN (after_start_km - before_end_km) > 100 THEN 'large_gap'
            ELSE 'small_gap'
        END as gap_type,
        CASE 
            WHEN (after_start_km - before_end_km) < 0 THEN 
                format('Fix odometer: Trip %s should start at %s km or higher', after_serial, before_end_km)
            WHEN (after_start_km - before_end_km) > 100 THEN 
                'Check for missing trips or validate large gap is legitimate'
            WHEN (after_start_km - before_end_km) > 0 THEN 
                'Small gap - likely legitimate vehicle movement without trip logging'
            ELSE 'Chain is continuous'
        END as suggested_action
    FROM trip_pairs
    WHERE (after_start_km - before_end_km) != 0
    ORDER BY before_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_mileage_chain(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_mileage_chain(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_mileage_chain_breaks(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION validate_mileage_chain IS 'Validates the mileage calculation chain for a vehicle';
COMMENT ON FUNCTION rebuild_mileage_chain IS 'Rebuilds the mileage calculation chain for a vehicle';
COMMENT ON FUNCTION detect_mileage_chain_breaks IS 'Detects breaks in the odometer continuity chain';