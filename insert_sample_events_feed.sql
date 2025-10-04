-- Insert sample events for testing (only if no events exist)
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
  
  -- Only insert if no events exist and we have an organization
  IF org_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.events_feed LIMIT 1) THEN
    
    -- Insert AI Alert events
    INSERT INTO public.events_feed (kind, priority, title, description, entity_json, status, organization_id, event_time) VALUES
    ('ai_alert', 'danger', 'High Fuel Consumption Detected', 'Vehicle KA-01-AB-1234 is consuming 15% more fuel than usual. Consider maintenance check.', 
     '{"vehicle_id": "' || COALESCE(vehicle_id::text, 'sample-vehicle-id') || '", "alert_type": "fuel_consumption", "threshold": 15}', 
     'pending', org_id, NOW() - INTERVAL '2 hours'),
    
    ('ai_alert', 'warn', 'Driver Performance Alert', 'Driver John Doe has 3 late arrivals this week. Consider performance review.', 
     '{"driver_id": "' || COALESCE(driver_id::text, 'sample-driver-id') || '", "alert_type": "performance", "metric": "late_arrivals", "count": 3}', 
     'pending', org_id, NOW() - INTERVAL '4 hours'),
    
    ('ai_alert', 'info', 'Route Optimization Suggestion', 'Alternative route available that could save 15 minutes and 2km distance.', 
     '{"route_type": "optimization", "savings": {"time": "15 minutes", "distance": "2km"}}', 
     'accepted', org_id, NOW() - INTERVAL '6 hours');
    
    -- Insert Vehicle Document events
    INSERT INTO public.events_feed (kind, priority, title, description, entity_json, status, organization_id, event_time) VALUES
    ('vehicle_doc', 'warn', 'RC Expiry Reminder', 'Registration Certificate for KA-01-AB-1234 expires in 15 days.', 
     '{"vehicle_id": "' || COALESCE(vehicle_id::text, 'sample-vehicle-id') || '", "document_type": "rc", "expiry_date": "2024-02-15"}', 
     'pending', org_id, NOW() - INTERVAL '1 day'),
    
    ('vehicle_doc', 'danger', 'Insurance Expired', 'Insurance for KA-02-CD-5678 expired 3 days ago. Immediate action required.', 
     '{"vehicle_id": "' || COALESCE(vehicle_id::text, 'sample-vehicle-id') || '", "document_type": "insurance", "expiry_date": "2024-01-27"}', 
     'pending', org_id, NOW() - INTERVAL '3 days');
    
    -- Insert Maintenance events
    INSERT INTO public.events_feed (kind, priority, title, description, entity_json, status, organization_id, event_time) VALUES
    ('maintenance', 'warn', 'Service Due Soon', 'KA-01-AB-1234 is due for service in 500km or 7 days.', 
     '{"vehicle_id": "' || COALESCE(vehicle_id::text, 'sample-vehicle-id') || '", "service_type": "regular", "due_km": 500, "due_days": 7}', 
     'pending', org_id, NOW() - INTERVAL '2 days'),
    
    ('maintenance', 'info', 'Maintenance Completed', 'Oil change completed for KA-02-CD-5678. Next service due in 10,000km.', 
     '{"vehicle_id": "' || COALESCE(vehicle_id::text, 'sample-vehicle-id') || '", "service_type": "oil_change", "next_service_km": 10000}', 
     'completed', org_id, NOW() - INTERVAL '5 days');
    
    -- Insert Trip events
    INSERT INTO public.events_feed (kind, priority, title, description, entity_json, status, organization_id, event_time) VALUES
    ('trip', 'info', 'Trip Completed', 'Trip from Mumbai to Pune completed successfully. Distance: 150km, Duration: 3h 30m.', 
     '{"trip_id": "sample-trip-1", "from": "Mumbai", "to": "Pune", "distance": 150, "duration": "3h 30m"}', 
     'completed', org_id, NOW() - INTERVAL '1 hour'),
    
    ('trip', 'warn', 'Route Deviation Detected', 'Driver took alternative route adding 20km to planned distance.', 
     '{"trip_id": "sample-trip-2", "deviation_km": 20, "reason": "traffic_avoidance"}', 
     'pending', org_id, NOW() - INTERVAL '3 hours');
    
    -- Insert KPI events
    INSERT INTO public.events_feed (kind, priority, title, description, entity_json, status, organization_id, event_time) VALUES
    ('kpi', 'info', 'Monthly Distance Covered', '2,450 km', 
     '{"theme": "distance", "period": "January 2024", "trend": "up", "change": "+12%"}', 
     NULL, org_id, NOW() - INTERVAL '1 day'),
    
    ('kpi', 'info', 'Average Fuel Efficiency', '12.5 km/l', 
     '{"theme": "fuel", "period": "January 2024", "trend": "up", "change": "+5%"}', 
     NULL, org_id, NOW() - INTERVAL '1 day'),
    
    ('kpi', 'info', 'Fleet Utilization', '78%', 
     '{"theme": "utilization", "period": "January 2024", "trend": "down", "change": "-3%"}', 
     NULL, org_id, NOW() - INTERVAL '1 day'),
    
    ('kpi', 'info', 'Monthly P&L', '₹45,200', 
     '{"theme": "pnl", "period": "January 2024", "trend": "up", "change": "+8%"}', 
     NULL, org_id, NOW() - INTERVAL '1 day');
    
    -- Insert Activity events
    INSERT INTO public.events_feed (kind, priority, title, description, entity_json, status, organization_id, event_time) VALUES
    ('activity', 'info', 'New Driver Added', 'Driver Sarah Johnson has been added to the fleet.', 
     '{"driver_id": "' || COALESCE(driver_id::text, 'sample-driver-id') || '", "action": "created", "entity_type": "driver"}', 
     NULL, org_id, NOW() - INTERVAL '2 days'),
    
    ('vehicle_activity', 'info', 'Vehicle Status Updated', 'KA-01-AB-1234 status changed from Active to Maintenance.', 
     '{"vehicle_id": "' || COALESCE(vehicle_id::text, 'sample-vehicle-id') || '", "action": "status_change", "old_status": "active", "new_status": "maintenance"}', 
     NULL, org_id, NOW() - INTERVAL '4 hours');
    
    RAISE NOTICE 'Successfully inserted % events for organization %', 15, org_id;
  ELSE
    RAISE NOTICE 'No organization found or events already exist';
  END IF;
END $$;
