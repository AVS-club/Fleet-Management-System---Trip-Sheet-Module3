import { getCurrentUserId, withOwner, getUserActiveOrganization } from './supaHelpers';
import { loadGoogleMaps } from './googleMapsLoader';
import { handleSupabaseError } from './errors';
import { supabase, isNetworkError } from './supabaseClient';
import config from './env';
import { getVehicle, deleteVehicle } from './api';
import { getTrips } from './api/trips';
import { MaintenanceVendor, DEMO_VENDORS } from '@/types/maintenance';
import { createLogger } from './logger';

const logger = createLogger('storage');
export * from './api';
export { getTrips, getCurrentUserId };

async function getUserData() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Handle network errors gracefully
      if (isNetworkError(error)) {
        if (config.isDev) logger.warn('Network error getting user data, returning null user');
        return { user: null, error: null };
      }
      handleSupabaseError('get user data', error);
      throw error;
    }
    
    return { user, error: null };
  } catch (error) {
    // Handle network errors gracefully
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn('Network error getting user data, returning null user');
      return { user: null, error: null };
    }
    handleSupabaseError('get user data', error);
    throw error;
  }
}
// Helper function to convert base64 data URL to File object
export const base64ToFile = (dataUrl: string, filename: string = 'photo.jpg'): File | null => {
  try {
    // Check if it's a valid data URL
    if (!dataUrl.startsWith('data:')) {
      return null;
    }

    // Extract the base64 data and mime type
    const arr = dataUrl.split(',');
    if (arr.length !== 2) {
      return null;
    }

    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
      return null;
    }

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    logger.error('Error converting base64 to file:', error);
    return null;
  }
};

// Helper function to get public URL from storage path
export const getDriverPhotoPublicUrl = (filePath: string): string | null => {
  try {
    if (!filePath) return null;

    // If it's already a data URL or full URL, return it
    if (filePath.startsWith('data:') || filePath.startsWith('http')) {
      return filePath;
    }

    const { data } = supabase.storage
      .from('driver-photos')
      .getPublicUrl(filePath);

    return data?.publicUrl || null;
  } catch (error) {
    logger.error('Error getting public URL:', error);
    return null;
  }
};

// Photo upload function for drivers
export const uploadDriverPhoto = async (file: File, driverId: string): Promise<string | undefined> => {
  if (!file || !file.name) { // ⚠️ Confirm field refactor here
    if (config.isDev) logger.warn('No photo uploaded — skipping uploadDriverPhoto.'); // ⚠️ Confirm field refactor here
    return undefined;
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `drivers/${driverId}.${fileExt}`;

  try {
    const { error } = await supabase.storage // ⚠️ Confirm field refactor here
      .from('driver-photos') // ⚠️ Confirm field refactor here
      .upload(filePath, file, { upsert: true });

    if (error) {
      handleSupabaseError('upload driver photo', error);
      return undefined;
    }

    return filePath;
  } catch (uploadError) {
    handleSupabaseError('upload driver photo', uploadError);
    throw uploadError;
  }
};

// Warehouse operations
export const getWarehouses = async (): Promise<Warehouse[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) logger.warn('Network error fetching user for warehouses, returning empty array');
        return [];
      }
      handleSupabaseError('get user for warehouses', userError);
      return [];
    }
    
    if (!user) {
      logger.error('No user authenticated');
      return [];
    }

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      logger.warn('No organization selected for user');
      return [];
    }

    const { data, error } = await supabase // ⚠️ Confirm field refactor here
      .from('warehouses') // ⚠️ Confirm field refactor here
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      handleSupabaseError('fetch warehouses', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn('Network error fetching user for warehouses, returning empty array');
      return [];
    }
    handleSupabaseError('get user for warehouses', error);
    return [];
  }
};

export const getWarehouse = async (id: string): Promise<Warehouse | null> => {
  const { data, error } = await supabase // ⚠️ Confirm field refactor here
    .from('warehouses') // ⚠️ Confirm field refactor here
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    handleSupabaseError('fetch warehouse', error);
    return null;
  }

  return data;
};

