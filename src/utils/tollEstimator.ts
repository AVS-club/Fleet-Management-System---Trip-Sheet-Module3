import { supabase } from './supabaseClient';
import { Warehouse, Destination, Vehicle } from '../types';

interface TollEstimateParams {
  origin: {
    lat: number;
    lng: number;
  };
  destinations: Array<{
    lat: number;
    lng: number;
  }>;
  vehicleType: string;
}

interface TollEstimateResult {
  totalDistance: number;
  estimatedTollCost: number;
  route?: {
    polyline: string;
    legs: Array<{
      distance: number;
      duration: number;
      start_address: string;
      end_address: string;
    }>;
  };
}

/**
 * Estimates the toll cost for a route between a warehouse and destinations
 * @param warehouseId The ID of the origin warehouse
 * @param destinationIds Array of destination IDs in order of the route
 * @param vehicleId The ID of the vehicle being used
 * @returns Promise resolving to the estimated toll cost and total distance
 */
export const estimateTollCost = async (
  warehouseId: string,
  destinationIds: string[],
  vehicleId: string
): Promise<TollEstimateResult | null> => {
  try {
    // Fetch warehouse details
    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single();
    
    if (warehouseError || !warehouse) {
      console.error('Error fetching warehouse:', warehouseError);
      return null;
    }
    
    // Fetch destination details
    const { data: destinations, error: destinationsError } = await supabase
      .from('destinations')
      .select('*')
      .in('id', destinationIds);
    
    if (destinationsError || !destinations || destinations.length === 0) {
      console.error('Error fetching destinations:', destinationsError);
      return null;
    }
    
    // Fetch vehicle details
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();
    
    if (vehicleError || !vehicle) {
      console.error('Error fetching vehicle:', vehicleError);
      return null;
    }
    
    // Ensure warehouse and destinations have valid coordinates
    if (!warehouse.latitude || !warehouse.longitude) {
      console.error('Warehouse missing coordinates');
      return null;
    }
    
    // Order destinations according to the provided destinationIds
    const orderedDestinations = destinationIds.map(id => 
      destinations.find(dest => dest.id === id)
    ).filter(Boolean) as Destination[];
    
    // Ensure all destinations have valid coordinates
    const validDestinations = orderedDestinations.filter(
      dest => dest.latitude && dest.longitude
    );
    
    if (validDestinations.length === 0) {
      console.error('No valid destination coordinates');
      return null;
    }
    
    // Prepare parameters for the toll estimation API
    const params: TollEstimateParams = {
      origin: {
        lat: warehouse.latitude,
        lng: warehouse.longitude
      },
      destinations: validDestinations.map(dest => ({
        lat: dest.latitude,
        lng: dest.longitude
      })),
      vehicleType: vehicle.type
    };
    
    // Call the Supabase Edge Function to estimate tolls
    const { data, error } = await supabase.functions.invoke('fetch-route-tolls', {
      body: JSON.stringify(params)
    });
    
    if (error) {
      console.error('Error calling toll estimation function:', error);
      return null;
    }
    
    if (!data || !data.success) {
      console.error('Toll estimation failed:', data?.error || 'Unknown error');
      return null;
    }
    
    return data.data as TollEstimateResult;
    
  } catch (error) {
    console.error('Error estimating toll cost:', error);
    return null;
  }
};

