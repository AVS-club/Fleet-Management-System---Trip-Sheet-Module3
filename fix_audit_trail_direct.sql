-- ================================================================
-- HOTFIX: Update log_audit_trail function to support organization_id
-- ================================================================
-- Run this SQL directly in your Supabase SQL Editor to fix the issue
-- ================================================================

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS log_audit_trail(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, UUID, TEXT[], TEXT);
DROP FUNCTION IF EXISTS log_audit_trail(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, TEXT[], TEXT);

-- Create the updated function that includes organization_id
CREATE OR REPLACE FUNCTION log_audit_trail(
  p_action TEXT,
  p_category TEXT DEFAULT 'general',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_label TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'completed',
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_performed_by UUID DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_audit_id UUID;
BEGIN
  -- Get user ID (use provided or current user)
  v_user_id := COALESCE(p_performed_by, auth.uid());

  -- Get organization_id
  -- Priority: 1) Provided parameter, 2) From user's active org, 3) From organization_users
  IF p_organization_id IS NOT NULL THEN
    v_org_id := p_organization_id;
  ELSE
    -- Try to get from user's profile
    SELECT active_organization_id INTO v_org_id
    FROM profiles
    WHERE id = v_user_id;

    -- If not in profile, get from organization_users
    IF v_org_id IS NULL THEN
      SELECT organization_id INTO v_org_id
      FROM organization_users
      WHERE user_id = v_user_id
      LIMIT 1;
    END IF;
  END IF;

  -- If we still don't have an org_id, get the first available organization
  -- This is a fallback for system operations
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
  END IF;

  -- Raise error if no organization found (should not happen in production)
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create audit trail entry: No organization found';
  END IF;

  -- Insert into audit_trail with organization_id
  INSERT INTO audit_trail (
    action,
    category,
    entity_type,
    entity_id,
    entity_label,
    status,
    old_values,
    new_values,
    severity,
    created_by,
    tags,
    message,
    organization_id
  ) VALUES (
    p_action,
    p_category,
    p_entity_type,
    p_entity_id,
    p_entity_label,
    p_status,
    p_old_values,
    p_new_values,
    p_severity,
    v_user_id,
    p_tags,
    p_message,
    v_org_id
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_audit_trail(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, TEXT, UUID, TEXT[], TEXT, UUID) TO authenticated;

-- Update validate_odometer_continuity function
CREATE OR REPLACE FUNCTION validate_odometer_continuity()
RETURNS TRIGGER AS $$
DECLARE
    prev_trip RECORD;
    gap_km INTEGER;
    warning_message TEXT;
    v_org_id UUID;
BEGIN
    -- Skip validation for deleted trips
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get organization_id from the trip record
    v_org_id := NEW.organization_id;

    -- Find the previous trip for this vehicle
    SELECT * INTO prev_trip
    FROM trips
    WHERE vehicle_id = NEW.vehicle_id
        AND id != COALESCE(NEW.id, gen_random_uuid())
        AND trip_end_date < NEW.trip_start_date
        AND deleted_at IS NULL
        AND organization_id = v_org_id
    ORDER BY trip_end_date DESC
    LIMIT 1;

    -- If no previous trip exists, this is the first trip for this vehicle - allow it
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Calculate the gap between trips
    gap_km := NEW.start_km - prev_trip.end_km;

    -- Check for negative gap (odometer went backwards)
    IF gap_km < 0 THEN
        RAISE EXCEPTION 'Odometer continuity violation: Start KM (%) cannot be less than previous trip end KM (%). Previous trip: % ended on %',
            NEW.start_km,
            prev_trip.end_km,
            prev_trip.trip_serial_number,
            TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI');
    END IF;

    -- Check for large gap (>50km) - warning but allow
    IF gap_km > 50 THEN
        warning_message := format(
            'Large odometer gap detected: %s km between trips. Previous trip %s ended at %s km on %s. Current trip starts at %s km.',
            gap_km,
            prev_trip.trip_serial_number,
            prev_trip.end_km,
            TO_CHAR(prev_trip.trip_end_date, 'DD-MM-YYYY HH24:MI'),
            NEW.start_km
        );

        -- Log the warning to audit trail with organization_id
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_trail') THEN
            PERFORM log_audit_trail(
                'odometer_validation',
                'trip_data',
                'trip',
                NEW.id::TEXT,
                format('Trip %s for vehicle %s', NEW.trip_serial_number, NEW.vehicle_registration),
                'validated_with_warning',
                jsonb_build_object(
                    'gap_km', gap_km,
                    'previous_trip_id', prev_trip.id,
                    'previous_trip_serial', prev_trip.trip_serial_number,
                    'previous_end_km', prev_trip.end_km,
                    'current_start_km', NEW.start_km
                ),
                jsonb_build_object('warning', warning_message),
                'warning',
                NEW.created_by,
                ARRAY['odometer_gap', 'large_gap'],
                warning_message,
                v_org_id  -- Pass organization_id
            );
        END IF;

        -- Raise notice but allow the operation
        RAISE NOTICE '%', warning_message;
    END IF;

    -- Also validate that end_km > start_km for the current trip
    IF NEW.end_km <= NEW.start_km THEN
        RAISE EXCEPTION 'Invalid odometer reading: End KM (%) must be greater than Start KM (%)',
            NEW.end_km, NEW.start_km;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS check_odometer_continuity ON trips;
CREATE TRIGGER check_odometer_continuity
    BEFORE INSERT OR UPDATE OF start_km, end_km, trip_start_date, trip_end_date, vehicle_id
    ON trips
    FOR EACH ROW
    EXECUTE FUNCTION validate_odometer_continuity();