// Destination operations
export const getDestinations = async (): Promise<Destination[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) logger.warn('Network error fetching user for destinations, returning empty array');
        return [];
      }
      handleSupabaseError('get user for destinations', userError);
      return [];
    }
    
    if (!user) {
      logger.error('No user authenticated');
      return [];
    }

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      logger.warn('No organization selected for user');
      return [];
    }

    const { data, error } = await supabase // ⚠️ Confirm field refactor here
      .from('destinations') // ⚠️ Confirm field refactor here
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('name');

    if (error) {
      handleSupabaseError('fetch destinations', error);
      return [];
    }

    return data || [];
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn('Network error fetching user for destinations, returning empty array');
      return [];
    }
    handleSupabaseError('get user for destinations', error);
    return [];
  }
};

export const getDestination = async (id: string, ignoreOwnership: boolean = false): Promise<Destination | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) logger.warn('Network error fetching user for destination, returning null');
        return null;
      }
      handleSupabaseError('get user for destination', userError);
      return null;
    }
    
    if (!user && !ignoreOwnership) {
      logger.error('No user authenticated');
      return null;
    }

    // Validate that id is a proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      logger.error('Invalid UUID format for destination id:', id);
      return null;
    }

    let query = supabase
      .from('destinations')
      .select('*')
      .eq('id', id);

    if (!ignoreOwnership && user) {
      const organizationId = await getUserActiveOrganization(user.id);
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      handleSupabaseError('fetch destination', error);
      return null;
    }

    return data;
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn('Network error fetching destination, returning null');
      return null;
    }
    handleSupabaseError('fetch destination', error);
    return null;
  }
};

export const getDestinationByAnyId = async (id: string, ignoreOwnership: boolean = false): Promise<Destination | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) logger.warn('Network error fetching user for destination by any id, returning null');
        return null;
      }
      handleSupabaseError('get user for destination by any id', userError);
      return null;
    }
    
    if (!user && !ignoreOwnership) {
      logger.error('No user authenticated');
      return null;
    }

    if (typeof id !== 'string' || id.trim().length === 0) {
      if (config.isDev) logger.warn('Invalid destination identifier received:', id);
      return null;
    }

    const identifier = id.trim();

    // First try to get by UUID (standard database ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(identifier)) {
      // It's a UUID, use the standard getDestination function
      return await getDestination(identifier, ignoreOwnership);
    }
    
    // If not a UUID, try to find by place_id (Google Places ID)
    let query = supabase
      .from('destinations')
      .select('*')
      .eq('place_id', identifier);

    if (!ignoreOwnership && user) {
      const organizationId = await getUserActiveOrganization(user.id);
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      handleSupabaseError('fetch destination by place_id', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn('Network error fetching destination by any id, returning null');
      return null;
    }
    handleSupabaseError('fetch destination by any id', error);
    return null;
  }
};

export const createDestination = async (destinationData: Omit<Destination, 'id'>): Promise<Destination | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected. Please select an organization.');
    }

    // Note: destinations table uses 'added_by' instead of 'created_by'
    const payload = {
      ...destinationData,
      added_by: userId,
      organization_id: organizationId
    };

    const { data, error } = await supabase // ⚠️ Confirm field refactor here
      .from('destinations')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('create destination', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('create destination', error);
    throw error;
  }
};

export const hardDeleteDestination = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('destinations') // ⚠️ Confirm field refactor here
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete destination', error);
    return false;
  }

  return true;
};

// Find or create destination by Google Place ID
export const findOrCreateDestinationByPlaceId = async (
  placeId: string,
  destinationData: Omit<Destination, 'id'>,
  placeName?: string
): Promise<string | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const organizationId = await getUserActiveOrganization(userId);
    if (!organizationId) {
      throw new Error('No organization selected. Please select an organization.');
    }

    // First, try to find existing destination by place_id
    const { data: existingDestinations, error: searchError } = await supabase
      .from('destinations')
      .select('id')
      .eq('place_id', placeId)
      .eq('organization_id', organizationId)
      .limit(1); // Use limit(1) instead of maybeSingle() for better duplicate handling

    if (searchError) {
      handleSupabaseError('search destination by place_id', searchError);
      return null;
    }

    // If destination exists, return its UUID
    if (existingDestinations && existingDestinations.length > 0) {
      return existingDestinations[0].id;
    }

    // If destination doesn't exist, create a new one
    // Note: destinations table uses 'added_by' instead of 'created_by'
    const payload = {
      ...destinationData,
      place_name: placeName || destinationData.name,
      added_by: userId,
      organization_id: organizationId
    };

    const { data: newDestination, error: createError } = await supabase
      .from('destinations')
      .insert(payload)
      .select('id')
      .single();

    if (createError) {
      handleSupabaseError('create destination', createError);
      return null;
    }

    return newDestination.id;
  } catch (error) {
    handleSupabaseError('find or create destination by place_id', error);
    return null;
  }
};
// Vehicle stats

