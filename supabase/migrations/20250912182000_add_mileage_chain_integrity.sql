-- Enhanced Mileage Chain Integrity (Phase 1 - Critical)
-- Comprehensive mileage calculation chain integrity with enhanced deletion handling

-- Ensure soft delete columns exist
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for soft delete queries if not exists
CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON trips(deleted_at) WHERE deleted_at IS NOT NULL;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS enhanced_mileage_chain_protection ON trips;

-- Enhanced function to handle trip deletion with comprehensive chain validation
CREATE OR REPLACE FUNCTION handle_trip_deletion_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    dependent_trips_count INTEGER;
    dependent_trips_list TEXT[];
    next_refueling RECORD;
    deletion_impact JSONB;
    total_affected_trips INTEGER;
    mileage_recalc_needed BOOLEAN := FALSE;
BEGIN
    -- Only process actual deletions (not soft deletes)
    IF TG_OP = 'DELETE' THEN
        -- Check if this is a refueling trip
        IF OLD.refueling_done = true THEN
            -- Count trips that depend on this refueling for mileage calculation
            SELECT COUNT(*), array_agg(trip_serial_number ORDER BY trip_start_date)
            INTO dependent_trips_count, dependent_trips_list
            FROM trips
            WHERE vehicle_id = OLD.vehicle_id
                AND trip_start_date > OLD.trip_end_date
                AND deleted_at IS NULL
                AND refueling_done = false
                AND created_by = OLD.created_by;
            
            -- Find the next refueling trip after this one
            SELECT * INTO next_refueling
            FROM trips
            WHERE vehicle_id = OLD.vehicle_id
                AND trip_start_date > OLD.trip_end_date
                AND refueling_done = true
                AND deleted_at IS NULL
                AND created_by = OLD.created_by
            ORDER BY trip_start_date
            LIMIT 1;
            
            -- Determine impact of deletion
            IF FOUND THEN
                -- There's another refueling trip, so mileage can be recalculated
                mileage_recalc_needed := TRUE;
                deletion_impact := jsonb_build_object(
                    'impact_level', 'moderate',
                    'dependent_trips', dependent_trips_count,
                    'next_refueling_id', next_refueling.id,
                    'next_refueling_serial', next_refueling.trip_serial_number,
                    'recalculation_possible', true,
                    'message', format('Mileage will be recalculated using next refueling trip %s', next_refueling.trip_serial_number)
                );
            ELSIF dependent_trips_count > 0 THEN
                -- No next refueling, dependent trips will lose mileage calculation
                deletion_impact := jsonb_build_object(
                    'impact_level', 'high',
                    'dependent_trips', dependent_trips_count,
                    'affected_trips', dependent_trips_list,
                    'recalculation_possible', false,
                    'message', 'Warning: Dependent trips will lose tank-to-tank mileage calculation'
                );
                
                -- Soft delete with warning instead of hard delete
                UPDATE trips 
                SET 
                    deleted_at = NOW(),
                    deletion_reason = format('Soft deleted - has %s dependent non-refueling trips that would lose mileage calculation', dependent_trips_count),
                    deleted_by = auth.uid()
                WHERE id = OLD.id;
                
                -- Log to audit trail
                IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
                    PERFORM log_audit_trail(
                        'trip_deletion_prevented',
                        'trip_data',
                        'trip',
                        OLD.id::TEXT,
                        format('Refueling trip %s for vehicle %s', OLD.trip_serial_number, OLD.vehicle_registration),
                        'soft_deleted',
                        jsonb_build_object(
                            'trip_serial', OLD.trip_serial_number,
                            'vehicle_id', OLD.vehicle_id,
                            'refueling_done', OLD.refueling_done,
                            'fuel_quantity', OLD.fuel_quantity
                        ),
                        deletion_impact,
                        'warning',
                        NULL,
                        ARRAY['mileage_chain', 'soft_delete', 'dependency_protection'],
                        'Soft deleted to preserve mileage chain integrity'
                    );
                END IF;
                
                -- Prevent the actual deletion
                RETURN NULL;
            END IF;
        END IF;
        
        -- Check for odometer continuity impact
        SELECT COUNT(*) INTO total_affected_trips
        FROM trips
        WHERE vehicle_id = OLD.vehicle_id
            AND trip_start_date > OLD.trip_end_date
            AND deleted_at IS NULL
            AND created_by = OLD.created_by;
        
        IF total_affected_trips > 0 THEN
            -- Log deletion with impact analysis
            IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
                PERFORM log_audit_trail(
                    'trip_deletion',
                    'trip_data',
                    'trip',
                    OLD.id::TEXT,
                    format('Trip %s for vehicle %s', OLD.trip_serial_number, OLD.vehicle_registration),
                    'deleted',
                    jsonb_build_object(
                        'trip_serial', OLD.trip_serial_number,
                        'vehicle_id', OLD.vehicle_id,
                        'start_km', OLD.start_km,
                        'end_km', OLD.end_km,
                        'refueling_done', OLD.refueling_done
                    ),
                    jsonb_build_object(
                        'affected_trips', total_affected_trips,
                        'mileage_recalc_needed', mileage_recalc_needed,
                        'deletion_impact', deletion_impact
                    ),
                    CASE 
                        WHEN OLD.refueling_done THEN 'warning'
                        ELSE 'info'
                    END,
                    NULL,
                    ARRAY['trip_deletion', 'mileage_chain'],
                    format('%s subsequent trips may need odometer adjustment', total_affected_trips)
                );
            END IF;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced trigger for deletion protection
