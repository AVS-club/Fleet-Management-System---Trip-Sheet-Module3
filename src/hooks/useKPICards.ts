import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabaseClient';
import { createLogger } from '../utils/logger';
import { getUserActiveOrganization } from '../utils/supaHelpers';

const logger = createLogger('useKPICards');

export interface KPICard {
  id: string;
  kpi_key: string;
  kpi_title: string;
  kpi_value_human: string;
  kpi_payload: {
    type: string;
    value: number;
    unit?: string;
    trend?: 'up' | 'down' | 'neutral';
    change?: string;
    period?: string;
    comparison?: Record<string, any>;
  };
  theme: 'distance' | 'fuel' | 'mileage' | 'pnl' | 'utilization' | 'trips' | 'vehicles' | 'revenue' | 'expenses' | 'maintenance';
  computed_at: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface UseKPICardsOptions {
  period?: 'daily' | 'weekly' | 'monthly' | 'all';
  limit?: number;
}

export const useKPICards = (options: UseKPICardsOptions = {}) => {
  const { period = 'all', limit = 50 } = options;

  return useQuery({
    queryKey: ['kpi-cards', period, limit],
    queryFn: async () => {
      // Check auth before fetching
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.error('No active session found');
        throw new Error('Not authenticated');
      }

      // Get user's active organization - CRITICAL for multi-org support
      const organizationId = await getUserActiveOrganization(session.user.id);
      
      if (!organizationId) {
        logger.error('No organization found for user:', session.user.id);
        throw new Error('User is not associated with any organization');
      }

      logger.info(`Fetching KPI cards for organization: ${organizationId}`);

      // Build query with organization filter - ALWAYS filter by organization!
      let query = supabase
        .from('kpi_cards')
        .select('*')
        .eq('organization_id', organizationId) // Filter by user's organization
        .order('computed_at', { ascending: false });

      // Filter by period if specified
      if (period !== 'all') {
        query = query.ilike('kpi_key', `${period}.%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching KPI cards:', error);
        throw error;
      }

      logger.info(`Fetched ${data?.length || 0} KPI cards for organization ${organizationId}`);
      return (data || []) as KPICard[];
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: false, // Don't retry if auth fails
  });
};

// Hook for getting latest KPIs by theme
export const useLatestKPIs = () => {
  return useQuery({
    queryKey: ['kpi-latest'],
    queryFn: async () => {
      // Check auth before fetching
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.error('No active session found');
        throw new Error('Not authenticated');
      }

      // Get user's active organization - CRITICAL for multi-org support
      const organizationId = await getUserActiveOrganization(session.user.id);
      
      if (!organizationId) {
        logger.error('No organization found for user:', session.user.id);
        throw new Error('User is not associated with any organization');
      }

      logger.info(`Fetching latest KPIs by theme for organization: ${organizationId}`);

      // Query with organization filter - ALWAYS filter by organization!
      const { data, error } = await supabase
        .from('kpi_cards')
        .select('*')
        .eq('organization_id', organizationId) // Filter by user's organization
        .order('computed_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Error fetching latest KPIs:', error);
        throw error;
      }

      // Group by theme and get the latest for each
      const latestByTheme: Record<string, KPICard> = {};
      (data || []).forEach((kpi: KPICard) => {
        if (!latestByTheme[kpi.theme] ||
            new Date(kpi.computed_at) > new Date(latestByTheme[kpi.theme].computed_at)) {
          latestByTheme[kpi.theme] = kpi;
        }
      });

      logger.info(`Grouped ${Object.keys(latestByTheme).length} themes for organization ${organizationId}`);
      return latestByTheme;
    },
    staleTime: 2 * 60 * 1000,
    retry: false, // Don't retry if auth fails
  });
};