interface VehicleStats {
  totalTrips: number;
  totalDistance: number;
  averageKmpl?: number;
  totalCost?: number;
  costPerKm?: number;
  monthlyAverage?: number;
  tripAverage?: number;
}

export const getAllVehicleStats = async (
  trips?: Trip[]
): Promise<Record<string, VehicleStats>> => {
  try {
    let tripData = trips;

    if (!tripData) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        if (isNetworkError(userError)) {
          if (config.isDev) logger.warn(
            'Network error fetching user for vehicle stats, returning empty object'
          );
          return {};
        }
        handleSupabaseError('get user for vehicle stats', userError);
        return {};
      }

      if (!user) {
        logger.error('No user authenticated');
        return {};
      }

      const organizationId = await getUserActiveOrganization(user.id);
      if (!organizationId) {
        return {};
      }

      const { data, error } = await supabase
        .from('trips')
        .select('vehicle_id,start_km,end_km,calculated_kmpl')
        .eq('organization_id', organizationId);

      if (error) {
        handleSupabaseError('fetch vehicle trips', error);
        return {};
      }

      tripData = data || [];
    }

    const stats: Record<
      string,
      { totalTrips: number; totalDistance: number; kmplSum: number; kmplCount: number }
    > = {};

    tripData.forEach((trip) => {
      if (!trip.vehicle_id) return;
      if (!stats[trip.vehicle_id]) {
        stats[trip.vehicle_id] = {
          totalTrips: 0,
          totalDistance: 0,
          kmplSum: 0,
          kmplCount: 0,
        };
      }

      const entry = stats[trip.vehicle_id];
      entry.totalTrips += 1;
      entry.totalDistance += (trip.end_km ?? 0) - (trip.start_km ?? 0);
      if (trip.calculated_kmpl) {
        entry.kmplSum += trip.calculated_kmpl;
        entry.kmplCount += 1;
      }
    });

    const result: Record<string, VehicleStats> = {};
    for (const [id, s] of Object.entries(stats)) {
      result[id] = {
        totalTrips: s.totalTrips,
        totalDistance: s.totalDistance,
        averageKmpl: s.kmplCount > 0 ? s.kmplSum / s.kmplCount : undefined,
      };
    }

    return result;
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn(
        'Network error calculating vehicle stats, returning empty object'
      );
      return {};
    }
    handleSupabaseError('calculate all vehicle stats', error);
    return {};
  }
};

