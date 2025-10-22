// Force Data Refresh Utility
// This utility helps force refresh data when normal refresh isn't working

import { supabase } from './supabaseClient';
import { getTrips } from './api/trips';
import { getVehicles } from './api/vehicles';
import { getDrivers } from './api/drivers';
import { toast } from 'react-toastify';
import { createLogger } from './logger';

const logger = createLogger('forceDataRefresh');

export interface RefreshResult {
  success: boolean;
  tripsCount: number;
  vehiclesCount: number;
  driversCount: number;
  error?: string;
}

export const forceDataRefresh = async (): Promise<RefreshResult> => {
  try {
    logger.debug('🔄 Starting forced data refresh...');
    
    // Test database connection first
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!user) {
      throw new Error('No user authenticated');
    }
    
    logger.debug('✅ User authenticated:', user.id);
    
    // Force refresh all data with error handling
    const [tripsData, vehiclesData, driversData] = await Promise.allSettled([
      getTrips(),
      getVehicles(),
      getDrivers()
    ]);
    
    const trips = tripsData.status === 'fulfilled' ? tripsData.value : [];
    const vehicles = vehiclesData.status === 'fulfilled' ? vehiclesData.value : [];
    const drivers = driversData.status === 'fulfilled' ? driversData.value : [];
    
    // Log any rejected promises
    if (tripsData.status === 'rejected') {
      logger.error('❌ Trips fetch failed:', tripsData.reason);
    }
    if (vehiclesData.status === 'rejected') {
      logger.error('❌ Vehicles fetch failed:', vehiclesData.reason);
    }
    if (driversData.status === 'rejected') {
      logger.error('❌ Drivers fetch failed:', driversData.reason);
    }
    
    const result: RefreshResult = {
      success: true,
      tripsCount: Array.isArray(trips) ? trips.length : 0,
      vehiclesCount: Array.isArray(vehicles) ? vehicles.length : 0,
      driversCount: Array.isArray(drivers) ? drivers.length : 0
    };
    
    logger.debug('✅ Data refresh completed:', result);
    
    // Show success message
    toast.success(`Data refreshed: ${result.tripsCount} trips, ${result.vehiclesCount} vehicles, ${result.driversCount} drivers`);
    
    return result;
    
  } catch (error) {
    logger.error('❌ Force data refresh failed:', error);
    
    const result: RefreshResult = {
      success: false,
      tripsCount: 0,
      vehiclesCount: 0,
      driversCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    toast.error(`Data refresh failed: ${result.error}`);
    
    return result;
  }
};

// Test database connection specifically
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    logger.debug('🔍 Testing database connection...');
    
    // Test 1: Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      logger.error('❌ Auth test failed:', authError.message);
      return false;
    }
    
    if (!user) {
      logger.error('❌ No user found');
      return false;
    }
    
    logger.debug('✅ Auth test passed');
    
    // Test 2: Simple count query
    const { count, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('added_by', user.id);
    
    if (countError) {
      logger.error('❌ Count query failed:', countError.message);
      return false;
    }
    
    logger.debug('✅ Database connection test passed, vehicles count:', count);
    return true;
    
  } catch (error) {
    logger.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Clear all caches and force refresh
export const clearCacheAndRefresh = async (): Promise<RefreshResult> => {
  try {
    logger.debug('🧹 Clearing caches and forcing refresh...');
    
    // Clear localStorage caches
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('trips') || key.includes('vehicles') || key.includes('drivers'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    logger.debug('✅ Cleared localStorage caches');
    
    // Force refresh data
    const result = await forceDataRefresh();
    
    return result;
    
  } catch (error) {
    logger.error('❌ Clear cache and refresh failed:', error);
    return {
      success: false,
      tripsCount: 0,
      vehiclesCount: 0,
      driversCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
