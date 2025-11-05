-- Check if document events exist in the events_feed table
-- Run this in Supabase SQL Editor to diagnose the document display issue

-- 1. Count total document events
SELECT
  COUNT(*) as total_documents
FROM events_feed
WHERE kind = 'vehicle_doc';

-- 2. Show sample document events with their dates
SELECT
  id,
  title,
  kind,
  event_time,
  entity_json->>'expiry_date' as expiry_date,
  entity_json->>'document_type' as document_type,
  entity_json->>'days_remaining' as days_remaining,
  created_at,
  organization_id
FROM events_feed
WHERE kind = 'vehicle_doc'
ORDER BY event_time DESC
LIMIT 10;

-- 3. Check if documents have future expiry dates
SELECT
  title,
  event_time as reminder_created_at,
  entity_json->>'expiry_date' as expiry_date,
  CASE
    WHEN event_time > NOW() THEN 'FUTURE event_time (PROBLEM!)'
    ELSE 'PAST event_time (OK)'
  END as event_time_status,
  CASE
    WHEN (entity_json->>'expiry_date')::timestamp > NOW() THEN 'FUTURE expiry (OK)'
    ELSE 'PAST expiry'
  END as expiry_status
FROM events_feed
WHERE kind = 'vehicle_doc'
ORDER BY event_time DESC;

-- 4. If no documents exist, you can insert test documents with:
/*
INSERT INTO events_feed (kind, event_time, title, description, entity_json, priority, status, organization_id)
SELECT
  'vehicle_doc',
  NOW() - INTERVAL '1 day',  -- Created yesterday (PAST)
  'Insurance Expiring Soon - ' || registration_number,
  'Vehicle insurance expires in 30 days',
  jsonb_build_object(
    'document_type', 'insurance',
    'expiry_date', NOW() + INTERVAL '30 days',  -- Expires in 30 days (FUTURE)
    'days_remaining', 30,
    'vehicle_id', id,
    'registration_number', registration_number
  ),
  'warn',
  'pending',
  organization_id
FROM vehicles
WHERE organization_id = (SELECT id FROM organizations LIMIT 1)
LIMIT 3;
*/