export const getVehicleStats = async (vehicleId: string): Promise<any> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) logger.warn('Network error fetching user for vehicle stats, returning defaults');
        return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
      }
      handleSupabaseError('get user for vehicle stats', userError);
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }
    
    if (!user) {
      logger.error('No user authenticated');
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }

    // Get trips for this vehicle with cost data
    const { data: trips, error } = await supabase
      .from('trips')
      .select(`
        start_km, 
        end_km, 
        calculated_kmpl,
        total_fuel_cost,
        total_road_expenses,
        unloading_expense,
        driver_expense,
        road_rto_expense,
        breakdown_expense,
        miscellaneous_expense,
        trip_start_date
      `)
      .eq('organization_id', organizationId)
      .eq('vehicle_id', vehicleId)
      .is('deleted_at', null); // Exclude soft-deleted trips

    if (error) {
      handleSupabaseError('fetch vehicle trips', error);
      return { totalTrips: 0, totalDistance: 0, averageKmpl: undefined };
    }

    if (!trips || trips.length === 0) {
      return { 
        totalTrips: 0, 
        totalDistance: 0, 
        averageKmpl: undefined,
        totalCost: 0,
        costPerKm: 0,
        monthlyAverage: 0,
        tripAverage: 0
      };
    }

    // Calculate basic stats
    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum: number, trip: any) => sum + (trip.end_km - trip.start_km), 0);
    
    // Calculate average KMPL from trips with calculated_kmpl
    const tripsWithKmpl = trips.filter((trip: any) => trip.calculated_kmpl);
    const averageKmpl = tripsWithKmpl.length > 0
      ? tripsWithKmpl.reduce((sum: number, trip: any) => sum + trip.calculated_kmpl, 0) / tripsWithKmpl.length
      : undefined;

    // Calculate cost analytics
    let totalCost = 0;
    const monthlyCosts: { [key: string]: number } = {};

    trips.forEach((trip: any) => {
      // Calculate total cost for this trip
      const tripCost = 
        (trip.total_fuel_cost || 0) +
        (trip.total_road_expenses || 0) +
        (trip.unloading_expense || 0) +
        (trip.driver_expense || 0) +
        (trip.road_rto_expense || 0) +
        (trip.breakdown_expense || 0) +
        (trip.miscellaneous_expense || 0);

      totalCost += tripCost;

      // Track monthly costs for monthly average calculation
      if (trip.trip_start_date) {
        const tripDate = new Date(trip.trip_start_date);
        const monthKey = `${tripDate.getFullYear()}-${tripDate.getMonth()}`;
        monthlyCosts[monthKey] = (monthlyCosts[monthKey] || 0) + tripCost;
      }
    });

    // Calculate derived metrics
    const costPerKm = totalDistance > 0 ? totalCost / totalDistance : 0;
    const tripAverage = totalTrips > 0 ? totalCost / totalTrips : 0;
    
    // Calculate monthly average (average of all months with data)
    const monthlyValues = Object.values(monthlyCosts);
    const monthlyAverage = monthlyValues.length > 0 
      ? monthlyValues.reduce((sum, cost) => sum + cost, 0) / monthlyValues.length 
      : 0;

    // Log cost analytics for debugging
    if (config.isDev) {
      logger.debug('💰 Vehicle Cost Analytics:', {
        vehicleId,
        totalTrips,
        totalDistance,
        totalCost,
        costPerKm,
        monthlyAverage,
        tripAverage,
        monthlyCosts
      });
    }

    return {
      totalTrips,
      totalDistance,
      averageKmpl,
      totalCost,
      costPerKm,
      monthlyAverage,
      tripAverage
    };
  } catch (error) {
    if (isNetworkError(error)) {
      if (config.isDev) logger.warn('Network error calculating vehicle stats, returning defaults');
      return { 
        totalTrips: 0, 
        totalDistance: 0, 
        averageKmpl: undefined,
        totalCost: 0,
        costPerKm: 0,
        monthlyAverage: 0,
        tripAverage: 0
      };
    }
    handleSupabaseError('calculate vehicle stats', error);
    return { 
      totalTrips: 0, 
      totalDistance: 0, 
      averageKmpl: undefined,
      totalCost: 0,
      costPerKm: 0,
      monthlyAverage: 0,
      tripAverage: 0
    };
  }
};

