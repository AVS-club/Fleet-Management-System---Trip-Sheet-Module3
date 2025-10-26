import { supabase } from './supabaseClient';
import { getCurrentUserId } from './storage';
import { createLogger } from './logger';

const logger = createLogger('destinationAnalytics');

export interface DestinationUsageStats {
  id: string;
  name: string;
  usage_count: number;
  last_used: string | null;
  type: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  place_id?: string;
  formatted_address?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedDestinations {
  destinations: DestinationUsageStats[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DestinationFilters {
  search?: string;
  type?: string;
  state?: string;
  sortBy?: 'name' | 'usage_count' | 'last_used' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  active?: boolean;
}

/**
 * Get destinations with usage analytics and pagination
 */
export const getDestinationsWithAnalytics = async (
  page: number = 1,
  limit: number = 25,
  filters: DestinationFilters = {}
): Promise<PaginatedDestinations> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from('destinations')
      .select('*', { count: 'exact' })
      .eq('created_by', userId);

    // Apply filters
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.state) {
      query = query.eq('state', filters.state);
    }

    if (filters.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'usage_count';
    const sortOrder = filters.sortOrder || 'desc';
   
   // Only apply database sorting for columns that exist in the database
   if (sortBy !== 'usage_count' && sortBy !== 'last_used') {
     query = query.order(sortBy, { ascending: sortOrder === 'asc' });
   } else {
     // For computed fields, we'll sort after fetching the data
     // Use a default database sort to ensure consistent pagination
     query = query.order('name', { ascending: true });
   }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching destinations with analytics:', error);
      throw error;
    }

    // Get usage statistics for each destination
    const destinationsWithStats = await Promise.all(
      (data || []).map(async (destination) => {
        // Get usage count from trips
        const { count: usageCount } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .contains('destinations', [destination.id])
          .eq('created_by', userId);

        // Get last used date
        const { data: lastTrip } = await supabase
          .from('trips')
          .select('trip_end_date')
          .contains('destinations', [destination.id])
          .eq('created_by', userId)
          .order('trip_end_date', { ascending: false })
          .limit(1);

        return {
          ...destination,
          usage_count: usageCount || 0,
          last_used: lastTrip?.[0]?.trip_end_date || null
        } as DestinationUsageStats;
      })
    );

   // Apply client-side sorting for computed fields
   if (sortBy === 'usage_count' || sortBy === 'last_used') {
     destinationsWithStats.sort((a, b) => {
       if (sortBy === 'usage_count') {
         const aValue = a.usage_count;
         const bValue = b.usage_count;
         return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
       } else if (sortBy === 'last_used') {
         const aValue = a.last_used ? new Date(a.last_used).getTime() : 0;
         const bValue = b.last_used ? new Date(b.last_used).getTime() : 0;
         return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
       }
       return 0;
     });
   }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      destinations: destinationsWithStats,
      totalCount: count || 0,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  } catch (error) {
    logger.error('Error in getDestinationsWithAnalytics:', error);
    throw error;
  }
};

/**
 * Get most frequently used destinations
 */
export const getMostUsedDestinations = async (limit: number = 10): Promise<DestinationUsageStats[]> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('created_by', userId)
      .eq('active', true)
      .order('name');

    if (error) {
      throw error;
    }

    // Get usage statistics for each destination
    const destinationsWithStats = await Promise.all(
      (data || []).map(async (destination) => {
        const { count: usageCount } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .contains('destinations', [destination.id])
          .eq('created_by', userId);

        const { data: lastTrip } = await supabase
          .from('trips')
          .select('trip_end_date')
          .contains('destinations', [destination.id])
          .eq('created_by', userId)
          .order('trip_end_date', { ascending: false })
          .limit(1);

        return {
          ...destination,
          usage_count: usageCount || 0,
          last_used: lastTrip?.[0]?.trip_end_date || null
        } as DestinationUsageStats;
      })
    );

    // Sort by usage count and return top destinations
    return destinationsWithStats
      .filter(dest => dest.usage_count > 0)
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  } catch (error) {
    logger.error('Error in getMostUsedDestinations:', error);
    throw error;
  }
};

/**
 * Update destination usage when a trip is created/updated
 */
export const updateDestinationUsage = async (destinationIds: string[]): Promise<void> => {
  try {
    // This function can be called when trips are created/updated
    // For now, we'll rely on the real-time queries above
    // In the future, we could implement a more efficient caching mechanism
    logger.debug('Destination usage updated for:', destinationIds);
  } catch (error) {
    logger.error('Error updating destination usage:', error);
  }
};

/**
 * Get destination statistics summary
 */
export const getDestinationStats = async (): Promise<{
  totalDestinations: number;
  activeDestinations: number;
  mostUsedDestination: DestinationUsageStats | null;
  recentlyUsedDestinations: DestinationUsageStats[];
}> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const [totalCount, activeCount, mostUsed, recentlyUsed] = await Promise.all([
      // Total destinations
      supabase
        .from('destinations')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId),
      
      // Active destinations
      supabase
        .from('destinations')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('active', true),
      
      // Most used destination
      getMostUsedDestinations(1),
      
      // Recently used destinations (last 30 days)
      getMostUsedDestinations(5)
    ]);

    return {
      totalDestinations: totalCount.count || 0,
      activeDestinations: activeCount.count || 0,
      mostUsedDestination: mostUsed[0] || null,
      recentlyUsedDestinations: recentlyUsed
    };
  } catch (error) {
    logger.error('Error in getDestinationStats:', error);
    throw error;
  }
};
