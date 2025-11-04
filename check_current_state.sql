-- Quick check of current state

-- 1. Count total events
SELECT 'Total events in feed' as info, COUNT(*) as count FROM events_feed;

-- 2. Check if you have an organization
SELECT 'Organizations' as info, COUNT(*) as count FROM organizations;

-- 3. Check if you have vehicles
SELECT 'Vehicles' as info, COUNT(*) as count FROM vehicles;

-- 4. Check if you have drivers
SELECT 'Drivers' as info, COUNT(*) as count FROM drivers;

-- 5. Check if you have trips
SELECT 'Trips' as info, COUNT(*) as count FROM trips;

-- 6. Show your organization ID (you'll need this)
SELECT
  id as organization_id,
  name as organization_name
FROM organizations
LIMIT 1;

-- 7. If events exist, show the most recent ones
SELECT
  kind,
  event_time,
  title,
  organization_id
FROM events_feed
ORDER BY event_time DESC
LIMIT 10;