CREATE TRIGGER enhanced_mileage_chain_protection
BEFORE DELETE ON trips
FOR EACH ROW
EXECUTE FUNCTION handle_trip_deletion_enhanced();

-- Enhanced function to recalculate trip mileage with comprehensive chain handling
CREATE OR REPLACE FUNCTION recalculate_trip_mileage_enhanced(
    p_trip_id UUID,
    p_force_recalc BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
    success BOOLEAN,
    old_kmpl DECIMAL,
    new_kmpl DECIMAL,
    calculation_method TEXT,
    message TEXT
) AS $$
DECLARE
    trip_record RECORD;
    prev_refueling RECORD;
    calculated_kmpl DECIMAL;
    calc_method TEXT;
BEGIN
    -- Get the trip details
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id 
        AND deleted_at IS NULL
        AND created_by = auth.uid();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            NULL::DECIMAL,
            NULL::DECIMAL,
            'error'::TEXT,
            'Trip not found or access denied'::TEXT;
        RETURN;
    END IF;
    
    IF NOT trip_record.refueling_done THEN
        RETURN QUERY SELECT 
            FALSE,
            trip_record.calculated_kmpl,
            trip_record.calculated_kmpl,
            'not_applicable'::TEXT,
            'Trip is not a refueling trip'::TEXT;
        RETURN;
    END IF;
    
    IF trip_record.fuel_quantity IS NULL OR trip_record.fuel_quantity <= 0 THEN
        RETURN QUERY SELECT 
            FALSE,
            trip_record.calculated_kmpl,
            NULL::DECIMAL,
            'error'::TEXT,
            'Invalid or missing fuel quantity'::TEXT;
        RETURN;
    END IF;
    
    -- Find previous refueling trip for tank-to-tank calculation
    SELECT * INTO prev_refueling
    FROM trips
    WHERE vehicle_id = trip_record.vehicle_id
        AND trip_end_date < trip_record.trip_end_date
        AND refueling_done = true
        AND deleted_at IS NULL
        AND created_by = auth.uid()
    ORDER BY trip_end_date DESC
    LIMIT 1;
    
    IF FOUND THEN
        -- Tank-to-tank calculation (most accurate)
        calculated_kmpl := (trip_record.end_km - prev_refueling.end_km)::DECIMAL / trip_record.fuel_quantity;
        calc_method := format('tank_to_tank (from trip %s)', prev_refueling.trip_serial_number);
    ELSE
        -- Simple calculation for first refueling
        calculated_kmpl := (trip_record.end_km - trip_record.start_km)::DECIMAL / trip_record.fuel_quantity;
        calc_method := 'simple (first refueling)';
    END IF;
    
    -- Update if different or forced
    IF p_force_recalc OR 
       trip_record.calculated_kmpl IS NULL OR 
       ABS(COALESCE(trip_record.calculated_kmpl, 0) - calculated_kmpl) > 0.01 THEN
        
        UPDATE trips
        SET calculated_kmpl = calculated_kmpl
        WHERE id = p_trip_id;
        
        -- Log the recalculation
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'mileage_recalculation',
                'trip_data',
                'trip',
                p_trip_id::TEXT,
                format('Trip %s', trip_record.trip_serial_number),
                'recalculated',
                jsonb_build_object(
                    'old_kmpl', trip_record.calculated_kmpl,
                    'new_kmpl', calculated_kmpl,
                    'calculation_method', calc_method,
                    'forced', p_force_recalc
                ),
                jsonb_build_object(
                    'distance_km', CASE 
                        WHEN prev_refueling.id IS NOT NULL THEN trip_record.end_km - prev_refueling.end_km
                        ELSE trip_record.end_km - trip_record.start_km
                    END,
                    'fuel_quantity', trip_record.fuel_quantity
                ),
                'info'
            );
        END IF;
        
        RETURN QUERY SELECT 
            TRUE,
            trip_record.calculated_kmpl,
            calculated_kmpl,
            calc_method,
            format('Mileage recalculated: %.2f km/L using %s', calculated_kmpl, calc_method)::TEXT;
    ELSE
        RETURN QUERY SELECT 
            TRUE,
            trip_record.calculated_kmpl,
            trip_record.calculated_kmpl,
            calc_method,
            'No recalculation needed - mileage is already correct'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and repair mileage chain for a vehicle
