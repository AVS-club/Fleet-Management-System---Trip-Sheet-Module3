-- Populate test events for AI Alerts feed
-- This will create sample events to test the chronological sorting

DO $$
DECLARE
  org_id UUID;
  vehicle_id UUID;
  driver_id UUID;
BEGIN
  -- Get the first organization ID
  SELECT id INTO org_id FROM public.organizations LIMIT 1;

  -- Get sample vehicle and driver IDs
  SELECT id INTO vehicle_id FROM public.vehicles WHERE organization_id = org_id LIMIT 1;
  SELECT id INTO driver_id FROM public.drivers WHERE organization_id = org_id LIMIT 1;

  -- Check if we have an organization
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Please create an organization first.';
  END IF;

  RAISE NOTICE 'Using organization ID: %', org_id;
  RAISE NOTICE 'Using vehicle ID: %', COALESCE(vehicle_id::text, 'none');
  RAISE NOTICE 'Using driver ID: %', COALESCE(driver_id::text, 'none');

  -- Delete old test events to avoid duplicates
  DELETE FROM public.events_feed
  WHERE metadata->>'source' IN ('test_data', 'maintenance_backfill', 'maintenance_task_creation');

  RAISE NOTICE 'Deleted old test events';

  -- Insert recent activity events (these should appear FIRST chronologically)
  INSERT INTO public.events_feed (kind, event_time, priority, title, description, entity_json, status, metadata, organization_id) VALUES
  (
    'activity',
    NOW() - INTERVAL '10 minutes', -- 10 minutes ago
    'info',
    'Vehicle Viewed',
    CASE
      WHEN vehicle_id IS NOT NULL THEN 'You viewed a vehicle'
      ELSE 'You viewed a test vehicle'
    END,
    jsonb_build_object(
      'entity_type', 'vehicles',
      'entity_id', COALESCE(vehicle_id, gen_random_uuid()),
      'entity_name', 'Test Vehicle',
      'view_count', 1
    ),
    NULL,
    jsonb_build_object('source', 'test_data', 'table', 'vehicles'),
    org_id
  ),
  (
    'activity',
    NOW() - INTERVAL '30 minutes', -- 30 minutes ago
    'info',
    'Driver Profile Viewed',
    'You viewed Amit Meshra''s profile',
    jsonb_build_object(
      'entity_type', 'drivers',
      'entity_id', COALESCE(driver_id, gen_random_uuid()),
      'entity_name', 'Amit Meshra',
      'view_count', 1
    ),
    NULL,
    jsonb_build_object('source', 'test_data', 'table', 'drivers'),
    org_id
  );

  -- Insert trip events (recent past)
  INSERT INTO public.events_feed (kind, event_time, priority, title, description, entity_json, status, metadata, organization_id) VALUES
  (
    'trip',
    NOW() - INTERVAL '2 hours',
    'info',
    'Trip Completed',
    'Trip from Mumbai to Pune completed successfully',
    jsonb_build_object(
      'distance', 150,
      'duration', '3h 30m',
      'from', 'Mumbai',
      'to', 'Pune'
    ),
    'completed',
    jsonb_build_object('source', 'test_data'),
    org_id
  ),
  (
    'trip',
    NOW() - INTERVAL '5 hours',
    'info',
    'Trip Started',
    'Trip from Pune to Mumbai started',
    jsonb_build_object(
      'from', 'Pune',
      'to', 'Mumbai'
    ),
    'active',
    jsonb_build_object('source', 'test_data'),
    org_id
  );

  -- Insert maintenance events (using NOW() for event_time, scheduled_date in metadata)
  INSERT INTO public.events_feed (kind, event_time, priority, title, description, entity_json, status, metadata, organization_id) VALUES
  (
    'maintenance',
    NOW() - INTERVAL '1 day', -- Created yesterday
    'info',
    'Maintenance Task Created',
    'Oil change scheduled for vehicle',
    jsonb_build_object(
      'vehicle_id', COALESCE(vehicle_id, gen_random_uuid()),
      'type', 'oil_change',
      'scheduled_date', (NOW() + INTERVAL '7 days')::text, -- Scheduled for next week
      'odometer_reading', 45000
    ),
    'pending',
    jsonb_build_object('source', 'test_data'),
    org_id
  ),
  (
    'maintenance',
    NOW() - INTERVAL '3 days', -- Created 3 days ago
    'info',
    'Maintenance Task Completed',
    'Tire rotation completed',
    jsonb_build_object(
      'vehicle_id', COALESCE(vehicle_id, gen_random_uuid()),
      'type', 'tire_rotation',
      'completed_date', (NOW() - INTERVAL '3 days')::text
    ),
    'completed',
    jsonb_build_object('source', 'test_data'),
    org_id
  );

  -- Insert AI alert events
  INSERT INTO public.events_feed (kind, event_time, priority, title, description, entity_json, status, metadata, organization_id) VALUES
  (
    'ai_alert',
    NOW() - INTERVAL '6 hours',
    'warn',
    'High Fuel Consumption Detected',
    'Vehicle is consuming 15% more fuel than usual',
    jsonb_build_object(
      'vehicle_id', COALESCE(vehicle_id, gen_random_uuid()),
      'alert_type', 'fuel_consumption',
      'threshold', 15
    ),
    'pending',
    jsonb_build_object('source', 'test_data'),
    org_id
  );

  -- Insert document reminder (with FUTURE expiry date in metadata, but NOW() for event_time)
  INSERT INTO public.events_feed (kind, event_time, priority, title, description, entity_json, status, metadata, organization_id) VALUES
  (
    'vehicle_doc',
    NOW() - INTERVAL '2 days', -- Reminder created 2 days ago
    'warn',
    'Insurance Expiring Soon',
    'Vehicle insurance expires in 30 days',
    jsonb_build_object(
      'vehicle_id', COALESCE(vehicle_id, gen_random_uuid()),
      'document_type', 'insurance',
      'expiry_date', (NOW() + INTERVAL '30 days')::text, -- Expires in 30 days
      'days_remaining', 30
    ),
    'pending',
    jsonb_build_object('source', 'test_data'),
    org_id
  );

  RAISE NOTICE '✅ Successfully created 8 test events for organization %', org_id;
  RAISE NOTICE '📊 Event distribution:';
  RAISE NOTICE '  - 2 activity events (vehicle/driver views)';
  RAISE NOTICE '  - 2 trip events';
  RAISE NOTICE '  - 2 maintenance events';
  RAISE NOTICE '  - 1 AI alert';
  RAISE NOTICE '  - 1 document reminder';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected chronological order (with Show Future Events OFF):';
  RAISE NOTICE '  1. Vehicle Viewed (10 min ago)';
  RAISE NOTICE '  2. Driver Profile Viewed (30 min ago)';
  RAISE NOTICE '  3. Trip Completed (2 hours ago)';
  RAISE NOTICE '  4. Trip Started (5 hours ago)';
  RAISE NOTICE '  5. AI Alert (6 hours ago)';
  RAISE NOTICE '  6. Maintenance Completed (3 days ago) - if toggle allows';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ Will be HIDDEN with Show Future Events OFF:';
  RAISE NOTICE '  - Insurance Expiring (future date)';
  RAISE NOTICE '  - Oil Change Scheduled (future date)';

END $$;

-- Verify the events were created
SELECT
  kind,
  event_time,
  title,
  entity_json->>'scheduled_date' as scheduled_date,
  entity_json->>'expiry_date' as expiry_date,
  organization_id
FROM events_feed
WHERE metadata->>'source' = 'test_data'
ORDER BY event_time DESC;
