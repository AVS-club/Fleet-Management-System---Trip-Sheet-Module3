-- Fix 5: Data Correction Cascade Management
-- Create audit table for tracking corrections

-- Create trip_corrections table for audit tracking
CREATE TABLE IF NOT EXISTS trip_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    correction_reason TEXT,
    affects_subsequent_trips BOOLEAN DEFAULT false,
    corrected_by UUID REFERENCES auth.users(id),
    corrected_at TIMESTAMP DEFAULT NOW()
);

-- Add soft delete columns to trips table if they don't exist
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index for correction lookups
CREATE INDEX IF NOT EXISTS idx_trip_corrections_trip_id ON trip_corrections(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_corrections_corrected_at ON trip_corrections(corrected_at);

-- Function to handle trip deletion with chain validation (for mileage chain integrity)
CREATE OR REPLACE FUNCTION handle_trip_deletion()
RETURNS TRIGGER AS $$
DECLARE
    dependent_trips_count INTEGER;
BEGIN
    -- Check if this is a refueling trip
    IF OLD.refueling_done = true THEN
        -- Count trips that depend on this refueling
        SELECT COUNT(*) INTO dependent_trips_count
        FROM trips
        WHERE vehicle_id = OLD.vehicle_id
            AND trip_start_date > OLD.trip_end_date
            AND deleted_at IS NULL
            AND refueling_done = false;
        
        IF dependent_trips_count > 0 THEN
            -- Soft delete instead of hard delete
            UPDATE trips 
            SET deleted_at = NOW(),
                deletion_reason = 'Soft deleted - has dependent non-refueling trips'
            WHERE id = OLD.id;
            
            -- Prevent the actual deletion
            RETURN NULL;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deletion protection
DROP TRIGGER IF EXISTS preserve_mileage_chain ON trips;
CREATE TRIGGER preserve_mileage_chain
BEFORE DELETE ON trips
FOR EACH ROW
EXECUTE FUNCTION handle_trip_deletion();

-- Function to recalculate trip mileage for chain integrity
CREATE OR REPLACE FUNCTION recalculate_trip_mileage(
    p_trip_id UUID
) RETURNS VOID AS $$
DECLARE
    trip_record RECORD;
    prev_refueling RECORD;
BEGIN
    -- Get the trip details
    SELECT * INTO trip_record
    FROM trips
    WHERE id = p_trip_id AND deleted_at IS NULL;
    
    IF NOT FOUND OR NOT trip_record.refueling_done THEN
        RETURN;
    END IF;
    
    -- Find previous refueling trip
    SELECT * INTO prev_refueling
    FROM trips
    WHERE vehicle_id = trip_record.vehicle_id
        AND trip_end_date < trip_record.trip_end_date
        AND refueling_done = true
        AND deleted_at IS NULL
    ORDER BY trip_end_date DESC
    LIMIT 1;
    
    IF FOUND THEN
        -- Tank-to-tank calculation
        UPDATE trips
        SET calculated_kmpl = (trip_record.end_km - prev_refueling.end_km) / 
                              NULLIF(trip_record.fuel_quantity, 0)
        WHERE id = p_trip_id;
    ELSE
        -- Simple calculation for first refueling
        UPDATE trips
        SET calculated_kmpl = (trip_record.end_km - trip_record.start_km) / 
                              NULLIF(trip_record.fuel_quantity, 0)
        WHERE id = p_trip_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for trip_corrections
ALTER TABLE trip_corrections ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own corrections
CREATE POLICY "Users can view own trip corrections" ON trip_corrections
FOR SELECT USING (corrected_by = auth.uid());

-- Policy for users to insert corrections for their own trips
CREATE POLICY "Users can insert trip corrections" ON trip_corrections
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM trips 
        WHERE trips.id = trip_corrections.trip_id 
        AND trips.created_by = auth.uid()
    )
);

-- Create atomic cascade function for proper transaction handling
CREATE OR REPLACE FUNCTION cascade_odometer_correction_atomic(
    p_trip_id UUID,
    p_new_end_km INTEGER,
    p_correction_reason TEXT
) RETURNS TABLE(
    affected_trip_id UUID,
    trip_serial_number TEXT,
    old_start_km INTEGER,
    new_start_km INTEGER,
    old_end_km INTEGER,
    new_end_km INTEGER
) AS $$
DECLARE
    current_trip RECORD;
    km_difference INTEGER;
    trip_record RECORD;
