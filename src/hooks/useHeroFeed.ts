import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { createLogger } from '../utils/logger';
import { getUserActiveOrganization } from '../utils/supaHelpers';

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
        // Get user session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          logger.error('No active session found');
          return [];
        }

        // Get user's active organization - CRITICAL for multi-org support
        const organizationId = await getUserActiveOrganization(session.user.id);
        
        if (!organizationId) {
          logger.error('No organization found for user:', session.user.id);
          return [];
        }

        logger.info(`Fetching KPI cards for organization: ${organizationId}`);

        // Query with organization filter - ALWAYS filter by organization!
        const { data, error } = await supabase
          .from('kpi_cards')
          .select('*')
          .eq('organization_id', organizationId) // Filter by user's organization
          .order('computed_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        
        // Return empty array if no data in database
        if (!data || data.length === 0) {
          logger.info('No KPI cards in database for organization:', organizationId);
          return [];
        }
        
        logger.info(`Fetched ${data.length} KPI cards for organization ${organizationId}`);
        return data as KPICard[];
      } catch (error) {
        logger.error('Error fetching KPI cards:', error);
        // Return empty array instead of mock data
        return [];
      }
    }
  });
};

export const useHeroFeed = (filters?: {
  kinds?: string[];
  limit?: number;
  includeDocuments?: boolean;
}) => {
  const { includeDocuments = false } = filters || {};

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

        // Build the kinds array
        let kindsToFetch = filters?.kinds || [];

        // If 'all' is selected, fetch all types
        if (!kindsToFetch || kindsToFetch.length === 0 || kindsToFetch.includes('all')) {
          kindsToFetch = [
            'trip',
            'maintenance',
            'activity',
            'ai_alert',
            'vehicle_activity'
          ];
        }

        // Add vehicle_doc only if includeDocuments is true
        if (includeDocuments && !kindsToFetch.includes('vehicle_doc')) {
          kindsToFetch.push('vehicle_doc');
          logger.debug('📄 Adding vehicle_doc to query kinds');
        }

        // Remove vehicle_doc if includeDocuments is false
        if (!includeDocuments) {
          const hadDocs = kindsToFetch.includes('vehicle_doc');
          kindsToFetch = kindsToFetch.filter(k => k !== 'vehicle_doc');
          if (hadDocs) {
            logger.debug('📄 Removing vehicle_doc from query kinds');
          }
        }

        logger.debug('📄 Querying events_feed with kinds:', kindsToFetch);

        let query = supabase
          .from('events_feed')
          .select('*')
          .eq('organization_id', profile.active_organization_id)
          .in('kind', kindsToFetch)
          .order('event_time', { ascending: false })
          .limit(filters?.limit || 20);

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

        // Log document count from database
        const docCount = data.filter((e: any) => e.kind === 'vehicle_doc').length;
        if (docCount > 0) {
          logger.debug('📄 Fetched from database:', docCount, 'document events');
        }

        return data as FeedEvent[];
      } catch (error) {
        logger.error('Error fetching feed events:', error);
        // Return empty array instead of mock data
        return [];
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].event_time;
    },
    initialPageParam: null,
  });
};