// Route analysis
export const analyzeRoute = async (warehouseId: string, destinationIds: string[]): Promise<RouteAnalysis | null> => {
  try {
    // Get warehouse
    const warehouse = await getWarehouse(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Get destinations
    const destinations = await Promise.all(
      destinationIds.map(id => getDestinationByAnyId(id, true))
    );

    const validDestinations = destinations.filter((d): d is Destination => d !== null);
    
    if (validDestinations.length === 0) {
      throw new Error('No valid destinations found');
    }

    // Check for destinations with invalid coordinates
    const destinationsWithInvalidCoords = validDestinations.filter(dest => 
      dest.latitude === null || dest.longitude === null || 
      dest.latitude === 0 || dest.longitude === 0
    );
    
    if (destinationsWithInvalidCoords.length > 0) {
      throw new Error(`Cannot calculate route: ${destinationsWithInvalidCoords.length} destination(s) have invalid coordinates. Please update coordinates manually.`);
    }


    // Create waypoints for map
    const waypoints = [
      { lat: warehouse.latitude || 0, lng: warehouse.longitude || 0 },
      ...validDestinations.map(dest => ({ lat: dest.latitude!, lng: dest.longitude! }))
    ];

    // Load Google Maps and get live distance/duration using Directions API
    await loadGoogleMaps();
    
    const directionsService = new google.maps.DirectionsService();
    
    const origin = new google.maps.LatLng(warehouse.latitude || 0, warehouse.longitude || 0);
    const destination = new google.maps.LatLng(
      validDestinations[validDestinations.length - 1].latitude,
      validDestinations[validDestinations.length - 1].longitude
    );
    
    // Convert intermediate destinations to waypoints
    const waypointsForDirections = validDestinations.slice(0, -1).map(dest => ({
      location: new google.maps.LatLng(dest.latitude, dest.longitude),
      stopover: true
    }));

    const directionsRequest = {
      origin,
      destination,
      waypoints: waypointsForDirections,
      optimizeWaypoints: false,
      travelMode: google.maps.TravelMode.DRIVING,
      region: 'IN',
      // Request toll data if available
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      },
      avoidHighways: false,
      avoidTolls: false
    };

    // Use Promise wrapper for Google Directions API
    const directionsResult = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(directionsRequest, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });

    // Extract total distance, duration and toll data from Google Directions response
    let totalLiveDistanceMeters = 0;
    let totalLiveDurationSeconds = 0;
    let estimatedTollCost = 0;

    if (directionsResult.routes[0]?.legs) {
      directionsResult.routes[0].legs.forEach(leg => {
        totalLiveDistanceMeters += leg.distance?.value || 0;
        totalLiveDurationSeconds += leg.duration?.value || 0;
      });
    }

    // Calculate estimated toll based on distance (Indian toll rates)
    // Average toll rate in India: ₹1.5-2 per km for cars/small vehicles
    // For trucks: ₹3-5 per km depending on axles
    // Using conservative estimate of ₹2 per km for light commercial vehicles
    const tollRatePerKm = 2;
    estimatedTollCost = Math.round((totalLiveDistanceMeters / 1000) * tollRatePerKm);

    // Convert to appropriate units
    const totalLiveDistanceKm = Math.round(totalLiveDistanceMeters / 1000 * 10) / 10; // Round to 1 decimal
    const totalLiveDurationMinutes = Math.round(totalLiveDurationSeconds / 60);
    const hours = Math.floor(totalLiveDurationMinutes / 60);
    const minutes = totalLiveDurationMinutes % 60;
    const estimatedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      total_distance: totalLiveDistanceKm,
      standard_distance: totalLiveDistanceKm,
      deviation: 0, // Will be calculated when actual distance is known
      estimated_toll: estimatedTollCost,
      estimated_time: estimatedTime,
      waypoints
    };
  } catch (error) {
    logger.error('Error in analyzeRoute:', error);
    handleSupabaseError('analyze route', error);
    
    // Return fallback with waypoints for map but no distance/time data
    try {
      const warehouse = await getWarehouse(warehouseId);
      const destinations = await Promise.all(destinationIds.map(id => getDestination(id)));
      const validDestinations = destinations.filter((d): d is Destination => d !== null);
      
      if (warehouse && validDestinations.length > 0) {
        return {
          total_distance: 0,
          standard_distance: 0,
          deviation: 0,
          estimated_time: '—',
          waypoints: [
            { lat: warehouse.latitude || 0, lng: warehouse.longitude || 0 },
            ...validDestinations.map(dest => ({ lat: dest.latitude, lng: dest.longitude }))
          ]
        };
      }
    } catch (fallbackError) {
      logger.error('Error in analyzeRoute fallback:', fallbackError);
    }
    
    return null;
  }
};