CREATE OR REPLACE FUNCTION validate_and_repair_mileage_chain(
    p_vehicle_id UUID,
    p_auto_fix BOOLEAN DEFAULT FALSE,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS TABLE (
    issue_type TEXT,
    severity TEXT,
    trip_id UUID,
    trip_serial TEXT,
    issue_description TEXT,
    suggested_fix TEXT,
    auto_fixed BOOLEAN,
    fix_result TEXT
) AS $$
DECLARE
    rec RECORD;
    prev_trip RECORD;
    issue_count INTEGER := 0;
    fix_applied BOOLEAN;
    fix_message TEXT;
BEGIN
    -- Initialize previous trip
    prev_trip := NULL;
    
    -- Check each trip in chronological order
    FOR rec IN
        SELECT 
            id,
            trip_serial_number,
            trip_start_date,
            trip_end_date,
            start_km,
            end_km,
            refueling_done,
            fuel_quantity,
            calculated_kmpl
        FROM trips
        WHERE vehicle_id = p_vehicle_id
            AND deleted_at IS NULL
            AND created_by = auth.uid()
            AND (p_date_from IS NULL OR trip_start_date >= p_date_from)
            AND (p_date_to IS NULL OR trip_start_date <= p_date_to)
        ORDER BY trip_start_date
    LOOP
        fix_applied := FALSE;
        fix_message := NULL;
        
        -- Check for negative distance
        IF rec.end_km < rec.start_km THEN
            issue_count := issue_count + 1;
            RETURN QUERY SELECT
                'negative_distance'::TEXT,
                'critical'::TEXT,
                rec.id,
                rec.trip_serial_number,
                format('End KM (%s) is less than Start KM (%s)', rec.end_km, rec.start_km)::TEXT,
                format('Swap start and end KM values')::TEXT,
                FALSE,
                'Manual intervention required'::TEXT;
        END IF;
        
        -- Check odometer continuity with previous trip
        IF prev_trip IS NOT NULL THEN
            IF rec.start_km < prev_trip.end_km THEN
                issue_count := issue_count + 1;
                
                IF p_auto_fix THEN
                    -- Auto-fix by adjusting start_km
                    UPDATE trips 
                    SET start_km = prev_trip.end_km
                    WHERE id = rec.id;
                    
                    fix_applied := TRUE;
                    fix_message := format('Auto-fixed: Adjusted start KM from %s to %s', rec.start_km, prev_trip.end_km);
                END IF;
                
                RETURN QUERY SELECT
                    'odometer_regression'::TEXT,
                    'high'::TEXT,
                    rec.id,
                    rec.trip_serial_number,
                    format('Start KM (%s) is less than previous trip end KM (%s)', rec.start_km, prev_trip.end_km)::TEXT,
                    format('Adjust start KM to %s', prev_trip.end_km)::TEXT,
                    fix_applied,
                    fix_message::TEXT;
                    
            ELSIF rec.start_km > prev_trip.end_km + 100 THEN
                issue_count := issue_count + 1;
                RETURN QUERY SELECT
                    'large_odometer_gap'::TEXT,
                    'medium'::TEXT,
                    rec.id,
                    rec.trip_serial_number,
                    format('Large gap of %s km from previous trip', rec.start_km - prev_trip.end_km)::TEXT,
                    'Check for missing trips'::TEXT,
                    FALSE,
                    'Manual verification required'::TEXT;
            END IF;
        END IF;
        
        -- Check mileage calculation for refueling trips
        IF rec.refueling_done AND rec.fuel_quantity > 0 THEN
            IF rec.calculated_kmpl IS NULL THEN
                issue_count := issue_count + 1;
                
                IF p_auto_fix THEN
                    -- Recalculate mileage
                    PERFORM recalculate_trip_mileage_enhanced(rec.id, true);
                    fix_applied := TRUE;
                    fix_message := 'Auto-fixed: Recalculated mileage';
                END IF;
                
                RETURN QUERY SELECT
                    'missing_mileage_calculation'::TEXT,
                    'low'::TEXT,
                    rec.id,
                    rec.trip_serial_number,
                    'Mileage not calculated for refueling trip'::TEXT,
                    'Recalculate mileage'::TEXT,
                    fix_applied,
                    fix_message::TEXT;
                    
            ELSIF rec.calculated_kmpl < 2 OR rec.calculated_kmpl > 50 THEN
                issue_count := issue_count + 1;
                RETURN QUERY SELECT
                    'unrealistic_mileage'::TEXT,
                    'medium'::TEXT,
                    rec.id,
                    rec.trip_serial_number,
                    format('Unrealistic mileage: %.2f km/L', rec.calculated_kmpl)::TEXT,
                    'Verify fuel quantity and odometer readings'::TEXT,
                    FALSE,
                    'Manual verification required'::TEXT;
            END IF;
        END IF;
        
        -- Update previous trip reference
        prev_trip := rec;
    END LOOP;
    
    -- If no issues found, return success message
    IF issue_count = 0 THEN
        RETURN QUERY SELECT
            'no_issues'::TEXT,
            'info'::TEXT,
            NULL::UUID,
            NULL::TEXT,
            'Mileage chain validation complete - no issues found'::TEXT,
            NULL::TEXT,
            FALSE,
            'All checks passed'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recover soft-deleted trips
CREATE OR REPLACE FUNCTION recover_deleted_trip(
    p_trip_id UUID,
    p_recovery_reason TEXT
) RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    trip_record RECORD;
BEGIN
    -- Get the deleted trip
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id
        AND deleted_at IS NOT NULL
        AND created_by = auth.uid();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            'Trip not found or not deleted'::TEXT;
        RETURN;
    END IF;
    
    -- Recover the trip
    UPDATE trips
    SET 
        deleted_at = NULL,
        deletion_reason = NULL,
        deleted_by = NULL
    WHERE id = p_trip_id;
    
    -- Log the recovery
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
        PERFORM log_audit_trail(
            'trip_recovery',
            'trip_data',
            'trip',
            p_trip_id::TEXT,
            format('Trip %s for vehicle %s', trip_record.trip_serial_number, trip_record.vehicle_registration),
            'recovered',
            jsonb_build_object(
                'deleted_at', trip_record.deleted_at,
                'deletion_reason', trip_record.deletion_reason,
                'recovery_reason', p_recovery_reason
            ),
            NULL,
            'info',
            NULL,
            ARRAY['trip_recovery', 'soft_delete_reversal'],
            p_recovery_reason
        );
    END IF;
    
    RETURN QUERY SELECT 
        TRUE,
        format('Trip %s successfully recovered', trip_record.trip_serial_number)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_trip_deletion_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_trip_mileage_enhanced(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_and_repair_mileage_chain(UUID, BOOLEAN, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION recover_deleted_trip(UUID, TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION handle_trip_deletion_enhanced() IS 'Enhanced trip deletion handler that protects mileage chain integrity';
COMMENT ON FUNCTION recalculate_trip_mileage_enhanced(UUID, BOOLEAN) IS 'Enhanced mileage recalculation with tank-to-tank method and audit logging';
COMMENT ON FUNCTION validate_and_repair_mileage_chain(UUID, BOOLEAN, DATE, DATE) IS 'Validates and optionally repairs mileage chain issues for a vehicle';
COMMENT ON FUNCTION recover_deleted_trip(UUID, TEXT) IS 'Recovers a soft-deleted trip with audit logging';