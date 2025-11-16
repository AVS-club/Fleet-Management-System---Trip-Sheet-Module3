import { useQuery } from '@tanstack/react-query';
import { supabase } from '../utils/supabaseClient';
import { createLogger } from '../utils/logger';

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
      let query = supabase
        .from('kpi_cards')
        .select('*')
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

      return (data || []) as KPICard[];
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Hook for getting latest KPIs by theme
export const useLatestKPIs = () => {
  return useQuery({
    queryKey: ['kpi-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_cards')
        .select('*')
        .order('computed_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Group by theme and get the latest for each
      const latestByTheme: Record<string, KPICard> = {};
      (data || []).forEach((kpi: KPICard) => {
        if (!latestByTheme[kpi.theme] ||
            new Date(kpi.computed_at) > new Date(latestByTheme[kpi.theme].computed_at)) {
          latestByTheme[kpi.theme] = kpi;
        }
      });

      return latestByTheme;
    },
    staleTime: 2 * 60 * 1000,
  });
};