// Get latest odometer reading
export const getLatestOdometer = async (vehicleId: string): Promise<{ value: number; fromTrip: boolean }> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      if (isNetworkError(userError)) {
        if (config.isDev) logger.warn('Network error fetching user for odometer, returning default');
        return { value: 0, fromTrip: false };
      }
      handleSupabaseError('get user for odometer', userError);
      return { value: 0, fromTrip: false };
    }
    
    if (!user) {
      logger.error('No user authenticated');
      return { value: 0, fromTrip: false };
    }

    const organizationId = await getUserActiveOrganization(user.id);
    if (!organizationId) {
      return { value: 0, fromTrip: false };
    }

    // First try to get the latest completed trip using end_km and timestamps
    // ✅ FIXED: Use organization-based query consistent with validation
    // Get all trips for this vehicle from users in the same organization
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select('user_id')
      .eq('organization_id', organizationId);

    if (orgUsersError || !orgUsers || orgUsers.length === 0) {
      return { value: 0, fromTrip: false };
    }

    const userIds = orgUsers.map(ou => ou.user_id);

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('end_km, created_at, trip_end_date, created_by')
      .eq('vehicle_id', vehicleId)
      .in('created_by', userIds)
      .not('end_km', 'is', null)
      .order('trip_end_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(1);

    if (!tripsError && trips && trips.length > 0 && trips[0].end_km) {
      return { value: trips[0].end_km, fromTrip: true };
    }

    // Fallback to the highest recorded odometer in trips if ordering fails
    // ✅ FIXED: Use organization-based query consistent with validation
    const { data: maxOdometerTrip, error: maxTripError } = await supabase
      .from('trips')
      .select('end_km')
      .eq('vehicle_id', vehicleId)
      .in('created_by', userIds)
      .not('end_km', 'is', null)
      .order('end_km', { ascending: false, nullsFirst: false })
      .limit(1);

    if (!maxTripError && maxOdometerTrip && maxOdometerTrip.length > 0 && maxOdometerTrip[0].end_km) {
      return { value: maxOdometerTrip[0].end_km, fromTrip: true };
    }

    // Also check maintenance tasks for latest odometer reading
    const { data: maintenanceTasks, error: maintenanceError } = await supabase
      .from('maintenance_tasks')
      .select('odometer_reading, created_at')
      .eq('vehicle_id', vehicleId)
      .not('odometer_reading', 'is', null)
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(1);

    if (!maintenanceError && maintenanceTasks && maintenanceTasks.length > 0 && maintenanceTasks[0].odometer_reading) {
      return { value: maintenanceTasks[0].odometer_reading, fromTrip: false };
    }

    // Fallback to vehicle's current_odometer
    const vehicle = await getVehicle(vehicleId);
    return { 
      value: vehicle?.current_odometer || 0, 
      fromTrip: false 
    };
  } catch (error) {
    handleSupabaseError('get latest odometer', error);
    return { value: 0, fromTrip: false };
  }
};

// Export alias for compatibility
export const hardDeleteVehicle = deleteVehicle;

// Get vendors for maintenance services
export const getVendors = async (): Promise<MaintenanceVendor[]> => {
  try {
    // First, try to fetch from admin_vendors table
    const { data, error } = await supabase
      .from('admin_vendors')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      logger.debug('admin_vendors table not found, trying other tables...');
      
      // Try other possible table names
      const possibleTables = ['vendors', 'shops', 'merchants', 'garages'];
      
      for (const tableName of possibleTables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .order('name', { ascending: true });
            
          if (!tableError && tableData && tableData.length > 0) {
            logger.debug(`Found vendors in ${tableName} table`);
            return tableData.map(vendor => ({
              id: vendor.id,
              name: vendor.name || vendor.shop_name || vendor.merchant_name,
              contact: vendor.contact || vendor.phone || '',
              address: vendor.address || '',
              active: vendor.active !== false, // Default to true if not specified
            }));
          }
        } catch (tableErr) {
          logger.debug(`Table ${tableName} not found`);
        }
      }
      
      logger.debug('No vendor tables found, using demo data');
      return DEMO_VENDORS;
    }

    if (!data || data.length === 0) {
      logger.debug('No vendors found in admin_vendors, using demo data');
      return DEMO_VENDORS;
    }

    // Transform the data to match MaintenanceVendor interface
    return data.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      contact: vendor.contact || '',
      address: vendor.address || '',
      active: vendor.active,
    }));
  } catch (error) {
    logger.error('Error fetching vendors:', error);
    return DEMO_VENDORS; // Fallback to demo data
  }
};