import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { createLogger } from '../utils/logger';

const logger = createLogger('useHeroFeed');

export interface FeedEvent {
  id: string;
  kind: 'ai_alert' | 'activity' | 'vehicle_activity' | 'vehicle_doc' | 'maintenance' | 'trip' | 'kpi';
  event_time: string;
  priority: 'danger' | 'warn' | 'info';
  title: string;
  description: string;
  entity_json: any;
  status: string | null;
  metadata: any;
}

export interface KPICard {
  id: string;
  kpi_key: string;
  kpi_title: string;
  kpi_value_human: string;
  kpi_payload: {
    type: 'youtube' | 'image' | 'playlist' | 'kpi';
    videoId?: string;
    thumbnail?: string;
    url?: string;
    caption?: string;
    alt?: string;
    playlistId?: string;
    videos?: number;
    totalDuration?: string;
    duration?: string;
    views?: string;
    value?: number;
    unit?: string;
    trend?: 'up' | 'down';
    change?: string;
    period?: string;
  };
  theme: string;
  computed_at: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// Hook to fetch KPI cards
export const useKPICards = () => {
  return useQuery({
    queryKey: ['kpi-cards'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('kpi_cards')
          .select('*')
          .order('computed_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        
        // Return empty array if no data in database
        if (!data || data.length === 0) {
          logger.info('No KPI cards in database');
          return [];
        }
        
        return data as KPICard[];
      } catch (error) {
        logger.warn('Database not available, using mock KPI data:', error);
        return getMockKPICards();
      }
    }
  });
};

export const useHeroFeed = (filters?: {
  kinds?: string[];
  limit?: number;
}) => {
  return useInfiniteQuery({
    queryKey: ['hero-feed', filters],
    queryFn: async ({ pageParam = null }) => {
      try {
        // Get user's organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          logger.warn('No user found, returning empty feed');
          return [];
        }

        // Get user's active organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('active_organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.active_organization_id) {
          logger.warn('No active organization found, returning empty feed');
          return [];
        }

        let query = supabase
          .from('events_feed')
          .select('*')
          .eq('organization_id', profile.active_organization_id)
          .order('event_time', { ascending: false })
          .limit(filters?.limit || 20);

        if (filters?.kinds && filters.kinds.length > 0 && !filters.kinds.includes('all')) {
          query = query.in('kind', filters.kinds);
        }

        if (pageParam) {
          query = query.lt('event_time', pageParam);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Return empty array if no data in database
        if (!data || data.length === 0) {
          logger.info('No events in database');
          return [];
        }

        return data as FeedEvent[];
      } catch (error) {
        logger.warn('Database not available, using mock data:', error);
        // Return mock data when database is not available
        return getMockFeedEvents(filters, pageParam);
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].event_time;
    },
    initialPageParam: null,
  });
};

