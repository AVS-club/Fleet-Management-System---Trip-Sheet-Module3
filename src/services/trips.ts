import { supabase } from '../utils/supabaseClient';
import { handleSupabaseError } from '../utils/errors';
import { Trip, RouteAnalysis, Destination } from '../types';
import { getCurrentUserId, withOwner } from '../utils/supaHelpers';
import { loadGoogleMaps } from '../utils/googleMapsLoader';
import { fetchWithUser } from './common';
import { getWarehouse, getDestination } from '../utils/storage';

// Trip CRUD operations
export const getTrips = async (): Promise<Trip[]> => {
  return fetchWithUser<Trip>(
    'trips',
    'id, vehicle_id, trip_start_date, trip_end_date, start_km, end_km, calculated_kmpl, driver_id, refueling_done, fuel_quantity, fuel_rate_per_liter, total_fuel_cost, warehouse_id',
    'trip_start_date'
  );
};

export const getTrip = async (id: string): Promise<Trip | null> => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    handleSupabaseError('fetch trip', error);
    return null;
  }

  return data;
};

export const createTrip = async (tripData: Omit<Trip, 'id'>): Promise<Trip | null> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const sanitizedTripData = { ...tripData } as any;
    if (sanitizedTripData.fuel_station_id === '') {
      sanitizedTripData.fuel_station_id = null;
    }
    if (sanitizedTripData.station === '') {
      sanitizedTripData.station = null;
    }
    if (sanitizedTripData.vehicle_id === '') {
      sanitizedTripData.vehicle_id = null;
    }
    if (sanitizedTripData.driver_id === '') {
      sanitizedTripData.driver_id = null;
    }
    if (sanitizedTripData.warehouse_id === '') {
      sanitizedTripData.warehouse_id = null;
    }

    const payload = withOwner(
      {
        ...sanitizedTripData,
        station: sanitizedTripData.station ?? null,
        fuel_station_id: sanitizedTripData.fuel_station_id ?? null,
      },
      userId
    );

    const { data, error } = await supabase
      .from('trips')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('create trip', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('create trip', error);
    throw error;
  }
};

export const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip | null> => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      handleSupabaseError('update trip', error);
      throw error;
    }

    return data;
  } catch (error) {
    handleSupabaseError('update trip', error);
    throw error;
  }
};

export const deleteTrip = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) {
    handleSupabaseError('delete trip', error);
    return false;
  }

  return true;
};

// Route analysis using Google Maps
export const analyzeRoute = async (
  warehouseId: string,
  destinationIds: string[]
): Promise<RouteAnalysis | null> => {
  try {
    const warehouse = await getWarehouse(warehouseId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    const destinations = await Promise.all(
      destinationIds.map(id => getDestination(id))
    );

    const validDestinations = destinations.filter((d): d is Destination => d !== null);
    if (validDestinations.length === 0) {
      throw new Error('No valid destinations found');
    }

    const waypoints = [
      { lat: warehouse.latitude || 0, lng: warehouse.longitude || 0 },
      ...validDestinations.map(dest => ({ lat: dest.latitude, lng: dest.longitude }))
    ];

    await loadGoogleMaps();

    const directionsService = new google.maps.DirectionsService();

    const origin = new google.maps.LatLng(warehouse.latitude || 0, warehouse.longitude || 0);
    const destination = new google.maps.LatLng(
      validDestinations[validDestinations.length - 1].latitude,
      validDestinations[validDestinations.length - 1].longitude
    );

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
      region: 'IN'
    } as const;

    const directionsResult = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      directionsService.route(directionsRequest, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });

    let totalLiveDistanceMeters = 0;
    let totalLiveDurationSeconds = 0;

    if (directionsResult.routes[0]?.legs) {
      directionsResult.routes[0].legs.forEach(leg => {
        totalLiveDistanceMeters += leg.distance?.value || 0;
        totalLiveDurationSeconds += leg.duration?.value || 0;
      });
    }

    const totalLiveDistanceKm = Math.round((totalLiveDistanceMeters / 1000) * 10) / 10;
    const totalLiveDurationMinutes = Math.round(totalLiveDurationSeconds / 60);
    const hours = Math.floor(totalLiveDurationMinutes / 60);
    const minutes = totalLiveDurationMinutes % 60;
    const estimatedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
      total_distance: totalLiveDistanceKm,
      standard_distance: totalLiveDistanceKm,
      deviation: 0,
      estimated_time: estimatedTime,
      waypoints
    };
  } catch (error) {
    console.error('Error in analyzeRoute:', error);
    handleSupabaseError('analyze route', error);

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
      console.error('Error in analyzeRoute fallback:', fallbackError);
    }

    return null;
  }
};
