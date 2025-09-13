import React from 'react';
import { Trip, Vehicle, Driver, Warehouse } from '@/types';
import { supabase } from './supabaseClient';
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, parse, isValid } from 'date-fns';

export interface TripFilters {
  search?: string;
  vehicle?: string;
  driver?: string;
  warehouse?: string;
  refueling?: 'all' | 'refueling' | 'no-refueling';
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  materials?: string[];
  routeDeviation?: boolean;
  sortBy?: 'date-desc' | 'date-asc' | 'distance-desc' | 'distance-asc' | 'cost-desc' | 'cost-asc';
}

export interface TripSearchResult {
  trips: Trip[];
  totalCount: number;
  hasMore: boolean;
  statistics: TripStatistics;
}

export interface TripStatistics {
  totalTrips: number;
  totalDistance: number;
  totalFuelCost: number;
  totalExpenses: number;
  avgMileage: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Quick filter presets
export const QUICK_FILTERS = {
  today: () => ({
    dateRange: 'today' as const,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  }),
  week: () => ({
    dateRange: 'week' as const,
    startDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  }),
  month: () => ({
    dateRange: 'month' as const,
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
};

// Helper function to parse date from various formats
function parseDateSearch(searchTerm: string): { isDate: boolean; date?: Date; startDate?: string; endDate?: string } {
  const term = searchTerm.trim();
  
  // Try various date formats
  const dateFormats = [
    'dd/MM/yyyy', // 20/08/2025
    'dd-MM-yyyy', // 20-08-2025
    'yyyy-MM-dd', // 2025-08-20
    'dd MMM yyyy', // 20 Aug 2025
    'dd MMMM yyyy', // 20 August 2025
    'MMM dd yyyy', // Aug 20 2025
    'MMMM dd yyyy', // August 20 2025
    'd/M/yyyy', // 5/8/2025
    'd-M-yyyy', // 5-8-2025
  ];
  
  for (const formatStr of dateFormats) {
    try {
      const parsedDate = parse(term, formatStr, new Date());
      if (isValid(parsedDate)) {
        const dateStr = format(parsedDate, 'yyyy-MM-dd');
        return {
          isDate: true,
          date: parsedDate,
          startDate: dateStr,
          endDate: dateStr
        };
      }
    } catch (e) {
      // Continue trying other formats
    }
  }
  
  // Check for natural language dates
  const lowerTerm = term.toLowerCase();
  if (lowerTerm.includes('today')) {
    const today = new Date();
    const dateStr = format(today, 'yyyy-MM-dd');
    return {
      isDate: true,
      date: today,
      startDate: dateStr,
      endDate: dateStr
    };
  }
  
  if (lowerTerm.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = format(yesterday, 'yyyy-MM-dd');
    return {
      isDate: true,
      date: yesterday,
      startDate: dateStr,
      endDate: dateStr
    };
  }
  
  // Check for partial date matches like "20th August" or "August 20"
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthAbbr = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  for (let i = 0; i < monthNames.length; i++) {
    if (lowerTerm.includes(monthNames[i]) || lowerTerm.includes(monthAbbr[i])) {
      // Extract day if present
      const dayMatch = term.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        const currentYear = new Date().getFullYear();
        const parsedDate = new Date(currentYear, i, day);
        if (isValid(parsedDate)) {
          const dateStr = format(parsedDate, 'yyyy-MM-dd');
          return {
            isDate: true,
            date: parsedDate,
            startDate: dateStr,
            endDate: dateStr
          };
        }
      }
    }
  }
  
  return { isDate: false };
}

// Database-powered search function
export async function searchTripsDatabase(
  filters: TripFilters,
  pagination: PaginationOptions,
  userId?: string
): Promise<TripSearchResult> {
  try {
    // Test Supabase connection first
    const { error: connectionError } = await supabase.auth.getSession();
    if (connectionError) {
      throw new Error(`Supabase connection failed: ${connectionError.message}`);
    }

    let query = supabase
      .from('trips')
      .select(`
        *,
        vehicles!inner(id, registration_number, make, model),
        drivers!inner(id, name),
        warehouses(id, name)
      `, { count: 'exact' });

    // Add user filter if provided
    if (userId) {
      query = query.eq('created_by', userId);
    }

    // Search filter with fuzzy matching and date support
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      
      // Check if search term is a date
      const dateSearch = parseDateSearch(searchTerm);
      if (dateSearch.isDate && dateSearch.startDate) {
        // Search by date
        query = query.eq('trip_start_date', dateSearch.startDate);
      } else {
        // Regular text search
        query = query.or(`trip_serial_number.ilike.%${searchTerm}%,vehicles.registration_number.ilike.%${searchTerm}%,drivers.name.ilike.%${searchTerm}%`);
      }
    }

    // Vehicle filter
    if (filters.vehicle) {
      query = query.eq('vehicle_id', filters.vehicle);
    }

    // Driver filter
    if (filters.driver) {
      query = query.eq('driver_id', filters.driver);
    }

    // Warehouse filter
    if (filters.warehouse) {
      query = query.eq('warehouse_id', filters.warehouse);
    }

    // Refueling filter
    if (filters.refueling === 'refueling') {
      query = query.eq('refueling_done', true);
    } else if (filters.refueling === 'no-refueling') {
      query = query.eq('refueling_done', false);
    }

    // Date range filter
    if (filters.startDate) {
      query = query.gte('trip_start_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('trip_start_date', filters.endDate);
    }

    // Material filter (assuming it's stored as an array)
    if (filters.materials && filters.materials.length > 0) {
      query = query.overlaps('material_type_ids', filters.materials);
    }

    // Route deviation filter
    if (filters.routeDeviation) {
      query = query.or('route_deviation.gt.8,route_deviation.lt.-8');
    }

    // Sorting
    const sortBy = filters.sortBy || 'date-desc';
    switch (sortBy) {
      case 'date-asc':
        query = query.order('trip_start_date', { ascending: true });
        break;
      case 'distance-desc':
        query = query.order('total_distance', { ascending: false, nullsLast: true });
        break;
      case 'distance-asc':
        query = query.order('total_distance', { ascending: true, nullsLast: true });
        break;
      case 'cost-desc':
        query = query.order('total_expenses', { ascending: false, nullsLast: true });
        break;
      case 'cost-asc':
        query = query.order('total_expenses', { ascending: true, nullsLast: true });
        break;
      default: // 'date-desc'
        query = query.order('trip_start_date', { ascending: false });
        break;
    }

    // Pagination
    const offset = (pagination.page - 1) * pagination.limit;
    query = query.range(offset, offset + pagination.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database search error:', error);
      throw error;
    }

    const trips = data || [];
    const totalCount = count || 0;
    const hasMore = totalCount > offset + trips.length;

    // Calculate statistics
    const statistics = calculateTripStatistics(trips);

    return {
      trips,
      totalCount,
      hasMore,
      statistics
    };
  } catch (error) {
    console.warn('Database search failed, will fallback to client-side search:', error);
    
    // Check if it's a network/CORS error
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('NETWORK_ERROR: Unable to connect to database. Please check your internet connection and Supabase CORS configuration.');
    }
    
    // Re-throw other errors
    throw error;
  }
}

// Client-side search function (fallback)
export function searchTripsClientSide(
  allTrips: Trip[],
  vehicles: Vehicle[],
  drivers: Driver[],
  warehouses: Warehouse[],
  filters: TripFilters,
  pagination: PaginationOptions
): TripSearchResult {
  let filteredTrips = [...allTrips];

  // Create lookup maps for better performance
  const vehiclesMap = new Map(vehicles.map(v => [v.id, v]));
  const driversMap = new Map(drivers.map(d => [d.id, d]));
  const warehousesMap = new Map(warehouses.map(w => [w.id, w]));

  // Search filter with date support
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.toLowerCase().trim();
    
    // Check if search term is a date
    const dateSearch = parseDateSearch(filters.search);
    
    if (dateSearch.isDate && dateSearch.startDate) {
      // Filter by date
      filteredTrips = filteredTrips.filter(trip => {
        if (!trip.trip_start_date) return false;
        const tripDateStr = trip.trip_start_date.split('T')[0]; // Get just the date part
        return tripDateStr === dateSearch.startDate;
      });
    } else {
      // Regular text search
      filteredTrips = filteredTrips.filter(trip => {
        const vehicle = vehiclesMap.get(trip.vehicle_id);
        const driver = driversMap.get(trip.driver_id);
        
        return [
          trip.trip_serial_number,
          trip.manual_trip_id,
          vehicle?.registration_number,
          driver?.name
        ].some(field => field?.toLowerCase().includes(searchTerm));
      });
    }
  }