BEGIN
    -- Get current trip data with security check
    SELECT * INTO current_trip
    FROM trips
    WHERE id = p_trip_id AND created_by = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip not found or access denied';
    END IF;
    
    km_difference := p_new_end_km - current_trip.end_km;
    
    -- Update current trip
    UPDATE trips
    SET end_km = p_new_end_km
    WHERE id = p_trip_id;
    
    -- Recalculate current trip's mileage if it's a refueling trip
    IF current_trip.refueling_done = true THEN
        PERFORM recalculate_trip_mileage(p_trip_id);
    END IF;
    
    -- Log current trip correction
    INSERT INTO trip_corrections (
        trip_id, field_name, old_value, new_value, 
        correction_reason, affects_subsequent_trips, corrected_by
    ) VALUES (
        p_trip_id, 'end_km', 
        current_trip.end_km::TEXT, 
        p_new_end_km::TEXT,
        p_correction_reason, true, auth.uid()
    );
    
    -- If no difference, return empty
    IF km_difference = 0 THEN
        RETURN;
    END IF;
    
    -- Update all subsequent trips for the same vehicle (same user only)
    FOR trip_record IN
        SELECT id, trip_serial_number, start_km, end_km
        FROM trips
        WHERE vehicle_id = current_trip.vehicle_id
            AND trip_start_date > current_trip.trip_end_date
            AND deleted_at IS NULL
            AND created_by = auth.uid()
        ORDER BY trip_start_date
    LOOP
        -- Update the trip's odometer readings
        UPDATE trips
        SET start_km = start_km + km_difference,
            end_km = end_km + km_difference
        WHERE id = trip_record.id;
        
        -- Recalculate mileage using proper tank-to-tank logic for refueling trips
        IF EXISTS (SELECT 1 FROM trips WHERE id = trip_record.id AND refueling_done = true) THEN
            PERFORM recalculate_trip_mileage(trip_record.id);
        END IF;
        
        -- Log the cascade correction
        INSERT INTO trip_corrections (
            trip_id, field_name, old_value, new_value, 
            correction_reason, affects_subsequent_trips, corrected_by
        ) VALUES (
            trip_record.id, 'odometer_cascade', 
            format('%s-%s', trip_record.start_km, trip_record.end_km), 
            format('%s-%s', trip_record.start_km + km_difference, trip_record.end_km + km_difference),
            p_correction_reason, true, auth.uid()
        );
        
        -- Return affected trip info
        RETURN QUERY SELECT 
            trip_record.id,
            trip_record.trip_serial_number,
            trip_record.start_km,
            trip_record.start_km + km_difference,
            trip_record.end_km,
            trip_record.end_km + km_difference;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create preview function (read-only)
CREATE OR REPLACE FUNCTION preview_cascade_impact(
    p_trip_id UUID,
    p_new_end_km INTEGER
) RETURNS TABLE(
    trip_serial_number TEXT,
    current_start_km INTEGER,
    new_start_km INTEGER
) AS $$
DECLARE
    current_trip RECORD;
    km_difference INTEGER;
BEGIN
    -- Get current trip data with security check
    SELECT vehicle_id, end_km, trip_end_date INTO current_trip
    FROM trips
    WHERE id = p_trip_id AND created_by = auth.uid();
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    km_difference := p_new_end_km - current_trip.end_km;
    
    -- Return preview of affected trips
    RETURN QUERY
    SELECT 
        t.trip_serial_number,
        t.start_km,
        t.start_km + km_difference
    FROM trips t
    WHERE t.vehicle_id = current_trip.vehicle_id
        AND t.trip_start_date > current_trip.trip_end_date
        AND t.deleted_at IS NULL
        AND t.created_by = auth.uid()
    ORDER BY t.trip_start_date
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON trip_corrections TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION cascade_odometer_correction_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION preview_cascade_impact TO authenticated;