// Mock data for when database is not available
const getMockFeedEvents = (filters?: { kinds?: string[]; limit?: number }, pageParam?: string | null): FeedEvent[] => {
  const mockEvents: FeedEvent[] = [
    {
      id: '1',
      kind: 'ai_alert',
      event_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      priority: 'danger',
      title: 'High Fuel Consumption Detected',
      description: 'Vehicle KA-01-AB-1234 is consuming 15% more fuel than usual. Consider maintenance check.',
      entity_json: { vehicle_id: 'sample-vehicle-id', alert_type: 'fuel_consumption', threshold: 15 },
      status: 'pending',
      metadata: {}
    },
    {
      id: '2',
      kind: 'vehicle_doc',
      event_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      priority: 'warn',
      title: 'RC Expiry Reminder',
      description: 'Registration Certificate for KA-01-AB-1234 expires in 15 days.',
      entity_json: { vehicle_id: 'sample-vehicle-id', document_type: 'rc', expiry_date: '2024-02-15' },
      status: 'pending',
      metadata: {}
    },
    {
      id: '3',
      kind: 'maintenance',
      event_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      priority: 'warn',
      title: 'Service Due Soon',
      description: 'KA-01-AB-1234 is due for service in 500km or 7 days.',
      entity_json: { vehicle_id: 'sample-vehicle-id', service_type: 'regular', due_km: 500, due_days: 7 },
      status: 'pending',
      metadata: {}
    },
    {
      id: '4',
      kind: 'trip',
      event_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      priority: 'info',
      title: 'Trip Completed',
      description: 'Trip from Mumbai to Pune completed successfully. Distance: 150km, Duration: 3h 30m.',
      entity_json: { trip_id: 'sample-trip-1', from: 'Mumbai', to: 'Pune', distance: 150, duration: '3h 30m' },
      status: 'completed',
      metadata: {}
    },
    {
      id: '5',
      kind: 'kpi',
      event_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      priority: 'info',
      title: 'Monthly Distance Covered',
      description: '2,450 km',
      entity_json: { theme: 'distance', period: 'January 2024', trend: 'up', change: '+12%' },
      status: null,
      metadata: {}
    },
    {
      id: '6',
      kind: 'kpi',
      event_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      priority: 'info',
      title: 'Average Fuel Efficiency',
      description: '12.5 km/l',
      entity_json: { theme: 'fuel', period: 'January 2024', trend: 'up', change: '+5%' },
      status: null,
      metadata: {}
    },
    {
      id: '7',
      kind: 'ai_alert',
      event_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      priority: 'warn',
      title: 'Driver Performance Alert',
      description: 'Driver John Doe has 3 late arrivals this week. Consider performance review.',
      entity_json: { driver_id: 'sample-driver-id', alert_type: 'performance', metric: 'late_arrivals', count: 3 },
      status: 'pending',
      metadata: {}
    },
    {
      id: '8',
      kind: 'activity',
      event_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      priority: 'info',
      title: 'New Driver Added',
      description: 'Driver Sarah Johnson has been added to the fleet.',
      entity_json: { driver_id: 'sample-driver-id', action: 'created', entity_type: 'driver' },
      status: null,
      metadata: {}
    }
  ];

  // Filter by kinds if specified
  let filteredEvents = mockEvents;
  if (filters?.kinds && filters.kinds.length > 0 && !filters.kinds.includes('all')) {
    filteredEvents = mockEvents.filter(event => filters.kinds!.includes(event.kind));
  }

  // Apply pagination
  if (pageParam) {
    const pageParamTime = new Date(pageParam);
    filteredEvents = filteredEvents.filter(event => new Date(event.event_time) < pageParamTime);
  }

  // Apply limit
  const limit = filters?.limit || 20;
  return filteredEvents.slice(0, limit);
};

// Mock KPI cards for when database is not available
const getMockKPICards = (): KPICard[] => {
  return [
    {
      id: '1',
      kpi_key: 'media.youtube.1',
      kpi_title: 'Fleet Safety Tips',
      kpi_value_human: 'Training Video',
      kpi_payload: {
        type: 'youtube',
        videoId: 'dQw4w9WgXcQ',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        duration: '3:32',
        views: '2.1B'
      },
      theme: 'trips',
      computed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      organization_id: 'sample-org-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      kpi_key: 'media.image.1',
      kpi_title: 'Fleet Update',
      kpi_value_human: 'New Vehicle Added',
      kpi_payload: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800',
        caption: 'Welcome our new truck to the fleet',
        alt: 'New truck in fleet'
      },
      theme: 'trips',
      computed_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      organization_id: 'sample-org-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      kpi_key: 'kpi.monthly_distance',
      kpi_title: 'Monthly Distance Covered',
      kpi_value_human: '2,450 km',
      kpi_payload: {
        type: 'kpi',
        value: 2450,
        unit: 'km',
        trend: 'up',
        change: '+12%',
        period: 'January 2024'
      },
      theme: 'distance',
      computed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      organization_id: 'sample-org-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
};