  // Vehicle filter
  if (filters.vehicle) {
    filteredTrips = filteredTrips.filter(trip => trip.vehicle_id === filters.vehicle);
  }

  // Driver filter
  if (filters.driver) {
    filteredTrips = filteredTrips.filter(trip => trip.driver_id === filters.driver);
  }

  // Warehouse filter
  if (filters.warehouse) {
    filteredTrips = filteredTrips.filter(trip => trip.warehouse_id === filters.warehouse);
  }

  // Refueling filter
  if (filters.refueling === 'refueling') {
    filteredTrips = filteredTrips.filter(trip => trip.refueling_done);
  } else if (filters.refueling === 'no-refueling') {
    filteredTrips = filteredTrips.filter(trip => !trip.refueling_done);
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    filteredTrips = filteredTrips.filter(trip => {
      if (!trip.trip_start_date) return false;
      
      const tripDate = parseISO(trip.trip_start_date);
      
      if (filters.startDate) {
        const startDate = parseISO(filters.startDate);
        if (tripDate < startOfDay(startDate)) return false;
      }
      
      if (filters.endDate) {
        const endDate = parseISO(filters.endDate);
        if (tripDate > endOfDay(endDate)) return false;
      }
      
      return true;
    });
  }

  // Material filter
  if (filters.materials && filters.materials.length > 0) {
    filteredTrips = filteredTrips.filter(trip => {
      if (!trip.material_type_ids || trip.material_type_ids.length === 0) {
        return false;
      }
      return filters.materials!.some(materialId => 
        trip.material_type_ids?.includes(materialId)
      );
    });
  }

