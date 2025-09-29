// Force Data Refresh Utility
// This utility helps force refresh data when normal refresh isn't working

import { supabase } from './supabaseClient';
import { getTrips } from './api/trips';
import { getVehicles } from './api/vehicles';
import { getDrivers } from './api/drivers';
import { toast } from 'react-toastify';

export interface RefreshResult {
  success: boolean;
  tripsCount: number;
  vehiclesCount: number;
  driversCount: number;
  error?: string;
}

export const forceDataRefresh = async (): Promise<RefreshResult> => {
  try {
    console.log('🔄 Starting forced data refresh...');
    
    // Test database connection first
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!user) {
      throw new Error('No user authenticated');
    }
    
    console.log('✅ User authenticated:', user.id);
    
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
      console.error('❌ Trips fetch failed:', tripsData.reason);
    }
    if (vehiclesData.status === 'rejected') {
      console.error('❌ Vehicles fetch failed:', vehiclesData.reason);
    }
    if (driversData.status === 'rejected') {
      console.error('❌ Drivers fetch failed:', driversData.reason);
    }
    
    const result: RefreshResult = {
      success: true,
      tripsCount: Array.isArray(trips) ? trips.length : 0,
      vehiclesCount: Array.isArray(vehicles) ? vehicles.length : 0,
      driversCount: Array.isArray(drivers) ? drivers.length : 0
    };
    
    console.log('✅ Data refresh completed:', result);
    
    // Show success message
    toast.success(`Data refreshed: ${result.tripsCount} trips, ${result.vehiclesCount} vehicles, ${result.driversCount} drivers`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Force data refresh failed:', error);
    
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
    console.log('🔍 Testing database connection...');
    
    // Test 1: Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ Auth test failed:', authError.message);
      return false;
    }
    
    if (!user) {
      console.error('❌ No user found');
      return false;
    }
    
    console.log('✅ Auth test passed');
    
    // Test 2: Simple count query
    const { count, error: countError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('added_by', user.id);
    
    if (countError) {
      console.error('❌ Count query failed:', countError.message);
      return false;
    }
    
    console.log('✅ Database connection test passed, vehicles count:', count);
    return true;
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// Clear all caches and force refresh
export const clearCacheAndRefresh = async (): Promise<RefreshResult> => {
  try {
    console.log('🧹 Clearing caches and forcing refresh...');
    
    // Clear localStorage caches
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('trips') || key.includes('vehicles') || key.includes('drivers'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('✅ Cleared localStorage caches');
    
    // Force refresh data
    const result = await forceDataRefresh();
    
    return result;
    
  } catch (error) {
    console.error('❌ Clear cache and refresh failed:', error);
    return {
      success: false,
      tripsCount: 0,
      vehiclesCount: 0,
      driversCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
