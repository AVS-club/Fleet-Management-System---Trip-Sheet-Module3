-- Diagnostic queries for AI Alerts Feed

-- 1. Check total events in events_feed
SELECT
  'Total Events' as check_name,
  COUNT(*) as count
FROM events_feed;

-- 2. Check events by kind
SELECT
  kind,
  COUNT(*) as count,
  MIN(event_time) as earliest,
  MAX(event_time) as latest
FROM events_feed
GROUP BY kind
ORDER BY count DESC;

-- 3. Check recent events (last 30 days)
SELECT
  id,
  kind,
  event_time,
  created_at,
  title,
  description,
  organization_id
FROM events_feed
WHERE event_time >= NOW() - INTERVAL '30 days'
ORDER BY event_time DESC
LIMIT 20;

-- 4. Check if there are any organization-less events
SELECT
  'Events without org_id' as check_name,
  COUNT(*) as count
FROM events_feed
WHERE organization_id IS NULL;

-- 5. Check your organization ID
SELECT
  id as organization_id,
  name as organization_name
FROM organizations
LIMIT 5;

-- 6. Check maintenance events specifically
SELECT
  id,
  event_time,
  created_at,
  title,
  entity_json->>'scheduled_date' as scheduled_date,
  organization_id
FROM events_feed
WHERE kind = 'maintenance'
ORDER BY event_time DESC
LIMIT 10;

-- 7. Check if track_entity_view function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'track_entity_view';

-- 8. Check tracking columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('vehicles', 'drivers', 'trips')
  AND column_name IN ('last_viewed_at', 'last_viewed_by', 'view_count')
ORDER BY table_name, column_name;