  // Route deviation filter
  if (filters.routeDeviation) {
    filteredTrips = filteredTrips.filter(trip => {
      return trip.route_deviation && Math.abs(trip.route_deviation) > 8;
    });
  }

  // Sorting
  const sortBy = filters.sortBy || 'date-desc';
  filteredTrips.sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':
        return new Date(a.trip_start_date || 0).getTime() - new Date(b.trip_start_date || 0).getTime();
      case 'distance-desc':
        return (b.total_distance || 0) - (a.total_distance || 0);
      case 'distance-asc':
        return (a.total_distance || 0) - (b.total_distance || 0);
      case 'cost-desc':
        return (b.total_expenses || 0) - (a.total_expenses || 0);
      case 'cost-asc':
        return (a.total_expenses || 0) - (b.total_expenses || 0);
      default: // 'date-desc'
        return new Date(b.trip_start_date || 0).getTime() - new Date(a.trip_start_date || 0).getTime();
    }
  });

  // Pagination
  const totalCount = filteredTrips.length;
  const offset = (pagination.page - 1) * pagination.limit;
  const paginatedTrips = filteredTrips.slice(offset, offset + pagination.limit);
  const hasMore = totalCount > offset + paginatedTrips.length;

  // Calculate statistics
  const statistics = calculateTripStatistics(filteredTrips);

  return {
    trips: paginatedTrips,
    totalCount,
    hasMore,
    statistics
  };
}

// Smart search function that uses database when available, fallback to client-side
export async function searchTrips(
  allTrips: Trip[],
  vehicles: Vehicle[],
  drivers: Driver[],
  warehouses: Warehouse[],
  filters: TripFilters,
  pagination: PaginationOptions = { page: 1, limit: 20 },
  userId?: string
): Promise<TripSearchResult> {
  // Try database search first, but gracefully fallback on any error
  try {
    return await searchTripsDatabase(filters, pagination, userId);
  } catch (error) {
    console.warn('Database search unavailable, using client-side search:', error);
    
    // Show user-friendly message for network errors
    if (error instanceof Error && error.message.includes('NETWORK_ERROR')) {
      console.error('CORS Configuration Required:', `
Please configure CORS in your Supabase project:
1. Go to https://supabase.com/dashboard
2. Select your project  
3. Navigate to Settings → API → CORS
4. Add these URLs to allowed origins:
   - http://localhost:5000
   - https://localhost:5000
   - http://localhost:5173
   - https://localhost:5173
5. Save and wait 1-2 minutes for changes to take effect

Falling back to client-side search for now...`);
    }
    
    // Always fallback to client-side search regardless of error type
    return searchTripsClientSide(allTrips, vehicles, drivers, warehouses, filters, pagination);
  }
}

// Calculate trip statistics
function calculateTripStatistics(trips: Trip[]): TripStatistics {
  const totalTrips = trips.length;
  let totalDistance = 0;
  let totalFuelCost = 0;
  let totalExpenses = 0;
  let totalFuelQuantity = 0;
  let tripsWithDistance = 0;
  let tripsWithFuel = 0;

  trips.forEach(trip => {
    if (trip.total_distance) {
      totalDistance += trip.total_distance;
      tripsWithDistance++;
    }
    
    if (trip.total_fuel_cost) {
      totalFuelCost += trip.total_fuel_cost;
    }
    
    if (trip.total_expenses) {
      totalExpenses += trip.total_expenses;
    }
    
    if (trip.fuel_quantity) {
      totalFuelQuantity += trip.fuel_quantity;
      tripsWithFuel++;
    }
  });

  // Calculate average mileage (km per liter)
  const avgMileage = tripsWithFuel > 0 ? totalDistance / totalFuelQuantity : 0;

  return {
    totalTrips,
    totalDistance,
    totalFuelCost,
    totalExpenses,
    avgMileage
  };
}

// Debounced search hook for React components
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}